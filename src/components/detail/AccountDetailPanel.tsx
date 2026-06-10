import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useApp } from "@/state/AppStore";
import { ScoreGauge } from "@/components/common/ScoreGauge";
import { CategoryPill } from "@/components/common/CategoryPill";
import { Button } from "@/components/ui/button";
import { AlertOctagon, RefreshCw, Upload, ArrowRight } from "lucide-react";
import { useModals } from "@/components/modals/ModalsProvider";
import { CATEGORY_META } from "@/lib/scoring";
import { formatCurrencyShort, formatPct } from "@/lib/format";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

const BREAKDOWN_LABELS: Record<string, { label: string; short: string; max: number }> = {
  deviceAge: { label: "Device Age", short: "Device", max: 20 },
  utilization: { label: "Storage Utilization", short: "Storage", max: 15 },
  budget: { label: "IT Budget", short: "Budget", max: 25 },
  cloud: { label: "Cloud Readiness", short: "Cloud", max: 25 },
  industry: { label: "Industry Fit", short: "Industry", max: 10 },
  renewal: { label: "Renewal Urgency", short: "Renewal", max: 5 },
};

const KEYS = ["deviceAge", "utilization", "budget", "cloud", "industry", "renewal"] as const;


export function AccountDetailPanel() {
  const { activeAccount, openAccount } = useApp();
  const { startCreatePlan } = useModals();

  const open = !!activeAccount;
  const a = activeAccount;

  const radarData = a
    ? KEYS.map((k) => ({
        criterion: BREAKDOWN_LABELS[k].short,
        score: Math.round((a.breakdown[k] / BREAKDOWN_LABELS[k].max) * 100),
      }))
    : [];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && openAccount(null)}>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-[560px]">
        {a && (
          <div className="flex flex-col">
            <SheetHeader className="border-b p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <span className="label-eyebrow">{a.industry} · {a.region}</span>
                  <SheetTitle className="serif mt-1 text-2xl font-normal leading-tight" style={{ letterSpacing: "-0.01em" }}>
                    {a.accountName}
                  </SheetTitle>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <CategoryPill category={a.category} />
                    <span>·</span>
                    <span>{a.companySize}</span>
                    <span>·</span>
                    <span>Rep: {a.salesRep}</span>
                  </div>
                </div>
                <div className="shrink-0">
                  <ScoreGauge score={a.score} category={a.category} size={80} />
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-6 p-5">
              {/* Competitive risk warning */}
              {a.endOfLife && a.cloudStatus === "none" && (
                <div
                  className="rounded-md p-3 text-sm"
                  style={{ backgroundColor: "var(--hot-bg)", color: "var(--hot)" }}
                >
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <AlertOctagon className="h-4 w-4" />
                    Competitive Risk
                  </div>
                  <p className="text-foreground">
                    Device is end-of-life with no cloud adoption recorded. Move this account into an
                    Action Plan to coordinate outreach before it migrates to a competitor.
                  </p>
                </div>
              )}

              {/* Score Radar */}
              <section>
                <span className="label-eyebrow">Score Profile</span>
                <div className="mt-2 h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} margin={{ top: 12, right: 24, bottom: 12, left: 24 }}>
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis
                        dataKey="criterion"
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                        stroke="var(--border)"
                      />
                      <Radar
                        dataKey="score"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        fill="var(--primary)"
                        fillOpacity={0.4}
                        dot={{ fill: "var(--primary)", r: 3 }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                  {KEYS.map((k) => (
                    <div key={k} className="flex items-start gap-1.5">
                      <span
                        className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: "var(--primary)" }}
                      />
                      <span className="text-muted-foreground leading-snug">{a.reasons[k]}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Current Infrastructure (from Active IQ) */}
              {(a.netappModels?.length || a.ontapVersion || a.clusterCount != null) && (
                <section>
                  <div className="flex items-center justify-between">
                    <span className="label-eyebrow">Current Infrastructure</span>
                    {a.ontapVersion && <OntapBadge version={a.ontapVersion} />}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                    <IntelCell label="Models" value={a.netappModels?.join(", ") || "—"} />
                    <IntelCell label="ONTAP Version" value={a.ontapVersion ?? "—"} />
                    <IntelCell label="Clusters" value={String(a.clusterCount ?? "—")} />
                    <IntelCell label="Architecture" value={a.storageArchitecture ?? "—"} />
                    <IntelCell label="Cloud Connectivity" value={cloudLabel(a.cloudStatus)} />
                    <IntelCell
                      label="Risks (H / M)"
                      value={`${a.riskCountHigh ?? 0} / ${a.riskCountMedium ?? 0}`}
                    />
                  </div>
                </section>
              )}

              {/* Data source */}
              <section>
                <span className="label-eyebrow">Data Source</span>
                <DataSourceCard account={a} />
              </section>

              {/* Account intel grid */}
              <section>
                <span className="label-eyebrow">Account Intel</span>
                <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                  <IntelCell label="Device" value={`${a.deviceModel}${a.endOfLife ? " · EOL" : ""}`} />
                  <IntelCell label="Storage" value={`${a.storageCapacityTB} TB · ${formatPct(a.utilizationPct)}`} />
                  <IntelCell label="IT Budget" value={formatCurrencyShort(a.itBudgetUSD)} />
                  <IntelCell label="Cloud Status" value={cloudLabel(a.cloudStatus)} />
                  <IntelCell label="Renewal" value={`${a.contractRenewalDays} days`} />
                  <IntelCell label="Annual Revenue" value={formatCurrencyShort(a.annualRevenue)} />
                </div>
              </section>

              <div className="border-t pt-4">
                <Button className="w-full" size="lg" onClick={() => startCreatePlan(a)}>
                  Move to Action Plan <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  Pipeline, notes, calls, and outreach live inside the account's deal room.
                </p>
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
    <div className="rounded-md bg-secondary p-2">
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

function DataSourceCard({ account }: { account: import("@/lib/types").ScoredAccount }) {
  const isIQ = (account.dataSource ?? "active_iq") === "active_iq";
  const ts = account.sourceTimestamp ? new Date(account.sourceTimestamp) : null;
  const tsLabel = ts ? ts.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
  const confidence = isIQ ? "High" : "Partial";
  const confColor = isIQ ? "var(--success)" : "var(--warm)";
  const missing = account.missingFields ?? [];

  return (
    <div className="mt-2 rounded-2xl bg-surface-1 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SourceBadgeInline isIQ={isIQ} />
        <span className="text-muted-foreground">
          {isIQ ? "Last synced" : "Uploaded"} <span className="font-semibold text-foreground">{tsLabel}</span>
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-muted-foreground">Score confidence:</span>
        <span className="font-semibold" style={{ color: confColor }}>{confidence}</span>
      </div>
      {!isIQ && missing.length > 0 && (
        <div className="mt-3 rounded-xl p-2" style={{ backgroundColor: "var(--warm-bg)" }}>
          <div className="font-semibold" style={{ color: "var(--warm)" }}>
            {missing.length} field{missing.length === 1 ? "" : "s"} missing
          </div>
          <div className="mt-1 text-foreground/80">{missing.join(", ")}</div>
          <div className="mt-1 text-muted-foreground">Fill these in to improve score accuracy.</div>
        </div>
      )}
    </div>
  );
}

function SourceBadgeInline({ isIQ }: { isIQ: boolean }) {
  const Icon = isIQ ? RefreshCw : Upload;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{
        backgroundColor: isIQ
          ? "color-mix(in oklab, var(--primary) 12%, transparent)"
          : "color-mix(in oklab, var(--success) 14%, transparent)",
        color: isIQ ? "var(--on-primary-container)" : "var(--success)",
      }}
    >
      <Icon className="h-3 w-3" />
      {isIQ ? "Active IQ" : "Excel Import"}
    </span>
  );
}

void CATEGORY_META;
