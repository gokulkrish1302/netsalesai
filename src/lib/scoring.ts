import type {
  Account,
  Category,
  ScoreBreakdown,
  ScoreReasons,
  ScoredAccount,
  Weights,
} from "./types";

export const DEFAULT_WEIGHTS: Weights = {
  deviceAge: 20,
  utilization: 15,
  budget: 25,
  cloud: 25,
  industry: 10,
  renewal: 5,
};

const DEFAULT_MAX = DEFAULT_WEIGHTS;

function deviceAgeBand(years: number) {
  if (years > 5) return 1;
  if (years >= 3) return 0.75;
  if (years >= 1) return 0.25;
  return 0;
}
function utilizationBand(pct: number) {
  if (pct > 80) return 1;
  if (pct >= 60) return 10 / 15;
  if (pct >= 40) return 5 / 15;
  return 0;
}
function budgetBand(usd: number) {
  if (usd > 500_000) return 1;
  if (usd >= 200_000) return 20 / 25;
  if (usd >= 100_000) return 10 / 25;
  return 5 / 25;
}
function cloudBand(status: Account["cloudStatus"]) {
  if (status === "active_cloud") return 1;
  if (status === "hybrid") return 18 / 25;
  if (status === "licensed_not_deployed") return 10 / 25;
  return 0;
}
function industryBand(industry: Account["industry"]) {
  if (industry === "Tech" || industry === "Finance" || industry === "Healthcare") return 1;
  if (industry === "Retail" || industry === "Manufacturing") return 7 / 10;
  if (industry === "Government") return 5 / 10;
  return 3 / 10;
}
function renewalBand(days: number) {
  if (days <= 30) return 1;
  if (days <= 60) return 4 / 5;
  if (days <= 90) return 3 / 5;
  if (days <= 180) return 1 / 5;
  return 0;
}

export function categorize(score: number): Category {
  if (score >= 75) return "HOT";
  if (score >= 50) return "WARM";
  if (score >= 25) return "COLD";
  return "NOT_READY";
}

export function scoreAccount(
  account: Account,
  weights: Weights = DEFAULT_WEIGHTS,
): {
  total: number;
  category: Category;
  breakdown: ScoreBreakdown;
  reasons: ScoreReasons;
} {
  const breakdown: ScoreBreakdown = {
    deviceAge: Math.round(deviceAgeBand(account.deviceAgeYears) * weights.deviceAge),
    utilization: Math.round(utilizationBand(account.utilizationPct) * weights.utilization),
    budget: Math.round(budgetBand(account.itBudgetUSD) * weights.budget),
    cloud: Math.round(cloudBand(account.cloudStatus) * weights.cloud),
    industry: Math.round(industryBand(account.industry) * weights.industry),
    renewal: Math.round(renewalBand(account.contractRenewalDays) * weights.renewal),
  };
  const total = Math.min(
    100,
    breakdown.deviceAge +
      breakdown.utilization +
      breakdown.budget +
      breakdown.cloud +
      breakdown.industry +
      breakdown.renewal,
  );
  const reasons: ScoreReasons = {
    deviceAge:
      account.deviceAgeYears > 5
        ? `Device is ${account.deviceAgeYears.toFixed(1)} years old — high replacement urgency`
        : account.deviceAgeYears >= 3
          ? `Device is ${account.deviceAgeYears.toFixed(1)} years old — refresh window approaching`
          : `Device is ${account.deviceAgeYears.toFixed(1)} years old — relatively new`,
    utilization:
      account.utilizationPct > 80
        ? `Storage at ${account.utilizationPct}% — capacity strain, expansion needed`
        : account.utilizationPct >= 60
          ? `Storage at ${account.utilizationPct}% — healthy headroom but trending up`
          : `Storage at ${account.utilizationPct}% — under-utilized capacity`,
    budget:
      account.itBudgetUSD > 500_000
        ? `IT budget over $500K — strong purchasing power`
        : account.itBudgetUSD >= 200_000
          ? `IT budget $200K–$500K — solid mid-market spend`
          : account.itBudgetUSD >= 100_000
            ? `IT budget $100K–$200K — modest but workable`
            : `IT budget under $100K — limited deal size`,
    cloud:
      account.cloudStatus === "active_cloud"
        ? `Active cloud workloads — ready to expand NetApp footprint`
        : account.cloudStatus === "hybrid"
          ? `Hybrid environment — natural fit for NetApp BlueXP`
          : account.cloudStatus === "licensed_not_deployed"
            ? `Cloud licensed but not deployed — activation opportunity`
            : `No cloud adoption — greenfield migration play`,
    industry:
      account.industry === "Tech" ||
      account.industry === "Finance" ||
      account.industry === "Healthcare"
        ? `${account.industry} — top-tier vertical for cloud migration`
        : account.industry === "Government"
          ? `${account.industry} — slower cycles, compliance-led`
          : `${account.industry} — steady mid-tier vertical`,
    renewal:
      account.contractRenewalDays <= 30
        ? `Contract renews in ${account.contractRenewalDays} days — critical window`
        : account.contractRenewalDays <= 60
          ? `Contract renews in ${account.contractRenewalDays} days — time-sensitive window`
          : account.contractRenewalDays <= 90
            ? `Contract renews in ${account.contractRenewalDays} days — start engagement now`
            : account.contractRenewalDays <= 180
              ? `Contract renews in ${account.contractRenewalDays} days — early planning phase`
              : `Contract renews in ${account.contractRenewalDays} days — long horizon`,
  };
  return { total, category: categorize(total), breakdown, reasons };
}

export function scoreAll(
  accounts: Account[],
  weights: Weights = DEFAULT_WEIGHTS,
  previousScores?: Record<string, number>,
): ScoredAccount[] {
  return accounts.map((a) => {
    const s = scoreAccount(a, weights);
    const prev = previousScores?.[a.id];
    return {
      ...a,
      score: s.total,
      category: s.category,
      breakdown: s.breakdown,
      reasons: s.reasons,
      delta: prev != null ? s.total - prev : 0,
    };
  });
}

export const CATEGORY_META: Record<
  Category,
  { label: string; color: string; bg: string; border: string }
> = {
  HOT: { label: "HOT", color: "var(--hot)", bg: "var(--hot-bg)", border: "var(--hot)" },
  WARM: { label: "WARM", color: "var(--warm)", bg: "var(--warm-bg)", border: "var(--warm)" },
  COLD: { label: "COLD", color: "var(--cold)", bg: "var(--cold-bg)", border: "var(--cold)" },
  NOT_READY: {
    label: "NOT READY",
    color: "var(--not-ready)",
    bg: "var(--not-ready-bg)",
    border: "var(--not-ready)",
  },
};

export { DEFAULT_MAX };
