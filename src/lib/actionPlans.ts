import type { ScoredAccount, Urgency } from "./types";
import { formatCurrencyShort } from "./format";

// AI-generated action plans live in src/lib/actionPlan.functions.ts and are cached
// per-account in Supabase. This file keeps only deterministic helpers (urgency
// labels, deal-size math, account summary, and note->next-step heuristics) that
// don't need a model call.

export const URGENCY_LABEL: Record<Urgency, string> = {
  this_week: "This Week",
  this_month: "This Month",
  this_quarter: "This Quarter",
};

export function buildAccountSummary(account: ScoredAccount): string {
  const renewalStr = new Date(Date.now() + account.contractRenewalDays * 86_400_000).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" },
  );
  const urgencyHook =
    account.contractRenewalDays <= 90
      ? `renewal closes in ${account.contractRenewalDays} days (${renewalStr})`
      : `renewal on ${renewalStr} gives a clear runway`;
  return `${account.accountName} scores ${account.score}/100 (${account.category}). Storage utilization sits at ${account.utilizationPct}% on a ${account.deviceAgeYears.toFixed(1)}-year-old ${account.deviceModel}, IT budget is ${formatCurrencyShort(account.itBudgetUSD)}, and the ${urgencyHook}. The combination of aging hardware, capacity pressure, and the upcoming contract inflection make this a priority touch.`;
}

export function estimateDealSize(account: ScoredAccount): { low: number; high: number } {
  const base =
    account.itBudgetUSD *
    (account.category === "HOT" ? 0.18 : account.category === "WARM" ? 0.12 : 0.06);
  return { low: Math.round(base * 0.7), high: Math.round(base * 1.4) };
}

export function suggestNextStep(noteText: string, fallback: string): string {
  const t = noteText.toLowerCase();
  if (/voicemail|left.*message|no answer/.test(t))
    return "Try again at a different time of day; send a brief follow-up email referencing the voicemail.";
  if (/meeting (set|scheduled|booked)|calendar/.test(t))
    return "Prep an agenda + tailored demo; share read-ahead materials 24 hours before.";
  if (/proposal|quote|pricing/.test(t))
    return "Follow up in 3 business days; confirm proposal received and offer a walkthrough.";
  if (/budget|cfo|finance|procurement/.test(t))
    return "Loop in your account exec to position Keystone OpEx and align to fiscal cycle.";
  if (/competitor|pure|dell|hpe|aws|azure/.test(t))
    return "Build a side-by-side comparison; emphasize multi-cloud portability and TCO over 36 months.";
  if (/not interested|pass|busy|later/.test(t))
    return "Move to a quarterly nurture cadence; send a relevant case study in 30 days.";
  if (/decision maker|cio|cto|vp|director/.test(t))
    return "Request an exec briefing; bring a customer reference from the same industry.";
  if (/won|signed|closed/.test(t))
    return "Mark status as Won and capture the deciding factor for the team.";
  return fallback;
}
