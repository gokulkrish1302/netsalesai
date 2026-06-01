import { useApp } from "@/state/AppStore";
import { formatCurrencyShort } from "@/lib/format";

export function KpiRow() {
  const { scoredAccounts } = useApp();
  const total = scoredAccounts.length;
  const hot = scoredAccounts.filter((a) => a.category === "HOT").length;
  const pipelineValue = scoredAccounts
    .filter((a) => a.category === "HOT" || a.category === "WARM")
    .reduce((s, a) => s + a.itBudgetUSD, 0);
  const avg =
    Math.round((scoredAccounts.reduce((s, a) => s + a.score, 0) / total) * 10) / 10;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Kpi title="Total Accounts" value={String(total)} subtitle="Active IQ connected" />
      <Kpi
        title="HOT Leads"
        value={String(hot)}
        subtitle="Immediate outreach"
        dotColor="var(--hot)"
      />
      <Kpi
        title="Pipeline Value"
        value={formatCurrencyShort(pipelineValue)}
        subtitle="HOT + WARM accounts"
      />
      <Kpi title="Avg Score" value={String(avg)} subtitle="This week" />
    </div>
  );
}

function Kpi({
  title,
  value,
  subtitle,
  dotColor,
}: {
  title: string;
  value: string;
  subtitle: string;
  dotColor?: string;
}) {
  return (
    <div className="app-card p-5">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {dotColor && (
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} />
        )}
        {title}
      </div>
      <div className="mt-2 text-3xl font-bold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
    </div>
  );
}
