import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useApp } from "@/state/AppStore";
import { SourceBadge } from "@/components/common/SourceBadge";
import { CategoryPill } from "@/components/common/CategoryPill";
import { Button } from "@/components/ui/button";
import { Mail, ClipboardList, AlertTriangle, Target } from "lucide-react";
import { useModals } from "@/components/modals/ModalsProvider";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PipelineStage, ScoredAccount } from "@/lib/types";

export const Route = createFileRoute("/action-plans")({
  head: () => ({
    meta: [
      { title: "Action Plans — NetApp Cloud Migration Agent" },
      {
        name: "description",
        content: "Track every active sales play with stage, last action, and stalled-account alerts.",
      },
    ],
  }),
  component: ActionPlansPage,
});

const ACTIVE_STAGES = new Set<PipelineStage>(["contacted", "meeting_scheduled", "proposal_sent"]);

type PlanStatus = "In Progress" | "Meeting Scheduled" | "Proposal Sent" | "Stalled";

function statusFromStage(stage: PipelineStage, daysSince: number): PlanStatus {
  if (daysSince >= 14) return "Stalled";
  if (stage === "meeting_scheduled") return "Meeting Scheduled";
  if (stage === "proposal_sent") return "Proposal Sent";
  return "In Progress";
}

const STATUS_COLOR: Record<PlanStatus, { bg: string; fg: string }> = {
  "In Progress": { bg: "color-mix(in oklab, var(--primary) 12%, transparent)", fg: "var(--on-primary-container)" },
  "Meeting Scheduled": { bg: "var(--warm-bg)", fg: "var(--warm)" },
  "Proposal Sent": { bg: "color-mix(in oklab, var(--success) 14%, transparent)", fg: "var(--success)" },
  Stalled: { bg: "var(--hot-bg)", fg: "var(--hot)" },
};

function ActionPlansPage() {
  const { scoredAccounts, state, openAccount } = useApp();
  const modals = useModals();

  const plans = useMemo(() => {
    return scoredAccounts
      .map((a) => {
        const stage = (state.pipelineStages[a.id] ?? a.pipelineStage) as PipelineStage;
        if (!ACTIVE_STAGES.has(stage)) return null;

        // Find last activity timestamp from call logs, notes, stage history, lastContactDate
        const dates: number[] = [];
        const logs = state.callLogs[a.id] ?? [];
        const notes = state.notes[a.id] ?? [];
        const history = state.stageHistory[a.id] ?? [];
        if (logs[0]) dates.push(new Date(logs[0].date).getTime());
        if (notes[0]) dates.push(new Date(notes[0].createdAt).getTime());
        if (history.length) dates.push(new Date(history[history.length - 1].date).getTime());
        if (a.lastContactDate) dates.push(new Date(a.lastContactDate).getTime());
        const lastTs = dates.length ? Math.max(...dates) : null;
        const daysSince = lastTs ? Math.floor((Date.now() - lastTs) / 86_400_000) : 999;

        const lastAction =
          logs[0]?.outcome
            ? `Call: ${logs[0].outcome}`
            : notes[0]?.text
              ? `Note: ${notes[0].text.slice(0, 60)}${notes[0].text.length > 60 ? "…" : ""}`
              : history[history.length - 1]
                ? `Moved to ${history[history.length - 1].stage.replace(/_/g, " ")}`
                : a.lastContactDate
                  ? `Last contact on ${formatDate(a.lastContactDate)}`
                  : "No activity yet";

        const nextStep =
          stage === "meeting_scheduled"
            ? "Confirm meeting & prep agenda"
            : stage === "proposal_sent"
              ? "Follow up on proposal review"
              : "Schedule discovery meeting";

        const status = statusFromStage(stage, daysSince);
        return { account: a, stage, lastTs, daysSince, lastAction, nextStep, status };
      })
      .filter(Boolean) as Array<{
        account: ScoredAccount;
        stage: PipelineStage;
        lastTs: number | null;
        daysSince: number;
        lastAction: string;
        nextStep: string;
        status: PlanStatus;
      }>;
  }, [scoredAccounts, state]);

  const sorted = [...plans].sort((a, b) => {
    // Stalled first, then by days since
    if (a.status === "Stalled" && b.status !== "Stalled") return -1;
    if (b.status === "Stalled" && a.status !== "Stalled") return 1;
    return b.daysSince - a.daysSince;
  });

  const stalledCount = plans.filter((p) => p.status === "Stalled").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[28px] leading-tight md:text-[32px]">Action Plans</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {plans.length} active plan{plans.length === 1 ? "" : "s"}
            {stalledCount > 0 && (
              <>
                {" · "}
                <span className="font-medium" style={{ color: "var(--hot)" }}>
                  {stalledCount} stalled
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-surface-1 px-3 py-2 text-xs text-muted-foreground">
          <Target className="h-4 w-4" style={{ color: "var(--primary)" }} />
          Rows highlighted in yellow have no activity for 14+ days
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="app-card flex flex-col items-center gap-3 p-12 text-center">
          <Target className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No active action plans. Move an account to Contacted, Meeting Scheduled, or Proposal Sent to start one.
          </p>
        </div>
      ) : (
        <div className="app-card overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,2.5fr)_minmax(0,1.2fr)_minmax(0,2fr)_minmax(0,2fr)_minmax(0,0.8fr)_auto] gap-3 border-b bg-surface-1 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
            <div>Account</div>
            <div>Status</div>
            <div>Last action</div>
            <div>Next step</div>
            <div className="text-right">Days idle</div>
            <div />
          </div>
          {sorted.map(({ account: a, daysSince, lastAction, nextStep, status }) => {
            const stalled = status === "Stalled";
            const sc = STATUS_COLOR[status];
            return (
              <div
                key={a.id}
                className={cn(
                  "grid grid-cols-1 gap-2 border-b px-4 py-3 transition-colors last:border-b-0 md:grid-cols-[minmax(0,2.5fr)_minmax(0,1.2fr)_minmax(0,2fr)_minmax(0,2fr)_minmax(0,0.8fr)_auto] md:gap-3 md:py-3",
                )}
                style={
                  stalled
                    ? {
                        backgroundColor: "color-mix(in oklab, var(--warning) 10%, transparent)",
                      }
                    : undefined
                }
              >
                <div className="min-w-0">
                  <button
                    onClick={() => openAccount(a.id)}
                    className="text-left text-sm font-semibold hover:underline"
                  >
                    {a.accountName}
                  </button>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <SourceBadge source={a.dataSource} size="xs" />
                    <CategoryPill category={a.category} />
                  </div>
                </div>
                <div className="flex items-center">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{ backgroundColor: sc.bg, color: sc.fg }}
                  >
                    {stalled && <AlertTriangle className="h-3 w-3" />}
                    {status}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">{lastAction}</div>
                <div className="text-xs text-foreground/80">{nextStep}</div>
                <div
                  className={cn(
                    "text-right text-sm font-semibold tabular-nums",
                    stalled && "text-[color:var(--hot)]",
                  )}
                >
                  {daysSince >= 999 ? "—" : `${daysSince}d`}
                </div>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2"
                    onClick={() => modals.openEmail(a)}
                    aria-label="Email"
                  >
                    <Mail className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2"
                    onClick={() => modals.openPlan(a)}
                    aria-label="Plan"
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
