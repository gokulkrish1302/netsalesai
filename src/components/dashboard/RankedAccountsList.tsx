import { useMemo, useState } from "react";
import type { ScoredAccount } from "@/lib/types";
import { useApp } from "@/state/AppStore";
import { CategoryPill } from "@/components/common/CategoryPill";
import { SourceBadge } from "@/components/common/SourceBadge";

interface Props {
  accounts?: ScoredAccount[];
  onSelect?: (id: string) => void;
  selectedId?: string | null;
}

export function RankedAccountsList({ accounts, onSelect, selectedId }: Props) {
  const { scoredAccounts, openAccount } = useApp();
  const source = accounts ?? scoredAccounts;
  const ranked = useMemo(() => [...source].sort((a, b) => b.score - a.score), [source]);

  const handle = (id: string) => {
    if (onSelect) onSelect(id);
    else openAccount(id);
  };

  return (
    <div className="app-card flex h-[520px] flex-col p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Ranked Accounts</h3>
        <span className="text-xs text-muted-foreground">{ranked.length} active</span>
      </div>
      <div className="-mr-2 flex-1 space-y-2 overflow-y-auto pr-2">
        {ranked.map((a) => {
          const active = a.id === selectedId;
          return (
            <button
              key={a.id}
              onClick={() => handle(a.id)}
              className={`w-full rounded-xl border bg-card p-3 text-left transition hover:border-primary/50 hover:shadow-sm ${
                active ? "border-primary ring-2 ring-primary/20" : "border-border"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold tabular-nums"
                  style={{ borderColor: "var(--border)" }}
                >
                  {a.score}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{a.accountName}</span>
                    <SourceBadge source={a.dataSource} size="xs" />
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{a.utilizationPct}%</span>
                    <span>·</span>
                    <span>{a.deviceAgeYears.toFixed(1)}y</span>
                    <CategoryPill category={a.category} className="ml-1 !px-1.5 !py-0 !text-[9px]" />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
        {ranked.length === 0 && (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No accounts match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}
