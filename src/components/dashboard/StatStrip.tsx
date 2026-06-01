import { useApp } from "@/state/AppStore";
import { formatCurrencyShort } from "@/lib/format";

export function StatStrip() {
  const { scoredAccounts } = useApp();
  const total = scoredAccounts.length;
  const hot = scoredAccounts.filter((a) => a.category === "HOT").length;
  const pipeline = scoredAccounts.reduce((s, a) => s + a.itBudgetUSD, 0);
  const avg = Math.round((scoredAccounts.reduce((s, a) => s + a.score, 0) / total) * 10) / 10;

  const stats: { label: string; value: string; live?: boolean; color?: string }[] = [
    { label: "Accounts", value: String(total) },
    { label: "Hot Leads", value: String(hot), live: true, color: "var(--hot)" },
    { label: "Pipeline Value", value: formatCurrencyShort(pipeline) },
    { label: "Avg Score", value: avg.toFixed(1) },
  ];

  return (
    <div className="grid grid-cols-2 gap-px border-b bg-border md:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col gap-1 bg-background px-4 py-5 md:px-6">
          <div className="flex items-center gap-1.5">
            <span className="label-eyebrow">{s.label}</span>
            {s.live && (
              <span
                className="pulse-dot inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: s.color }}
              />
            )}
          </div>
          <div className="kpi-num text-[36px]" style={{ color: s.color ?? "var(--foreground)" }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}
