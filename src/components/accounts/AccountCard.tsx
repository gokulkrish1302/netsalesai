import type { ScoredAccount } from "@/lib/types";
import { useApp } from "@/state/AppStore";
import { ScoreBar } from "@/components/common/ScoreBar";
import { CategoryPill } from "@/components/common/CategoryPill";
import { ScoreBadge } from "@/components/common/ScoreBadge";
import { RenewalCountdown } from "@/components/common/RenewalCountdown";
import { CompetitiveRiskBadge } from "@/components/common/CompetitiveRiskBadge";
import { PipelineStageSelect } from "./PipelineStageSelect";
import { Button } from "@/components/ui/button";
import { Mail, ClipboardList, StickyNote } from "lucide-react";
import { formatCurrencyShort, formatPct } from "@/lib/format";
import { useModals } from "@/components/modals/ModalsProvider";

export function AccountCard({ account }: { account: ScoredAccount }) {
  const { openAccount } = useApp();
  const modals = useModals();
  const competitiveRisk = account.endOfLife && account.cloudStatus === "none";

  return (
    <div className="app-card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <button
            onClick={() => openAccount(account.id)}
            className="text-left text-base font-semibold hover:underline"
          >
            {account.accountName}
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded bg-accent px-1.5 py-0.5 font-medium">{account.industry}</span>
            <span>·</span>
            <span>{account.region}</span>
            <CategoryPill category={account.category} className="ml-1" />
          </div>
        </div>
        <ScoreBadge score={account.score} category={account.category} />
      </div>

      <ScoreBar value={account.score} category={account.category} />

      <div className="grid grid-cols-3 gap-3 text-xs">
        <Stat label="Device Age" value={`${account.deviceAgeYears.toFixed(1)} yrs`} />
        <Stat label="Utilization" value={formatPct(account.utilizationPct)} />
        <Stat label="Budget" value={formatCurrencyShort(account.itBudgetUSD)} />
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
        <Button size="sm" variant="outline" onClick={() => modals.openEmail(account)}>
          <Mail className="mr-1 h-3.5 w-3.5" /> Draft Email
        </Button>
        <Button size="sm" variant="outline" onClick={() => modals.openPlan(account)}>
          <ClipboardList className="mr-1 h-3.5 w-3.5" /> View Plan
        </Button>
        <Button size="sm" variant="outline" onClick={() => openAccount(account.id)}>
          <StickyNote className="mr-1 h-3.5 w-3.5" /> Add Note
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-semibold text-foreground">{value}</div>
    </div>
  );
}
