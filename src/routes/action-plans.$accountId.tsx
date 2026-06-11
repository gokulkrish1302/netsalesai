import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/state/AppStore";
import { useModals } from "@/components/modals/ModalsProvider";
import { SourceBadge } from "@/components/common/SourceBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Mail,
  Phone,
  StickyNote,
  Sparkles,
  Trash2,
  Trophy,
  XCircle,
  Users,
  FileText,
  Plus,
  Building2,
  Calendar,
  DollarSign,
  Link as LinkIcon,
  CheckCircle2,
  Circle,
} from "lucide-react";
import {
  URGENCY_LABEL,
  buildAccountSummary,
  estimateDealSize,
  suggestNextStep,
} from "@/lib/actionPlans";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getOrGenerateActionPlan,
  regenerateActionPlan,
} from "@/lib/actionPlan.functions";
import { getPlanExtras, savePlanExtras } from "@/lib/planExtras.functions";
import { formatCurrencyShort, formatDate } from "@/lib/format";
import type { ActionPlanStatus, ScoredAccount, Urgency } from "@/lib/types";
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

const STAGE_ORDER: ActionPlanStatus[] = [
  "not_contacted",
  "contacted",
  "meeting_scheduled",
  "proposal_sent",
  "won",
];

const STAGE_LABEL: Record<ActionPlanStatus, string> = {
  not_contacted: "Prospect",
  contacted: "Contacted",
  meeting_scheduled: "Meeting",
  proposal_sent: "Proposal",
  won: "Won",
  lost: "Lost",
};

interface Stakeholder { id: string; name: string; role: string; email: string }
interface SharedFile { id: string; name: string; url: string }

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function defaultUrgency(account: ScoredAccount): Urgency {
  if (account.category === "HOT" || account.contractRenewalDays <= 30) return "this_week";
  if (account.category === "WARM" || account.contractRenewalDays <= 90) return "this_month";
  return "this_quarter";
}

