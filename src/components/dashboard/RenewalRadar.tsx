import { useApp } from "@/state/AppStore";
import { useModals } from "@/components/modals/ModalsProvider";
import { Link } from "@tanstack/react-router";
import { Mail, Bell } from "lucide-react";

import type { ScoredAccount } from "@/lib/types";

export function RenewalRadar({ accounts }: { accounts?: ScoredAccount[] } = {}) {
  const { scoredAccounts: all, openAccount } = useApp();
  const scoredAccounts = accounts ?? all;
  const modals = useModals();
  const upcoming = [...scoredAccounts]
    .sort((a, b) => a.contractRenewalDays - b.contractRenewalDays)
    .slice(0, 5);
  const urgentCount = scoredAccounts.filter((a) => a.contractRenewalDays <= 60).length;

  return (
    <div className="app-card flex flex-col p-5">
      <div className="mb-4 flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--hot-bg)" }}
        >
          <Bell className="h-3.5 w-3.5" style={{ color: "var(--hot)" }} />
        </div>
        <h3 className="display flex-1 text-base">Renewal radar</h3>
        <span
          className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
          style={{ backgroundColor: "var(--hot)" }}
        >
          {urgentCount}
        </span>
      </div>

      <div className="flex-1 space-y-1">
        {upcoming.map((a) => {
          const pct = Math.min(100, Math.max(0, ((180 - a.contractRenewalDays) / 180) * 100));
          const barColor =
            a.contractRenewalDays < 60
              ? "var(--hot)"
              : a.contractRenewalDays < 90
                ? "var(--warm)"
                : "var(--primary)";
          return (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-1"
            >
              <button
                onClick={() => openAccount(a.id)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="truncate text-sm font-medium hover:text-primary">{truncate(a.accountName, 20)}</div>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                  />
                </div>
              </button>
              <span className="w-12 text-right text-xs font-bold tabular-nums">{a.contractRenewalDays}d</span>
              <button
                onClick={() => modals.openEmail(a)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Draft email"
              >
                <Mail className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <Link
        to="/renewals"
        className="pill mt-3 inline-flex items-center justify-center self-start px-3 py-1.5 text-[12px] font-medium text-primary hover:bg-primary-container"
      >
        View all renewals →
      </Link>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
