import { useApp } from "@/state/AppStore";
import { formatCurrencyShort } from "@/lib/format";
import { Users, Flame, TrendingUp, Target, Gauge, Bell, AlertTriangle, Trophy, Clock, Percent } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ScoredAccount } from "@/lib/types";
import type { KpiKey } from "@/state/DashboardsContext";
import { isActivePlan } from "@/state/AppStore";

const ACTIVE_PLAN_STAGES = new Set(["contacted", "meeting_scheduled", "proposal_sent"]);
const STALLED_MS = 14 * 86_400_000;

interface Props {
  accounts?: ScoredAccount[];
  kpis?: KpiKey[];
}

export function StatStrip({ accounts, kpis }: Props = {}) {
  const { scoredAccounts, state } = useApp();
  const data = accounts ?? scoredAccounts;
  const selected: KpiKey[] = kpis && kpis.length ? kpis : ["accounts", "hot", "pipeline", "active_plans"];

  const total = data.length;
  const hot = data.filter((a) => a.category === "HOT").length;
  const pipeline = data.reduce((s, a) => s + a.itBudgetUSD, 0);
  const activePlansByStage = data.filter((a) => {
    const stage = state.pipelineStages[a.id] ?? a.pipelineStage;
    return ACTIVE_PLAN_STAGES.has(stage);
  }).length;
  const avgScore = total ? Math.round(data.reduce((s, a) => s + a.score, 0) / total) : 0;
  const renewals60 = data.filter((a) => a.contractRenewalDays <= 60).length;

  // Action-plan-derived KPIs (scoped to currently visible accounts)
  const visibleIds = new Set(data.map((a) => a.id));
  const plansInScope = Object.values(state.actionPlans).filter((p) => visibleIds.has(p.accountId));
  const activePlans = plansInScope.filter(isActivePlan);
  const now = Date.now();
  const stalled = activePlans.filter((p) => {
    const last = p.activities[0]?.createdAt ?? p.createdAt;
    return now - new Date(last).getTime() >= STALLED_MS;
  }).length;
  const qStart = (() => {
    const d = new Date();
    return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1).getTime();
  })();
  const wonQ = plansInScope.filter(
    (p) => p.status === "won" && p.closedAt && new Date(p.closedAt).getTime() >= qStart,
  ).length;
  const avgDays = activePlans.length
    ? Math.round(
        activePlans.reduce((s, p) => {
          const last = p.activities[0]?.createdAt ?? p.createdAt;
          return s + (now - new Date(last).getTime()) / 86_400_000;
        }, 0) / activePlans.length,
      )
    : 0;
  const coverage = total ? Math.round((activePlans.length / total) * 100) : 0;

  const CATALOG: Record<KpiKey, { label: string; value: string; icon: LucideIcon; tint: string; iconColor: string; live?: boolean }> = {
    accounts: { label: "Accounts", value: String(total), icon: Users, tint: "var(--primary-container)", iconColor: "var(--on-primary-container)" },
    hot: { label: "Hot Leads", value: String(hot), icon: Flame, tint: "var(--hot-bg)", iconColor: "var(--hot)", live: true },
    pipeline: { label: "Pipeline Value", value: formatCurrencyShort(pipeline), icon: TrendingUp, tint: "var(--warm-bg)", iconColor: "var(--warm)" },
    active_plans: { label: "Active Action Plans", value: String(activePlansByStage), icon: Target, tint: "color-mix(in oklab, var(--primary) 14%, transparent)", iconColor: "var(--primary)" },
    avg_score: { label: "Avg Score", value: String(avgScore), icon: Gauge, tint: "var(--primary-container)", iconColor: "var(--on-primary-container)" },
    renewals_60: { label: "Renewals < 60d", value: String(renewals60), icon: Bell, tint: "var(--hot-bg)", iconColor: "var(--hot)" },
    stalled: { label: "Stalled Plans (14d+)", value: String(stalled), icon: AlertTriangle, tint: "var(--warm-bg)", iconColor: "var(--warm)" },
    won_q: { label: "Won This Quarter", value: String(wonQ), icon: Trophy, tint: "color-mix(in oklab, var(--success) 14%, transparent)", iconColor: "var(--success)" },
    avg_days: { label: "Avg Days Since Touch", value: String(avgDays), icon: Clock, tint: "var(--primary-container)", iconColor: "var(--on-primary-container)" },
    coverage: { label: "Plan Coverage", value: `${coverage}%`, icon: Percent, tint: "color-mix(in oklab, var(--primary) 14%, transparent)", iconColor: "var(--primary)" },
  };

  const stats = selected.map((k) => ({ key: k, ...CATALOG[k] }));

  return (
    <div data-tour="stat-strip" className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.key} className="app-card flex items-center gap-4 p-4">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: s.tint }}
            >
              <Icon className="h-5 w-5" style={{ color: s.iconColor }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">{s.label}</span>
                {s.live && (
                  <span
                    className="pulse-dot inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: s.iconColor }}
                  />
                )}
              </div>
              <div className="display mt-0.5 text-[26px] leading-tight">{s.value}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
