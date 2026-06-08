import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApp } from "@/state/AppStore";
import { useModals } from "@/components/modals/ModalsProvider";
import { SourceBadge } from "@/components/common/SourceBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  Mail,
  Phone,
  StickyNote,
  Sparkles,
  Trash2,
  Trophy,
  XCircle,
} from "lucide-react";
import {
  URGENCY_LABEL,
  buildAccountSummary,
  buildIndustryObjections,
  buildUrgencyTimeline,
  estimateDealSize,
  suggestNextStep,
} from "@/lib/actionPlans";
import { buildActionPlan } from "@/lib/actionPlans";
import { formatCurrencyShort, formatDate } from "@/lib/format";
import type { ActionPlanStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/action-plans/$accountId")({
  component: ActionPlanDetail,
});

const STATUS_OPTIONS: { value: ActionPlanStatus; label: string }[] = [
  { value: "not_contacted", label: "Not Contacted" },
  { value: "contacted", label: "Contacted" },
  { value: "meeting_scheduled", label: "Meeting Scheduled" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

function ActionPlanDetail() {
  const { accountId } = Route.useParams();
  const navigate = useNavigate();
  const { state, scoredAccounts, setPlanStatus, addPlanActivity, setPlanNextStep, removePlan } = useApp();
  const { openOutcome } = useModals();
  const [note, setNote] = useState("");

  const plan = state.actionPlans[accountId];
  const account = scoredAccounts.find((a) => a.id === accountId);

  const planContent = useMemo(() => (account ? buildActionPlan(account) : null), [account]);
  const timeline = useMemo(
    () => (account && plan ? buildUrgencyTimeline(account, plan.urgency) : []),
    [account, plan],
  );
  const objections = useMemo(() => (account ? buildIndustryObjections(account) : []), [account]);
  const deal = useMemo(() => (account ? estimateDealSize(account) : null), [account]);

  if (!account || !plan) {
    return (
      <div className="app-card flex flex-col items-center gap-4 p-12 text-center">
        <p className="text-sm text-muted-foreground">This action plan was not found.</p>
        <Button asChild>
          <Link to="/action-plans">Back to Action Plans</Link>
        </Button>
      </div>
    );
  }

  const fallbackNext =
    plan.status === "meeting_scheduled"
      ? "Prep agenda + tailored demo; send read-ahead 24h prior."
      : plan.status === "proposal_sent"
        ? "Follow up in 3 business days to confirm proposal review."
        : plan.status === "contacted"
          ? "Schedule a discovery meeting in the next 5 business days."
          : "Send the Day 1 intro email and queue a follow-up call.";
  const nextStep = plan.nextStepOverride ?? fallbackNext;

  const handleStatusChange = (value: ActionPlanStatus) => {
    if (value === "won" || value === "lost") {
      openOutcome(account.id, account.accountName, value);
      return;
    }
    setPlanStatus(account.id, value);
    toast.success(`Status → ${value.replace(/_/g, " ")}`);
  };

  const handleAddActivity = (type: "note" | "call" | "email") => {
    const text = note.trim();
    if (!text && type === "note") return;
    const payload =
      type === "note"
        ? text
        : type === "call"
          ? "Logged call"
          : "Marked email sent";
    addPlanActivity(account.id, {
      id: `act-${Date.now()}`,
      type,
      text: payload,
      createdAt: new Date().toISOString(),
    });
    if (type === "note" && text) {
      const suggestion = suggestNextStep(text, fallbackNext);
      if (suggestion !== nextStep) {
        setPlanNextStep(account.id, suggestion);
        toast.success("AI updated the next recommended step based on your note.");
      }
      setNote("");
    } else {
      toast.success(`${type === "call" ? "Call" : "Email"} logged.`);
    }
  };

  const sourceTs = account.sourceTimestamp ? formatDate(account.sourceTimestamp) : "—";
  const isClosed = plan.status === "won" || plan.status === "lost";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/action-plans" })}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> All plans
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-[color:var(--hot)]"
          onClick={() => {
            removePlan(account.id);
            toast.success("Plan removed.");
            navigate({ to: "/action-plans" });
          }}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove plan
        </Button>
      </div>

      <header className="app-card flex flex-wrap items-start justify-between gap-4 p-5">
        <div>
          <h1 className="display text-[26px] leading-tight md:text-[30px]">{account.accountName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <SourceBadge source={account.dataSource} size="sm" />
            <span>· Last synced {sourceTs}</span>
            <span>·</span>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 font-semibold text-foreground">
              {URGENCY_LABEL[plan.urgency]}
            </span>
            <span>·</span>
            <span>Score {account.score}/100 ({account.category})</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</label>
          <Select value={plan.status} onValueChange={(v) => handleStatusChange(v as ActionPlanStatus)}>
            <SelectTrigger className="h-9 w-52 rounded-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {isClosed && plan.decidingFactor && (
        <div
          className="app-card flex items-start gap-3 p-4"
          style={{
            backgroundColor:
              plan.status === "won"
                ? "color-mix(in oklab, var(--success) 12%, var(--card))"
                : "color-mix(in oklab, var(--hot) 10%, var(--card))",
          }}
        >
          {plan.status === "won" ? (
            <Trophy className="h-5 w-5" style={{ color: "var(--success)" }} />
          ) : (
            <XCircle className="h-5 w-5" style={{ color: "var(--hot)" }} />
          )}
          <div className="text-sm">
            <div className="font-semibold">{plan.status === "won" ? "Won" : "Lost"} outcome</div>
            <div className="text-muted-foreground">Deciding factor: {plan.decidingFactor}</div>
          </div>
        </div>
      )}

      {/* Next Best Action */}
      <div
        className="app-card flex flex-wrap items-center justify-between gap-3 p-5"
        style={{ backgroundColor: "var(--primary-container)", color: "var(--on-primary-container)" }}
      >
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">Next Best Action</div>
            <div className="text-sm font-medium">{nextStep}</div>
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            const type =
              /email/i.test(nextStep) ? "email" : /call|phone|voicemail/i.test(nextStep) ? "call" : "note";
            handleAddActivity(type as "note" | "call" | "email");
          }}
        >
          Mark done
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: AI plan content */}
        <div className="space-y-5 lg:col-span-2">
          <section className="app-card p-5">
            <h2 className="mb-2 text-sm font-semibold">Account summary</h2>
            <p className="text-sm text-foreground/90">{buildAccountSummary(account)}</p>
          </section>

          <section className="app-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Talking points</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm">
              {planContent?.talkingPoints.slice(0, 3).map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </section>

          <section className="app-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Top objections ({account.industry})</h2>
            <div className="space-y-3">
              {objections.slice(0, 2).map((o, i) => (
                <div key={i} className="rounded-xl border bg-background p-3">
                  <p className="text-sm font-medium italic">{o.objection}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{o.response}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="app-card p-5">
            <h2 className="mb-3 text-sm font-semibold">
              Outreach timeline — {URGENCY_LABEL[plan.urgency]}
            </h2>
            <ol className="space-y-2 text-sm">
              {timeline.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="shrink-0 rounded px-2 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: "var(--accent)", color: "var(--primary)" }}
                  >
                    {s.label}
                  </span>
                  <span>{s.action}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="app-card p-5">
            <h2 className="mb-2 text-sm font-semibold">Estimated deal size</h2>
            <p className="text-2xl font-bold" style={{ color: "var(--success)" }}>
              {deal && deal.high > 0
                ? `${formatCurrencyShort(deal.low)} – ${formatCurrencyShort(deal.high)}`
                : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Range derived from IT budget ({formatCurrencyShort(account.itBudgetUSD)}) and account category.
            </p>
          </section>
        </div>

        {/* Right: Activity log + notes */}
        <aside className="space-y-5">
          <section className="app-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Add note · log activity</h2>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Type a note — AI will refine the next step…"
              disabled={isClosed}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => handleAddActivity("note")} disabled={isClosed || !note.trim()}>
                <StickyNote className="mr-1 h-3.5 w-3.5" /> Save note
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleAddActivity("call")} disabled={isClosed}>
                <Phone className="mr-1 h-3.5 w-3.5" /> Log call
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleAddActivity("email")} disabled={isClosed}>
                <Mail className="mr-1 h-3.5 w-3.5" /> Email sent
              </Button>
            </div>
          </section>

          <section className="app-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Activity log</h2>
            {plan.activities.length === 0 ? (
              <p className="text-xs text-muted-foreground">No activity yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {plan.activities.map((a) => (
                  <li key={a.id} className="border-l-2 pl-3" style={{ borderColor: "var(--primary)" }}>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <span className={cn("rounded-full px-1.5 py-0.5 font-semibold", "bg-surface-2")}>
                        {a.type}
                      </span>
                      <span>{formatDate(a.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-foreground/90">{a.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
