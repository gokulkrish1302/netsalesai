import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ScoredAccount } from "@/lib/types";
import { useApp } from "@/state/AppStore";
import { ScoreGauge } from "@/components/common/ScoreGauge";
import { SourceBadge } from "@/components/common/SourceBadge";
import { Button } from "@/components/ui/button";
import { formatCurrencyShort } from "@/lib/format";

interface Props {
  accounts?: ScoredAccount[];
  selectedId?: string | null;
}

export function ContextPreview({ accounts, selectedId }: Props) {
  const { scoredAccounts } = useApp();
  const source = accounts ?? scoredAccounts;
  const top = useMemo(() => [...source].sort((a, b) => b.score - a.score)[0] ?? null, [source]);
  const a = useMemo(
    () => source.find((x) => x.id === selectedId) ?? top,
    [source, selectedId, top],
  );

  if (!a) {
    return (
      <div className="app-card flex h-[520px] flex-col items-center justify-center p-5 text-sm text-muted-foreground">
        No account to preview.
      </div>
    );
  }

  const reason =
    a.deviceAgeYears >= 5
      ? `Hardware ${a.deviceAgeYears.toFixed(1)}yrs old — refresh window opening.`
      : a.utilizationPct >= 80
        ? `Storage at ${a.utilizationPct}% — capacity expansion likely.`
        : a.contractRenewalDays <= 90
          ? `Renewal in ${a.contractRenewalDays} days — natural inflection point.`
          : `Stable account — long-cycle nurture recommended.`;

  return (
    <div className="app-card flex h-[520px] flex-col p-5">
      <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Context Preview
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="display truncate text-xl">{a.accountName}</h3>
            <SourceBadge source={a.dataSource} size="xs" />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {a.industry} · {a.region} · Rep {a.salesRep}
          </p>
        </div>
        <ScoreGauge score={a.score} category={a.category} size={92} />
      </div>

      <div
        className="mt-4 rounded-xl p-3"
        style={{ backgroundColor: "var(--primary-container)" }}
      >
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--on-primary-container)" }}>
          <Sparkles className="h-3 w-3" /> AI Reasoning
        </div>
        <p className="text-sm" style={{ color: "var(--on-primary-container)" }}>{reason}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <Cell label="Storage Utilization" value={`${a.utilizationPct}%`} bar={a.utilizationPct} />
        <Cell label="Contract Renewal" value={`${a.contractRenewalDays}`} sub="days remaining" />
        <Cell label="IT Budget" value={formatCurrencyShort(a.itBudgetUSD)} />
        <Cell label="Device Age" value={`${a.deviceAgeYears.toFixed(1)} yrs`} />
      </div>

      <div className="mt-auto pt-4">
        <Button asChild className="w-full">
          <Link to="/action-plans/$accountId" params={{ accountId: a.id }}>
            Launch Action Plan Wizard
          </Link>
        </Button>
      </div>
    </div>
  );
}

function Cell({ label, value, sub, bar }: { label: string; value: string; sub?: string; bar?: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        {bar !== undefined && <span className="text-xs font-semibold tabular-nums">{value}</span>}
      </div>
      {bar !== undefined ? (
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, bar)}%`, background: "var(--warm)" }} />
        </div>
      ) : (
        <div className="display text-2xl leading-tight">{value}</div>
      )}
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
