import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useApp } from "@/state/AppStore";
import { ScoreGauge } from "@/components/common/ScoreGauge";
import { CategoryPill } from "@/components/common/CategoryPill";
import { CategoryDot } from "@/components/common/CategoryPill";
import { CompetitiveRiskBadge } from "@/components/common/CompetitiveRiskBadge";
import { RenewalCountdown } from "@/components/common/RenewalCountdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mail, ClipboardList, Phone, FileDown, AlertOctagon, Check } from "lucide-react";
import { useModals } from "@/components/modals/ModalsProvider";
import { useState } from "react";
import { toast } from "sonner";
import { CATEGORY_META } from "@/lib/scoring";
import { formatCurrencyShort, formatPct, formatDate, STAGE_LABEL, STAGE_ORDER } from "@/lib/format";
import type { PipelineStage } from "@/lib/types";
import { cn } from "@/lib/utils";

const BREAKDOWN_LABELS: Record<string, { label: string; max: number; key: keyof ReturnType<typeof reasonsOf> }> = {
  deviceAge: { label: "Device Age", max: 20, key: "deviceAge" },
  utilization: { label: "Storage Utilization", max: 15, key: "utilization" },
  budget: { label: "IT Budget", max: 25, key: "budget" },
  cloud: { label: "Cloud Readiness", max: 25, key: "cloud" },
  industry: { label: "Industry Fit", max: 10, key: "industry" },
  renewal: { label: "Renewal Urgency", max: 5, key: "renewal" },
};

function reasonsOf<T extends { reasons: Record<string, string> }>(a: T) {
  return a.reasons;
}

