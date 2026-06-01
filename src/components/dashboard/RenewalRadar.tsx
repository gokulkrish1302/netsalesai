import { useApp } from "@/state/AppStore";
import { useModals } from "@/components/modals/ModalsProvider";
import { Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";

export function RenewalRadar() {
  const { scoredAccounts, openAccount } = useApp();
  const modals = useModals();
  const upcoming = [...scoredAccounts]
    .sort((a, b) => a.contractRenewalDays - b.contractRenewalDays)
    .slice(0, 5);

  return (
    <div className="app-card flex flex-col p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="label-eyebrow">Renewal Alerts</span>
        <span
          className="inline-flex h-4 min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
          style={{ backgroundColor: "var(--hot)" }}
        >
          {scoredAccounts.filter((a) => a.contractRenewalDays <= 60).length}
        </span>
      </div>

      <div className="flex-1 divide-y">
        {upcoming.map((a) => {
          const pct = Math.min(100, Math.max(0, ((180 - a.contractRenewalDays) / 180) * 100));
          const barColor =
            a.contractRenewalDays < 60
              ? "var(--hot)"
              : a.contractRenewalDays < 90
                ? "var(--warm)"
                : "var(--primary)";
          return (
            <div key={a.id} className="flex items-center gap-3 py-2.5">
              <button
                onClick={() => openAccount(a.id)}
                className="min-w-0 flex-1 text-left hover:text-primary"
              >
                <div className="truncate text-sm font-medium">{truncate(a.accountName, 18)}</div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                  />
                </div>
              </button>
              <span className="w-12 text-right text-xs font-bold tabular-nums">{a.contractRenewalDays}d</span>
              <button
                onClick={() => modals.openEmail(a)}
                className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
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
        className="mt-3 inline-flex items-center text-[12px] font-medium text-primary hover:underline"
      >
        View all renewal alerts →
      </Link>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
