import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/state/AppStore";
import { CategoryPill } from "@/components/common/CategoryPill";
import { Button } from "@/components/ui/button";
import { Mail, Phone } from "lucide-react";
import { useModals } from "@/components/modals/ModalsProvider";
import { formatDate } from "@/lib/format";
import type { ScoredAccount } from "@/lib/types";

export const Route = createFileRoute("/renewals")({
  head: () => ({
    meta: [
      { title: "Renewal Alerts — NetApp Cloud Migration Agent" },
      {
        name: "description",
        content: "Accounts with contracts renewing in the next 180 days, grouped by urgency.",
      },
    ],
  }),
  component: RenewalsPage,
});

function RenewalsPage() {
  const { scoredAccounts } = useApp();
  const accounts = scoredAccounts.filter((a) => a.contractRenewalDays <= 180);
  const critical = accounts.filter((a) => a.contractRenewalDays <= 30);
  const urgent = accounts.filter((a) => a.contractRenewalDays > 30 && a.contractRenewalDays <= 60);
  const watch = accounts.filter((a) => a.contractRenewalDays > 60 && a.contractRenewalDays <= 180);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contract Renewal Tracker</h1>
        <p className="text-sm text-muted-foreground">
          {accounts.length} accounts need attention before their renewal window closes
        </p>
      </div>

      <Group title="🔴 CRITICAL" subtitle="≤ 30 days" color="var(--hot)" items={critical} />
      <Group title="🟠 URGENT" subtitle="31–60 days" color="var(--warning)" items={urgent} />
      <Group title="🟡 WATCH" subtitle="61–180 days" color="var(--warm)" items={watch} />
    </div>
  );
}

function Group({
  title,
  subtitle,
  color,
  items,
}: {
  title: string;
  subtitle: string;
  color: string;
  items: ScoredAccount[];
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color }}>
          {title}
        </h2>
        <span className="text-xs text-muted-foreground">{subtitle} · {items.length} accounts</span>
      </div>
      <div className="app-card divide-y overflow-hidden">
        {items.map((a) => (
          <RenewalRow key={a.id} account={a} />
        ))}
      </div>
    </section>
  );
}

function RenewalRow({ account }: { account: ScoredAccount }) {
  const modals = useModals();
  const { openAccount } = useApp();
  const neverContacted = !account.lastContactDate;
  const pulsing = neverContacted && account.contractRenewalDays <= 60;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {pulsing && (
            <span
              className="pulse-dot inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: "var(--hot)" }}
            />
          )}
          <button onClick={() => openAccount(account.id)} className="font-semibold hover:underline">
            {account.accountName}
          </button>
          <CategoryPill category={account.category} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>
            Score: <span className="font-semibold text-foreground tabular-nums">{account.score}</span>
          </span>
          <span>·</span>
          <span>
            {neverContacted ? (
              <span style={{ color: "var(--hot)" }} className="font-semibold">
                Never contacted
              </span>
            ) : (
              <>Last contact: {formatDate(account.lastContactDate)}</>
            )}
          </span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-lg font-bold tabular-nums" style={{ color: "var(--hot)" }}>
          {account.contractRenewalDays}
        </div>
        <div className="text-[10px] uppercase text-muted-foreground">days left</div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => modals.openEmail(account)}>
          <Mail className="mr-1 h-3.5 w-3.5" /> Email
        </Button>
        <Button size="sm" variant="outline" onClick={() => modals.openCall(account)}>
          <Phone className="mr-1 h-3.5 w-3.5" /> Log Call
        </Button>
      </div>
    </div>
  );
}
