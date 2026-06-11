import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

type VoiceContextAccount = {
  id: string;
  accountName: string;
  score: number;
  category: string;
  utilizationPct: number;
  contractRenewalDays: number;
  pipelineStage?: string;
  industry?: string;
  region?: string;
  deviceModel?: string;
  deviceAgeYears?: number;
  inActionPlan?: boolean;
};

type Input = {
  transcript: string;
  accounts: VoiceContextAccount[];
  repName?: string;
};

export const askVoiceAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => input as Input)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const transcript = (data.transcript ?? "").trim();
    if (!transcript) throw new Error("Empty transcript");

    const accounts = (data.accounts ?? []).slice(0, 200);
    const summary = accounts
      .map(
        (a) =>
          `- ${a.accountName} | score ${a.score} (${a.category}) | util ${a.utilizationPct}% | renewal in ${a.contractRenewalDays}d | stage ${a.pipelineStage ?? "n/a"} | ${a.deviceModel ?? ""} ${a.deviceAgeYears ?? "?"}y | ${a.region ?? ""}/${a.industry ?? ""}${a.inActionPlan ? " | in action plan" : ""}`,
      )
      .join("\n");

    const system = `You are a NetApp sales assistant. You have access to the rep's account data including scores, storage utilization, renewal dates, and action plans. Answer questions concisely and helpfully based on their account data.

Supported commands:
- "top accounts today" → list the 3-5 highest-scoring accounts with one-line rationale.
- "tell me about [account name]" → summarize that account's key signals.
- "renewal alerts" → list accounts with renewals in the next 60 days, prioritized.
- "add note to [account name]" → acknowledge; the app will capture the note text after this reply.
- "draft email to [account name]" → produce a short, polished outreach email (subject + body).

Keep responses under 80 words unless drafting an email. Speak conversationally — your reply will be read aloud. Don't use markdown formatting or bullet symbols; use natural sentences.

Rep: ${data.repName ?? "the rep"}.
Accounts (${accounts.length}):
${summary || "(no accounts loaded)"}`;

    const gateway = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system,
      prompt: transcript,
    });

    return { reply: text.trim() };
  });
