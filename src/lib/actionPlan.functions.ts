import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const MODEL = "google/gemini-3-flash-preview";

const ActionPlanSchema = z.object({
  executiveSummary: z.string().min(20),
  products: z
    .array(z.object({ name: z.string(), description: z.string() }))
    .min(2)
    .max(4),
  talkingPoints: z.array(z.string()).min(3).max(5),
  timeline: z
    .array(z.object({ week: z.string(), action: z.string() }))
    .min(3)
    .max(5),
  roiLow: z.number().nonnegative(),
  roiHigh: z.number().nonnegative(),
  roiPct: z.string(),
  objections: z
    .array(z.object({ objection: z.string(), response: z.string() }))
    .min(2)
    .max(4),
});

export type GeneratedActionPlan = z.infer<typeof ActionPlanSchema>;

async function sha1Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function inputsHashSource(row: Record<string, unknown>): string {
  const keys = [
    "account_name",
    "industry",
    "region",
    "device_age",
    "storage_utilization",
    "it_budget",
    "renewal_days",
    "cloud_status",
    "netapp_models",
    "ontap_version",
    "cluster_count",
    "storage_architecture",
    "score",
    "priority_badge",
    "status",
  ];
  return keys.map((k) => `${k}=${JSON.stringify(row[k] ?? null)}`).join("|");
}

function buildPrompt(row: Record<string, unknown>): string {
  const renewalDays = Number(row.renewal_days ?? 0);
  const renewalDate = new Date(Date.now() + renewalDays * 86_400_000).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" },
  );
  return [
    `You are a senior NetApp enterprise storage sales strategist. Build an account-specific action plan for the sales rep.`,
    ``,
    `ACCOUNT FACTS:`,
    `- Name: ${row.account_name}`,
    `- Industry: ${row.industry ?? "Unknown"}`,
    `- Region: ${row.region ?? "Unknown"}`,
    `- Priority category: ${row.priority_badge ?? "Unknown"} (composite score ${row.score ?? "n/a"}/100)`,
    `- Pipeline stage: ${row.status ?? "Unknown"}`,
    `- NetApp models in play: ${row.netapp_models ?? "Unknown"}`,
    `- ONTAP version: ${row.ontap_version ?? "Unknown"}`,
    `- Cluster count: ${row.cluster_count ?? "Unknown"}`,
    `- Storage architecture: ${row.storage_architecture ?? "Unknown"}`,
    `- Device age (yrs): ${row.device_age ?? "Unknown"}`,
    `- Storage utilization: ${row.storage_utilization ?? "Unknown"}%`,
    `- IT budget (USD): ${row.it_budget ?? "Unknown"}`,
    `- Cloud status: ${row.cloud_status ?? "Unknown"}`,
    `- Renewal in ${renewalDays} days (~${renewalDate})`,
    ``,
    `Return ONLY a valid JSON object (no markdown, no commentary) matching exactly this shape:`,
    `{`,
    `  "executiveSummary": "2-4 sentences. Specific to this account's numbers and renewal window. No generic fluff.",`,
    `  "products": [ { "name": "NetApp product or service", "description": "One-line reason it fits THIS account" }, ... 2-4 items ],`,
    `  "talkingPoints": [ "3-5 short, concrete talking points that reference this account's actual numbers" ],`,
    `  "timeline": [ { "week": "Week 1", "action": "Concrete action" }, ... 3-5 steps aligned to the renewal window ],`,
    `  "roiLow": <integer USD, ~12% of IT budget>,`,
    `  "roiHigh": <integer USD, ~28% of IT budget>,`,
    `  "roiPct": "Short ROI rationale, e.g. '18-32% TCO reduction over 36 months'",`,
    `  "objections": [ { "objection": "Likely ${row.industry ?? ""} objection in quotes", "response": "Crisp, specific rebuttal" }, ... 2-4 items ]`,
    `}`,
    ``,
    `Constraints:`,
    `- Reference real NetApp portfolio (BlueXP, Cloud Volumes ONTAP, Keystone, Cloud Insights, ONTAP One, SnapMirror, FlexCache, etc.) where relevant.`,
    `- Objections must be plausible for the ${row.industry ?? "this"} industry.`,
    `- Do not invent facts not derivable from the inputs.`,
    `- Output must be parseable JSON with no surrounding text.`,
  ].join("\n");
}

function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  const slice = start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
  return JSON.parse(slice);
}

async function generatePlan(row: Record<string, unknown>): Promise<GeneratedActionPlan> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");
  const gateway = createLovableAiGatewayProvider(apiKey);
  const model = gateway(MODEL);

  const { text } = await generateText({
    model,
    prompt: buildPrompt(row),
  });

  let parsed: unknown;
  try {
    parsed = parseJsonLoose(text);
  } catch {
    throw new Error("AI returned a response that was not valid JSON. Try regenerating.");
  }
  const result = ActionPlanSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`AI output failed validation: ${result.error.issues.map((i) => i.message).join("; ")}`);
  }
  return result.data;
}

const InputSchema = z.object({ accountId: z.string().uuid() });

async function loadAccountForCaller(
  supabase: NonNullable<Awaited<ReturnType<typeof requireSupabaseAuth.client>>> extends never
    ? never
    : Awaited<ReturnType<typeof Promise.resolve>>,
  accountId: string,
): Promise<Record<string, unknown>> {
  // typing helper; runtime uses caller's supabase client
  throw new Error("unused");
}
void loadAccountForCaller;

export const getOrGenerateActionPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: account, error: accErr } = await supabase
      .from("accounts")
      .select("*")
      .eq("id", data.accountId)
      .maybeSingle();
    if (accErr) throw new Error(accErr.message);
    if (!account) throw new Error("Account not found or not accessible.");

    const repEmail = (account as Record<string, unknown>).rep_email as string;
    const hash = await sha1Hex(inputsHashSource(account as Record<string, unknown>));

    const { data: cached } = await supabase
      .from("account_action_plans")
      .select("plan, inputs_hash, model, updated_at")
      .eq("account_id", data.accountId)
      .maybeSingle();

    if (cached && cached.inputs_hash === hash) {
      return {
        plan: cached.plan as GeneratedActionPlan,
        cached: true,
        model: cached.model,
        updatedAt: cached.updated_at,
      };
    }

    const plan = await generatePlan(account as Record<string, unknown>);

    const { error: upErr } = await supabase
      .from("account_action_plans")
      .upsert(
        {
          account_id: data.accountId,
          rep_email: repEmail,
          plan,
          model: MODEL,
          inputs_hash: hash,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "account_id" },
      );
    if (upErr) throw new Error(upErr.message);

    return { plan, cached: false, model: MODEL, updatedAt: new Date().toISOString() };
  });

export const regenerateActionPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: account, error: accErr } = await supabase
      .from("accounts")
      .select("*")
      .eq("id", data.accountId)
      .maybeSingle();
    if (accErr) throw new Error(accErr.message);
    if (!account) throw new Error("Account not found or not accessible.");

    const repEmail = (account as Record<string, unknown>).rep_email as string;
    const hash = await sha1Hex(inputsHashSource(account as Record<string, unknown>));
    const plan = await generatePlan(account as Record<string, unknown>);

    const { error: upErr } = await supabase
      .from("account_action_plans")
      .upsert(
        {
          account_id: data.accountId,
          rep_email: repEmail,
          plan,
          model: MODEL,
          inputs_hash: hash,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "account_id" },
      );
    if (upErr) throw new Error(upErr.message);

    return { plan, cached: false, model: MODEL, updatedAt: new Date().toISOString() };
  });
