import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

type AccountSnapshotInput = {
  id: string;
  accountName: string;
  salesRep?: string;
  score: number;
  category: string;
  utilizationPct: number;
  contractRenewalDays: number;
  riskCountHigh?: number;
  pipelineStage?: string;
  lastContactDate?: string | null;
  inActionPlan?: boolean;
};

type SnapshotEntry = {
  utilizationPct: number;
  score: number;
  category: string;
  contractRenewalDays: number;
  riskCountHigh: number;
};

type Change = {
  accountId: string;
  accountName: string;
  kind: string;
  detail: string;
};

export const generateMorningBriefing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => input as { accounts: AccountSnapshotInput[]; repName?: string; force?: boolean })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const accounts = data.accounts ?? [];

    // Load previous snapshot
    const { data: rep } = await supabase
      .from("reps")
      .select("name, briefing_snapshot, briefing_snapshot_at, last_login_at")
      .eq("id", userId)
      .maybeSingle();

    const prev: Record<string, SnapshotEntry> =
      (rep?.briefing_snapshot as Record<string, SnapshotEntry> | null) ?? {};
    const lastLogin = rep?.last_login_at ? new Date(rep.last_login_at) : null;
    const repName = data.repName || rep?.name || "there";

    const changes: Change[] = [];
    for (const a of accounts) {
      const p = prev[a.id];
      // utilization threshold crossings
      if (p) {
        if (a.utilizationPct >= 90 && p.utilizationPct < 90) {
          changes.push({
            accountId: a.id,
            accountName: a.accountName,
            kind: "utilization_90",
            detail: `storage jumped to ${a.utilizationPct}% — capacity conversation is urgent now`,
          });
        } else if (a.utilizationPct >= 80 && p.utilizationPct < 80) {
          changes.push({
            accountId: a.id,
            accountName: a.accountName,
            kind: "utilization_80",
            detail: `storage crossed 80% (${a.utilizationPct}%) — start the capacity-planning thread`,
          });
        }
        // category upgrade
        if (a.category === "HOT" && p.category === "WARM") {
          changes.push({
            accountId: a.id,
            accountName: a.accountName,
            kind: "warm_to_hot",
            detail: `moved from WARM to HOT (score ${p.score} → ${a.score}) — prioritize outreach`,
          });
        }
        // risk count increase
        const prevRisk = p.riskCountHigh ?? 0;
        const curRisk = a.riskCountHigh ?? 0;
        if (curRisk > prevRisk) {
          changes.push({
            accountId: a.id,
            accountName: a.accountName,
            kind: "new_risks",
            detail: `${curRisk - prevRisk} new high-severity risk${curRisk - prevRisk === 1 ? "" : "s"} opened — review and offer remediation`,
          });
        }
      }
      // renewal within 30 days
      if (a.contractRenewalDays > 0 && a.contractRenewalDays <= 30) {
        const wasOutside = !p || p.contractRenewalDays > 30;
        if (wasOutside) {
          changes.push({
            accountId: a.id,
            accountName: a.accountName,
            kind: "renewal_30",
            detail: `renewal is now ${a.contractRenewalDays} days out — schedule a call today`,
          });
        }
      }
      // stalled action plan
      if (a.inActionPlan && a.lastContactDate) {
        const days = Math.floor((Date.now() - new Date(a.lastContactDate).getTime()) / 86_400_000);
        if (days >= 14) {
          changes.push({
            accountId: a.id,
            accountName: a.accountName,
            kind: "stalled",
            detail: `in your action plan with no activity in ${days} days — re-engage or deprioritize`,
          });
        }
      }
    }

    // Build top-3 fallback
    const top3 = [...accounts].sort((a, b) => b.score - a.score).slice(0, 3);

    let briefingText = "";
    const apiKey = process.env.LOVABLE_API_KEY;

    try {
      if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
      const gateway = createLovableAiGatewayProvider(apiKey);
      const model = gateway("google/gemini-3-flash-preview");

      const promptParts: string[] = [];
      promptParts.push(`You are NetAIChat, writing a short morning briefing for NetApp sales rep ${repName}.`);
      promptParts.push(`Tone: warm, concise, conversational. No headings, no bullets longer than one sentence.`);
      promptParts.push(`Start with: "Good morning, ${repName}." Then a one-line context sentence.`);
      if (changes.length > 0) {
        promptParts.push(`Then list the ${Math.min(changes.length, 5)} most important changes as short bullet lines. Each line: account name — what changed — suggested action.`);
        promptParts.push(`Changes (JSON):\n${JSON.stringify(changes.slice(0, 5), null, 2)}`);
      } else {
        promptParts.push(`There are no significant changes since last login. Say: "Your territory is steady today — here are your top 3 priorities to keep momentum." Then list these 3 top accounts as one-line bullets with their score and why they matter.`);
        promptParts.push(`Top accounts (JSON):\n${JSON.stringify(top3.map((a) => ({ name: a.accountName, score: a.score, category: a.category, utilizationPct: a.utilizationPct, renewalDays: a.contractRenewalDays })), null, 2)}`);
      }
      promptParts.push(`End with exactly one line: "Start with: <account name> — <one-sentence reason>." Pick the single most important account to tackle first.`);
      promptParts.push(`Keep total under 180 words. Use plain text with "•" for bullets.`);

      const { text } = await generateText({
        model,
        prompt: promptParts.join("\n\n"),
      });
      briefingText = text.trim();
    } catch (err) {
      // Fallback: deterministic text
      const lines: string[] = [`Good morning, ${repName}.`];
      if (changes.length > 0) {
        lines.push(`Here's what changed since your last visit:`);
        for (const c of changes.slice(0, 5)) {
          lines.push(`• ${c.accountName} — ${c.detail}.`);
        }
        const first = changes[0];
        lines.push(`Start with: ${first.accountName} — ${first.detail}.`);
      } else {
        lines.push(`Your territory is steady today — here are your top 3 priorities to keep momentum.`);
        for (const a of top3) {
          lines.push(`• ${a.accountName} — score ${a.score}, ${a.category}.`);
        }
        if (top3[0]) lines.push(`Start with: ${top3[0].accountName} — highest score in your book today.`);
      }
      briefingText = lines.join("\n");
    }

    // Update snapshot + last_login_at
    const newSnapshot: Record<string, SnapshotEntry> = {};
    for (const a of accounts) {
      newSnapshot[a.id] = {
        utilizationPct: a.utilizationPct,
        score: a.score,
        category: a.category,
        contractRenewalDays: a.contractRenewalDays,
        riskCountHigh: a.riskCountHigh ?? 0,
      };
    }
    await supabase
      .from("reps")
      .update({
        briefing_snapshot: newSnapshot,
        briefing_snapshot_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
      })
      .eq("id", userId);

    return {
      text: briefingText,
      changeCount: changes.length,
      lastLoginAt: lastLogin?.toISOString() ?? null,
      generatedAt: new Date().toISOString(),
    };
  });
