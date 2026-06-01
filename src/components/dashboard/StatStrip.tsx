import { useApp } from "@/state/AppStore";
import { formatCurrencyShort } from "@/lib/format";
import { Users, Flame, TrendingUp, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function StatStrip() {
  const { scoredAccounts } = useApp();
  const total = scoredAccounts.length;
  const hot = scoredAccounts.filter((a) => a.category === "HOT").length;
  const pipeline = scoredAccounts.reduce((s, a) => s + a.itBudgetUSD, 0);
  const avg = Math.round((scoredAccounts.reduce((s, a) => s + a.score, 0) / total) * 10) / 10;

  const stats: { label: string; value: string; icon: LucideIcon; tint: string; iconColor: string; live?: boolean }[] = [
    {
      label: "Accounts",
      value: String(total),
      icon: Users,
      tint: "var(--primary-container)",
      iconColor: "var(--on-primary-container)",
    },
    {
      label: "Hot Leads",
      value: String(hot),
      icon: Flame,
      tint: "var(--hot-bg)",
      iconColor: "var(--hot)",
      live: true,
    },
    {
      label: "Pipeline Value",
      value: formatCurrencyShort(pipeline),
      icon: TrendingUp,
      tint: "var(--warm-bg)",
      iconColor: "var(--warm)",
    },
    {
      label: "Avg Score",
      value: avg.toFixed(1),
      icon: Target,
      tint: "var(--cold-bg)",
      iconColor: "var(--cold)",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="app-card flex items-center gap-4 p-4">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: s.tint }}
            >
              <Icon className="h-5 w-5" style={{ color: s.iconColor }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">{s.label}</span>
                {s.live && (
                  <span
                    className="pulse-dot inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: s.iconColor }}
                  />
                )}
              </div>
              <div className="display mt-0.5 text-[26px] leading-tight">{s.value}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