export function AccountDetailPanel() {
  const { activeAccount, openAccount, state, addNote, setStage } = useApp();
  const modals = useModals();
  const [noteText, setNoteText] = useState("");

  const open = !!activeAccount;
  const a = activeAccount;

  function saveNote() {
    if (!a || !noteText.trim()) return;
    addNote(a.id, noteText.trim());
    setNoteText("");
    toast.success("💾 Note saved");
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && openAccount(null)}>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-[480px]">
        {a && (
          <div className="flex flex-col">
            <SheetHeader className="border-b p-5">
              <SheetTitle className="text-xl">{a.accountName}</SheetTitle>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{a.industry}</span>
                <span>·</span>
                <span>{a.region}</span>
                <span>·</span>
                <span>{a.companySize}</span>
              </div>
            </SheetHeader>

            <div className="space-y-6 p-5">
              {/* Gauge */}
              <div className="flex flex-col items-center gap-2">
                <ScoreGauge score={a.score} category={a.category} />
                <CategoryPill category={a.category} />
              </div>

              {/* Competitive risk warning */}
              {a.endOfLife && a.cloudStatus === "none" && (
                <div
                  className="rounded-md border p-3 text-sm"
                  style={{
                    borderColor: "var(--hot)",
                    backgroundColor: "var(--hot-bg)",
                    color: "var(--hot)",
                  }}
                >
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <AlertOctagon className="h-4 w-4" />
                    Competitive Risk
                  </div>
                  <p className="mb-3 text-foreground">
                    This device is end-of-life with no cloud adoption recorded. Without proactive
                    outreach, this account is at risk of migrating to a competitor cloud platform.
                  </p>
                  <Button size="sm" onClick={() => modals.openEmail(a)}>
                    Draft Urgent Outreach Email
                  </Button>
                </div>
              )}

              {/* Score breakdown */}
              <section>
                <h3 className="mb-3 text-sm font-semibold">Score Breakdown</h3>
                <div className="space-y-3">
                  {(["deviceAge", "utilization", "budget", "cloud", "industry", "renewal"] as const).map(
                    (k) => {
                      const meta = BREAKDOWN_LABELS[k];
                      const val = a.breakdown[k];
                      const pct = (val / meta.max) * 100;
                      return (
                        <div key={k}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-medium">{meta.label}</span>
                            <span className="text-muted-foreground tabular-nums">
                              {val}/{meta.max}
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded bg-secondary">
                            <div
                              className="h-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: "var(--primary)" }}
                            />
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{a.reasons[k]}</p>
                        </div>
                      );
                    },
                  )}
                </div>
              </section>

              {/* Account intel grid */}
              <section>
                <h3 className="mb-3 text-sm font-semibold">Account Intel</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <IntelCell label="Device" value={`${a.deviceModel}${a.endOfLife ? " · EOL" : ""}`} />
                  <IntelCell label="Storage" value={`${a.storageCapacityTB} TB · ${formatPct(a.utilizationPct)}`} />
                  <IntelCell label="IT Budget" value={formatCurrencyShort(a.itBudgetUSD)} />
                  <IntelCell label="Cloud Status" value={cloudLabel(a.cloudStatus)} />
                  <IntelCell label="Renewal" value={`${a.contractRenewalDays} days`} />
                  <IntelCell label="Annual Revenue" value={formatCurrencyShort(a.annualRevenue)} />
                </div>
              </section>

              {/* Pipeline stepper */}
              <section>
                <h3 className="mb-3 text-sm font-semibold">Pipeline Stage</h3>
                <div className="flex flex-wrap items-center gap-1">
                  {STAGE_ORDER.map((s, i) => {
                    const currentIdx = STAGE_ORDER.indexOf(
                      (state.pipelineStages[a.id] ?? a.pipelineStage) as PipelineStage,
                    );
                    const active = i <= currentIdx;
                    return (
                      <button
                        key={s}
                        onClick={() => setStage(a.id, s)}
                        className={cn(
                          "flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors",
                          active
                            ? "border-transparent text-white"
                            : "border-border text-muted-foreground hover:bg-accent",
                        )}
                        style={active ? { backgroundColor: "var(--primary)" } : undefined}
                      >
                        {i <= currentIdx && <Check className="h-3 w-3" />}
                        {STAGE_LABEL[s]}
                      </button>
                    );
                  })}
                </div>
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {(state.stageHistory[a.id] ?? []).slice(-5).reverse().map((h, i) => (
                    <li key={i}>
                      Moved to <span className="font-medium text-foreground">{STAGE_LABEL[h.stage]}</span>{" "}
                      — {formatDate(h.date)}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Notes */}
              <section>
                <h3 className="mb-2 text-sm font-semibold">Notes</h3>
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={3}
                  placeholder="Add a note for this account..."
                />
                <div className="mt-2 flex justify-end">
                  <Button size="sm" onClick={saveNote} disabled={!noteText.trim()}>
                    Save Note
                  </Button>
                </div>
                <div className="mt-3 space-y-2">
                  {(state.notes[a.id] ?? []).map((n) => (
                    <div key={n.id} className="rounded-md border bg-background p-2 text-sm">
                      <p>{n.text}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">{formatDate(n.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Call history */}
              <section>
                <h3 className="mb-2 text-sm font-semibold">Call History</h3>
                {(state.callLogs[a.id] ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No calls logged yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {(state.callLogs[a.id] ?? []).map((c) => (
                      <li key={c.id} className="rounded-md border bg-background p-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{c.outcome}</span>
                          <span className="text-muted-foreground">{formatDate(c.date)}</span>
                        </div>
                        <p className="mt-1 text-muted-foreground">
                          {c.duration} · Next: {c.nextAction}
                        </p>
                        {c.notes && <p className="mt-1">{c.notes}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 border-t pt-4">
                <Button size="sm" onClick={() => modals.openEmail(a)}>
                  <Mail className="mr-1 h-3.5 w-3.5" /> Email
                </Button>
                <Button size="sm" variant="outline" onClick={() => modals.openPlan(a)}>
                  <ClipboardList className="mr-1 h-3.5 w-3.5" /> Action Plan
                </Button>
                <Button size="sm" variant="outline" onClick={() => modals.openCall(a)}>
                  <Phone className="mr-1 h-3.5 w-3.5" /> Log Call
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.print()}>
                  <FileDown className="mr-1 h-3.5 w-3.5" /> Export PDF
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function IntelCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}

function cloudLabel(s: string) {
  return s === "active_cloud"
    ? "Active Cloud"
    : s === "hybrid"
      ? "Hybrid"
      : s === "licensed_not_deployed"
        ? "Licensed (not deployed)"
        : "None";
}

// silence unused
void CategoryDot;
void CATEGORY_META;
void RenewalCountdown;