function ActionPlanDetail() {
  const { accountId } = Route.useParams();
  const navigate = useNavigate();
  const { state, scoredAccounts, createPlan, setPlanStatus, addPlanActivity, setPlanNextStep, removePlan } = useApp();
  const { openOutcome } = useModals();
  const [note, setNote] = useState("");

  // Local sales-room state (lightweight, in-memory per session)
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [shName, setShName] = useState("");
  const [shRole, setShRole] = useState("");
  const [shEmail, setShEmail] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  const plan = state.actionPlans[accountId];
  const account = scoredAccounts.find((a) => a.id === accountId);

  useEffect(() => {
    if (account && !plan) {
      createPlan(account.id, defaultUrgency(account));
    }
  }, [account, plan, createPlan]);

  const getPlanFn = useServerFn(getOrGenerateActionPlan);
  const regenPlanFn = useServerFn(regenerateActionPlan);
  const aiPlanQuery = useQuery({
    queryKey: ["action-plan", account?.id],
    queryFn: () => getPlanFn({ data: { accountId: account!.id } }),
    enabled: !!account,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const planContent = aiPlanQuery.data?.plan ?? null;
  const timeline = planContent?.timeline ?? [];
  const objections = planContent?.objections ?? [];
  const deal = useMemo(() => (account ? estimateDealSize(account) : null), [account]);

  const handleRegeneratePlan = async () => {
    if (!account) return;
    try {
      await regenPlanFn({ data: { accountId: account.id } });
      await aiPlanQuery.refetch();
      toast.success("Action plan regenerated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to regenerate plan");
    }
  };

  if (account && !plan) {
    return (
      <div className="app-card flex flex-col items-center gap-4 p-12 text-center">
        <Sparkles className="h-10 w-10 text-primary" />
        <p className="text-sm text-muted-foreground">Creating sales room and recommendations for {account.accountName}…</p>
      </div>
    );
  }

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
      type === "note" ? text : type === "call" ? "Logged call" : "Marked email sent";
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

  function addStakeholder(e: React.FormEvent) {
    e.preventDefault();
    if (!shName.trim()) return;
    setStakeholders((arr) => [
      ...arr,
      { id: `st-${Date.now()}`, name: shName.trim(), role: shRole.trim() || "Stakeholder", email: shEmail.trim() },
    ]);
    setShName(""); setShRole(""); setShEmail("");
    toast.success("Stakeholder added");
  }

  function addFile(e: React.FormEvent) {
    e.preventDefault();
    if (!fileName.trim() || !fileUrl.trim()) return;
    setFiles((arr) => [...arr, { id: `f-${Date.now()}`, name: fileName.trim(), url: fileUrl.trim() }]);
    setFileName(""); setFileUrl("");
    toast.success("File link saved");
  }

  const sourceTs = account.sourceTimestamp ? formatDate(account.sourceTimestamp) : "—";
  const isClosed = plan.status === "won" || plan.status === "lost";

  const stageIndex = STAGE_ORDER.indexOf(plan.status === "lost" ? "not_contacted" : plan.status);
  const stageProgress = plan.status === "won"
    ? 100
    : plan.status === "lost"
      ? 0
      : Math.round(((stageIndex + 1) / STAGE_ORDER.length) * 100);

  return (
    <div className="space-y-5">
      {/* Top nav */}
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
          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Close sales room
        </Button>
      </div>

      {/* Sales-room header */}
      <header
        className="app-card overflow-hidden p-0"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklab, var(--primary) 10%, var(--card)), var(--card))",
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="flex items-start gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md"
              style={{ backgroundColor: "var(--primary)" }}
            >
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Sales room
              </div>
              <h1 className="display text-[26px] leading-tight md:text-[30px]">{account.accountName}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <SourceBadge source={account.dataSource} size="sm" />
                <span>· Synced {sourceTs}</span>
                <span>·</span>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 font-semibold text-foreground">
                  {URGENCY_LABEL[plan.urgency]}
                </span>
                <span>·</span>
                <span>Score {account.score}/100 ({account.category})</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Deal status
            </label>
            <Select value={plan.status} onValueChange={(v) => handleStatusChange(v as ActionPlanStatus)}>
              <SelectTrigger className="h-9 w-52 rounded-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Pipeline stepper */}
        <div className="border-t bg-background/40 p-4">
          <div className="mb-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Pipeline progress</span>
            <span>{stageProgress}%</span>
          </div>
          <Progress value={stageProgress} className="h-1.5" />
          <div className="mt-3 grid grid-cols-5 gap-2 text-center text-[11px]">
            {STAGE_ORDER.map((s, i) => {
              const reached = plan.status === "won" || i <= stageIndex;
              const current = plan.status === s;
              return (
                <div key={s} className="flex flex-col items-center gap-1">
                  {reached ? (
                    <CheckCircle2
                      className="h-4 w-4"
                      style={{ color: current ? "var(--primary)" : "var(--success)" }}
                    />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/50" />
                  )}
                  <span className={cn("truncate", current ? "font-semibold text-foreground" : "text-muted-foreground")}>
                    {STAGE_LABEL[s]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-px bg-border/60 sm:grid-cols-4">
          <Stat icon={<DollarSign className="h-4 w-4" />} label="Deal size" value={
            deal && deal.high > 0
              ? `${formatCurrencyShort(deal.low)}–${formatCurrencyShort(deal.high)}`
              : "—"
          } />
          <Stat icon={<Calendar className="h-4 w-4" />} label="Renewal" value={`${account.contractRenewalDays}d`} />
          <Stat icon={<Users className="h-4 w-4" />} label="Stakeholders" value={String(stakeholders.length)} />
          <Stat icon={<FileText className="h-4 w-4" />} label="Files" value={String(files.length)} />
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

      {/* Tabs: Overview · Playbook · Stakeholders · Files · Activity */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="playbook">Playbook</TabsTrigger>
          <TabsTrigger value="stakeholders">Stakeholders</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <section className="app-card p-5">
              <h2 className="mb-2 text-sm font-semibold">Account summary</h2>
              <p className="text-sm text-foreground/90">{buildAccountSummary(account)}</p>
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
          <aside className="space-y-5">
            <QuickNoteCard
              note={note}
              setNote={setNote}
              onAdd={handleAddActivity}
              disabled={isClosed}
            />
          </aside>
        </TabsContent>

        {/* PLAYBOOK */}
        <TabsContent value="playbook" className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {aiPlanQuery.isLoading
                ? "Generating AI-tailored playbook…"
                : aiPlanQuery.data?.cached
                  ? "Cached AI plan · regenerate for a fresh version."
                  : "AI-generated playbook based on this account's signals."}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRegeneratePlan}
              disabled={aiPlanQuery.isFetching}
            >
              <Sparkles className={cn("mr-1 h-3.5 w-3.5", aiPlanQuery.isFetching && "animate-pulse")} />
              Regenerate
            </Button>
          </div>

          {aiPlanQuery.isError && (
            <div className="app-card border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {aiPlanQuery.error instanceof Error ? aiPlanQuery.error.message : "Failed to generate plan."}
              <Button size="sm" variant="outline" className="ml-3" onClick={() => aiPlanQuery.refetch()}>
                Try again
              </Button>
            </div>
          )}

          {aiPlanQuery.isLoading && (
            <div className="app-card p-5 text-sm text-muted-foreground">Loading playbook…</div>
          )}

          {planContent && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <section className="app-card p-5">
                <h2 className="mb-3 text-sm font-semibold">Executive summary</h2>
                <p className="text-sm text-foreground/90">{planContent.executiveSummary}</p>
              </section>
              <section className="app-card p-5">
                <h2 className="mb-3 text-sm font-semibold">Recommended products</h2>
                <ul className="space-y-2 text-sm">
                  {planContent.products.map((p) => (
                    <li key={p.name}>
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-muted-foreground"> — {p.description}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="app-card p-5">
                <h2 className="mb-3 text-sm font-semibold">Talking points</h2>
                <ul className="list-disc space-y-2 pl-5 text-sm">
                  {planContent.talkingPoints.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </section>
              <section className="app-card p-5">
                <h2 className="mb-3 text-sm font-semibold">Top objections ({account.industry})</h2>
                <div className="space-y-3">
                  {objections.map((o, i) => (
                    <div key={i} className="rounded-xl border bg-background p-3">
                      <p className="text-sm font-medium italic">{o.objection}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{o.response}</p>
                    </div>
                  ))}
                </div>
              </section>
              <section className="app-card p-5 lg:col-span-2">
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
                        {s.week}
                      </span>
                      <span>{s.action}</span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          )}
        </TabsContent>

        {/* STAKEHOLDERS */}
        <TabsContent value="stakeholders" className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <section className="app-card p-5 lg:col-span-2">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4" /> People in this deal
            </h2>
            {stakeholders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stakeholders added yet. Capture buyers and influencers on the right.</p>
            ) : (
              <ul className="divide-y">
                {stakeholders.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{initials(s.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-semibold">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.role}{s.email ? ` · ${s.email}` : ""}</div>
                      </div>
                    </div>
                    {s.email && (
                      <Button size="sm" variant="ghost" asChild>
                        <a href={`mailto:${s.email}`}><Mail className="mr-1 h-3.5 w-3.5" /> Email</a>
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <aside className="app-card p-5">
            <h3 className="mb-3 text-sm font-semibold">Add stakeholder</h3>
            <form onSubmit={addStakeholder} className="space-y-2">
              <Input placeholder="Full name" value={shName} onChange={(e) => setShName(e.target.value)} required />
              <Input placeholder="Role / title" value={shRole} onChange={(e) => setShRole(e.target.value)} />
              <Input type="email" placeholder="Email (optional)" value={shEmail} onChange={(e) => setShEmail(e.target.value)} />
              <Button type="submit" size="sm" className="w-full">
                <Plus className="mr-1 h-3.5 w-3.5" /> Add
              </Button>
            </form>
          </aside>
        </TabsContent>

        {/* FILES */}
        <TabsContent value="files" className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <section className="app-card p-5 lg:col-span-2">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4" /> Shared files & links
            </h2>
            {files.length === 0 ? (
              <p className="text-sm text-muted-foreground">No files yet. Paste a link to a proposal, deck, or doc on the right.</p>
            ) : (
              <ul className="divide-y">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center justify-between py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm font-medium">{f.name}</span>
                    </div>
                    <Button size="sm" variant="ghost" asChild>
                      <a href={f.url} target="_blank" rel="noreferrer">
                        <LinkIcon className="mr-1 h-3.5 w-3.5" /> Open
                      </a>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <aside className="app-card p-5">
            <h3 className="mb-3 text-sm font-semibold">Add file link</h3>
            <form onSubmit={addFile} className="space-y-2">
              <Input placeholder="Display name (e.g. Proposal v2)" value={fileName} onChange={(e) => setFileName(e.target.value)} required />
              <Input type="url" placeholder="https://…" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} required />
              <Button type="submit" size="sm" className="w-full">
                <Plus className="mr-1 h-3.5 w-3.5" /> Add link
              </Button>
            </form>
          </aside>
        </TabsContent>

        {/* ACTIVITY */}
        <TabsContent value="activity" className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <section className="app-card p-5 lg:col-span-2">
            <h2 className="mb-3 text-sm font-semibold">Activity log</h2>
            {plan.activities.length === 0 ? (
              <p className="text-xs text-muted-foreground">No activity yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {plan.activities.map((a) => (
                  <li key={a.id} className="border-l-2 pl-3" style={{ borderColor: "var(--primary)" }}>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <span className={cn("rounded-full px-1.5 py-0.5 font-semibold", "bg-surface-2")}>{a.type}</span>
                      <span>{formatDate(a.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-foreground/90">{a.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <aside>
            <QuickNoteCard
              note={note}
              setNote={setNote}
              onAdd={handleAddActivity}
              disabled={isClosed}
            />
          </aside>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 bg-card px-4 py-3">
      <div
        className="flex h-8 w-8 items-center justify-center rounded-lg"
        style={{ backgroundColor: "color-mix(in oklab, var(--primary) 12%, transparent)", color: "var(--primary)" }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}

function QuickNoteCard({
  note,
  setNote,
  onAdd,
  disabled,
}: {
  note: string;
  setNote: (v: string) => void;
  onAdd: (t: "note" | "call" | "email") => void;
  disabled: boolean;
}) {
  return (
    <section className="app-card p-5">
      <h2 className="mb-3 text-sm font-semibold">Add note · log activity</h2>
      <Textarea
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Type a note — AI will refine the next step…"
        disabled={disabled}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onAdd("note")} disabled={disabled || !note.trim()}>
          <StickyNote className="mr-1 h-3.5 w-3.5" /> Save note
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAdd("call")} disabled={disabled}>
          <Phone className="mr-1 h-3.5 w-3.5" /> Log call
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAdd("email")} disabled={disabled}>
          <Mail className="mr-1 h-3.5 w-3.5" /> Email sent
        </Button>
      </div>
    </section>
  );
}
