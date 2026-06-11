import type { ScoredAccount } from "@/lib/types";
import { useApp } from "@/state/AppStore";
import { ScoreBar } from "@/components/common/ScoreBar";
import { CategoryPill } from "@/components/common/CategoryPill";
import { ScoreBadge } from "@/components/common/ScoreBadge";
import { RenewalCountdown } from "@/components/common/RenewalCountdown";
import { CompetitiveRiskBadge } from "@/components/common/CompetitiveRiskBadge";
import { SourceBadge } from "@/components/common/SourceBadge";
import { PipelineStageSelect } from "./PipelineStageSelect";
import { Button } from "@/components/ui/button";
import { Mail, StickyNote, ArrowDown, Target, AlertOctagon } from "lucide-react";
import { formatCurrencyShort, formatDate, formatPct } from "@/lib/format";
import { useModals } from "@/components/modals/ModalsProvider";

export function AccountCard({ account }: { account: ScoredAccount }) {
  const { openAccount } = useApp();
  const modals = useModals();
  const competitiveRisk = account.endOfLife && account.cloudStatus === "none";

  return (
    <div className="app-card group relative flex flex-col gap-4 p-5">
      <button
        onClick={(e) => {
          e.stopPropagation();
          modals.openDeprioritize(account);
        }}
        className="absolute right-3 top-3 z-10 hidden h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground group-hover:flex focus-visible:flex"
        aria-label="Deprioritize this account"
        title="Deprioritize"
      >
        <ArrowDown className="h-4 w-4" />
      </button>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <button
            onClick={() => openAccount(account.id)}
            className="cursor-pointer text-left text-base font-semibold hover:underline"
          >
            {account.accountName}
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded bg-accent px-1.5 py-0.5 font-medium">{account.industry}</span>
            <span>·</span>
            <span>{account.region}</span>
            <CategoryPill category={account.category} className="ml-1" />
            <SourceBadge source={account.dataSource} size="xs" />
            {account.endOfLife && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: "var(--hot-bg)", color: "var(--hot)" }}
              >
                <AlertOctagon className="h-2.5 w-2.5" /> EOL
              </span>
            )}
          </div>
        </div>
        <ScoreBadge score={account.score} category={account.category} />
      </div>

      <ScoreBar value={account.score} category={account.category} />

      <div className="grid grid-cols-3 gap-3 text-xs">
        <Stat label="Device Age" value={`${account.deviceAgeYears.toFixed(1)} yrs`} />
        <Stat label="Utilization" value={formatPct(account.utilizationPct)} />
        <Stat label="IT Budget" value={formatCurrencyShort(account.itBudgetUSD)} />
        <Stat label="Storage" value={account.storageCapacityTB ? `${account.storageCapacityTB} TB` : "—"} />
        <Stat label="Annual Rev" value={account.annualRevenue ? formatCurrencyShort(account.annualRevenue) : "—"} />
        <Stat label="Company Size" value={account.companySize || "—"} />
        <Stat label="Device Model" value={account.deviceModel || "—"} />
        <Stat label="Sales Rep" value={account.salesRep || "—"} />
        <Stat label="Last Contact" value={formatDate(account.lastContactDate)} />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Renews in</span>
        <RenewalCountdown days={account.contractRenewalDays} />
      </div>

      {competitiveRisk && <CompetitiveRiskBadge />}

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Pipeline Stage</label>
        <PipelineStageSelect accountId={account.id} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          className="cursor-pointer"
          onClick={() => modals.startCreatePlan(account)}
          style={{ backgroundColor: "var(--primary)", color: "white" }}
        >
          <Target className="mr-1 h-3.5 w-3.5" /> Create Action Plan
        </Button>
        <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => modals.openEmail(account)}>
          <Mail className="mr-1 h-3.5 w-3.5" /> Draft Email
        </Button>
        <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => openAccount(account.id)}>
          <StickyNote className="mr-1 h-3.5 w-3.5" /> Add Note
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-muted-foreground">{label}</div>
      <div className="truncate font-semibold text-foreground">{value}</div>
    </div>
  );
}
