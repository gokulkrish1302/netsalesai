import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import type { ScoredAccount } from "@/lib/types";
import { useApp } from "@/state/AppStore";
import { SourceBadge } from "@/components/common/SourceBadge";
import { Button } from "@/components/ui/button";

interface Props {
  accounts?: ScoredAccount[];
  onSelect?: (id: string) => void;
  selectedId?: string | null;
  limit?: number;
}

const CATEGORY_STYLE: Record<string, { label: string; bg: string; fg: string }> = {
  HOT: { label: "HOT", bg: "var(--hot-bg)", fg: "var(--hot)" },
  WARM: { label: "WARM", bg: "var(--warm-bg)", fg: "var(--warm)" },
  COLD: { label: "COLD", bg: "var(--cold-bg)", fg: "var(--cold)" },
  NOT_READY: { label: "NOT READY", bg: "var(--muted)", fg: "var(--muted-foreground)" },
};

function topReason(a: ScoredAccount): string {
  const entries = Object.entries(a.breakdown) as [keyof typeof a.breakdown, number][];
  const [topKey] = entries.sort((x, y) => y[1] - x[1])[0] ?? [];
  if (!topKey) return "Composite priority score";
  return a.reasons?.[topKey] ?? "Composite priority score";
}

function renewalLabel(days: number): { text: string; tone: string } {
  if (days <= 0) return { text: "Overdue", tone: "var(--hot)" };
  if (days <= 30) return { text: `${days}d to renewal`, tone: "var(--hot)" };
  if (days <= 60) return { text: `${days}d to renewal`, tone: "var(--warm)" };
  if (days <= 90) return { text: `${days}d to renewal`, tone: "var(--warm)" };
  return { text: `${days}d to renewal`, tone: "var(--muted-foreground)" };
}

export function RankedAccountsList({ accounts, onSelect, selectedId, limit = 10 }: Props) {
  const { scoredAccounts, openAccount } = useApp();
  const source = accounts ?? scoredAccounts;
  const ranked = useMemo(
    () => [...source].sort((a, b) => b.score - a.score).slice(0, limit),
    [source, limit],
  );

  const handle = (id: string) => {
    if (onSelect) onSelect(id);
    else openAccount(id);
  };

  return (
    <div data-tour="ranked-list" className="app-card flex flex-col p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Top {limit} Priority Accounts</h3>
          <p className="text-xs text-muted-foreground">
            Ranked by composite score · {source.length} total
          </p>
        </div>
      </div>

      {ranked.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No accounts match the current filters.
        </div>
      ) : (
        <ol className="space-y-2">
          {ranked.map((a, idx) => {
            const cat = CATEGORY_STYLE[a.category];
            const renewal = renewalLabel(a.contractRenewalDays);
            const isSelected = a.id === selectedId;
            const reason = topReason(a);
            return (
              <li
                key={a.id}
                className={`group flex flex-col gap-3 rounded-xl border bg-card p-4 transition cursor-pointer hover:border-primary/50 hover:shadow-sm md:flex-row md:items-center ${
                  isSelected ? "border-primary ring-2 ring-primary/20" : "border-border"
                }`}
                onClick={() => openAccount(a.id)}
              >
                {/* Rank + score ring */}
                <div className="flex shrink-0 items-center gap-3">
                  <span className="w-5 text-center text-xs font-semibold text-muted-foreground tabular-nums">
                    {idx + 1}
                  </span>
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[3px] text-sm font-bold tabular-nums"
                    style={{ borderColor: cat.fg, color: cat.fg }}
                    aria-label={`Score ${a.score}`}
                  >
                    {a.score}
                  </div>
                </div>

                {/* Main */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold">{a.accountName}</span>
                    <SourceBadge source={a.dataSource} size="xs" />
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide"
                      style={{ backgroundColor: cat.bg, color: cat.fg }}
                    >
                      {cat.label}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{reason}</p>

                  {/* Utilization bar + metrics */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums">{Math.round(a.utilizationPct)}% util</span>
                      <div
                        className="h-1.5 w-24 overflow-hidden rounded-full"
                        style={{ backgroundColor: "var(--muted)" }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(0, Math.min(100, a.utilizationPct))}%`,
                            backgroundColor:
                              a.utilizationPct >= 85
                                ? "var(--hot)"
                                : a.utilizationPct >= 70
                                  ? "var(--warm)"
                                  : "var(--primary)",
                          }}
                        />
                      </div>
                    </div>
                    <span className="tabular-nums">{a.deviceAgeYears.toFixed(1)}y device</span>
                    <span className="tabular-nums" style={{ color: renewal.tone }}>
                      {renewal.text}
                    </span>
                  </div>
                </div>

                {/* Action */}
                <div className="shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handle(a.id);
                    }}
                  >
                    Open <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
