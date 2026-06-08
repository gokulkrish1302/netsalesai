import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useApp, MAX_ACTIVE_PLANS, isActivePlan } from "@/state/AppStore";
import { SourceBadge } from "@/components/common/SourceBadge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Target, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { URGENCY_LABEL, suggestNextStep } from "@/lib/actionPlans";
import type { ActionPlanEntry, ActionPlanStatus } from "@/lib/types";

export const Route = createFileRoute("/action-plans")({
  head: () => ({
    meta: [
      { title: "Action Plans — NetApp Cloud Migration Agent" },
      { name: "description", content: "Track active sales plays with urgency, status, and stalled-account alerts." },
    ],
  }),
  component: ActionPlansPage,
});

const STATUS_LABEL: Record<ActionPlanStatus, string> = {
  not_contacted: "Not Contacted",
  contacted: "Contacted",
  meeting_scheduled: "Meeting Scheduled",
  proposal_sent: "Proposal Sent",
  won: "Won",
  lost: "Lost",
};

const STATUS_COLOR: Record<ActionPlanStatus, { bg: string; fg: string }> = {
  not_contacted: { bg: "var(--surface-2)", fg: "var(--muted-foreground)" },
  contacted: { bg: "color-mix(in oklab, var(--primary) 12%, transparent)", fg: "var(--on-primary-container)" },
  meeting_scheduled: { bg: "var(--warm-bg)", fg: "var(--warm)" },
  proposal_sent: { bg: "color-mix(in oklab, var(--success) 14%, transparent)", fg: "var(--success)" },
  won: { bg: "color-mix(in oklab, var(--success) 20%, transparent)", fg: "var(--success)" },
  lost: { bg: "var(--hot-bg)", fg: "var(--hot)" },
};

function lastActivityTs(plan: ActionPlanEntry) {
  const t = plan.activities[0]?.createdAt ?? plan.createdAt;
  return new Date(t).getTime();
}

function ActionPlansPage() {
  const { scoredAccounts, state, activePlanCount } = useApp();
  const navigate = useNavigate();

  const plans = useMemo(() => {
    return Object.values(state.actionPlans)
      .filter(isActivePlan)
      .map((p) => {
        const acct = scoredAccounts.find((a) => a.id === p.accountId);
        if (!acct) return null;
        const lastTs = lastActivityTs(p);
        const daysSince = Math.floor((Date.now() - lastTs) / 86_400_000);
        const lastActivity = p.activities[0]?.text ?? "Plan created";
        const nextStep =
          p.nextStepOverride ??
          suggestNextStep(state.notes[acct.id]?.[0]?.text ?? "", defaultNextStep(p.status));
        return { plan: p, account: acct, daysSince, lastActivity, nextStep };
      })
      .filter(Boolean) as Array<{
        plan: ActionPlanEntry;
        account: (typeof scoredAccounts)[number];
        daysSince: number;
        lastActivity: string;
        nextStep: string;
      }>;
  }, [state.actionPlans, state.notes, scoredAccounts]);

  const sorted = [...plans].sort((a, b) => b.daysSince - a.daysSince);
  const usedPct = (activePlanCount / MAX_ACTIVE_PLANS) * 100;
  const barColor =
    activePlanCount >= 19
      ? "var(--hot)"
      : activePlanCount >= 15
        ? "var(--warning, var(--warm))"
        : "var(--success)";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[28px] leading-tight md:text-[32px]">Action Plans</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activePlanCount} active plan{activePlanCount === 1 ? "" : "s"} · cards with no activity in 14+ days are highlighted
          </p>
        </div>
      </div>

      {/* Capacity bar */}
      <div className="app-card p-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-semibold">{activePlanCount} of {MAX_ACTIVE_PLANS} action plan slots used</span>
          <span className="text-muted-foreground">
            {activePlanCount >= 19 ? "Critical — close a plan before adding more" : activePlanCount >= 15 ? "Approaching limit" : "Healthy"}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(100, usedPct)}%`, backgroundColor: barColor }}
          />
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="app-card flex flex-col items-center gap-4 p-12 text-center">
          <Target className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No action plans yet. Add accounts from the Accounts tab to get started.
          </p>
          <Button asChild>
            <Link to="/accounts">
              Go to Accounts <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map(({ plan, account, daysSince, lastActivity, nextStep }) => {
            const stalled = daysSince >= 14;
            const sc = STATUS_COLOR[plan.status];
            return (
              <button
                key={plan.accountId}
                onClick={() =>
                  navigate({ to: "/action-plans/$accountId", params: { accountId: plan.accountId } })
                }
                className={cn(
                  "app-card group relative flex flex-col gap-3 p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
                )}
                style={
                  stalled
                    ? { backgroundColor: "color-mix(in oklab, var(--warning, var(--warm)) 12%, var(--card))" }
                    : undefined
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold">{account.accountName}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <SourceBadge source={account.dataSource} size="xs" />
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={{ backgroundColor: "var(--surface-2)", color: "var(--muted-foreground)" }}
                      >
                        {URGENCY_LABEL[plan.urgency]}
                      </span>
                    </div>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{ backgroundColor: sc.bg, color: sc.fg }}
                  >
                    {STATUS_LABEL[plan.status]}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <Row label="Last activity" value={lastActivity} />
                  <Row label="Next step" value={nextStep} />
                  <Row
                    label="Days since touch"
                    value={
                      <span
                        className={cn("font-semibold", stalled && "text-[color:var(--hot)]")}
                      >
                        {daysSince}d {stalled && <AlertTriangle className="ml-0.5 inline h-3 w-3" />}
                      </span>
                    }
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="flex-1 text-foreground/90">{value}</span>
    </div>
  );
}

function defaultNextStep(status: ActionPlanStatus): string {
  switch (status) {
    case "not_contacted":
      return "Send the Day 1 intro email and queue a follow-up call.";
    case "contacted":
      return "Schedule a discovery meeting in the next 5 business days.";
    case "meeting_scheduled":
      return "Prep agenda + tailored demo; send read-ahead 24h prior.";
    case "proposal_sent":
      return "Follow up in 3 business days to confirm proposal review.";
    default:
      return "Reassess and re-engage.";
  }
}
