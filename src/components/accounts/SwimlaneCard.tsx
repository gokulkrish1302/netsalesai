import type { ScoredAccount } from "@/lib/types";
import { useApp } from "@/state/AppStore";
import { useModals } from "@/components/modals/ModalsProvider";
import { CATEGORY_META } from "@/lib/scoring";
import { formatCurrencyShort, formatPct } from "@/lib/format";
import { Mail, ClipboardList, Phone, GripVertical } from "lucide-react";

export function SwimlaneCard({
  account,
  overridden,
  onDragStart,
}: {
  account: ScoredAccount;
  overridden?: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
}) {
  const { openAccount } = useApp();
  const modals = useModals();
  const color = CATEGORY_META[account.category].color;
  const urgent = account.contractRenewalDays <= 60;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, account.id)}
      onClick={() => openAccount(account.id)}
      className="group relative cursor-pointer rounded-2xl bg-card p-3 transition-shadow hover:shadow-md"
      style={{ boxShadow: "var(--elevation-1)" }}
    >
      <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>
      <div className="flex items-start justify-between gap-2 pl-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium leading-tight">{account.accountName}</div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            {account.industry} · {account.region}
          </div>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-white"
          style={{ backgroundColor: color }}
        >
          {account.score}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-1.5 pl-3 text-[11px] text-muted-foreground">
        <span>{account.deviceAgeYears.toFixed(1)}y</span>
        <span className="opacity-50">•</span>
        <span>{formatPct(account.utilizationPct)}</span>
        <span className="opacity-50">•</span>
        <span>{formatCurrencyShort(account.itBudgetUSD)}</span>
      </div>

      <div className="mt-1.5 flex items-center justify-between pl-3">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums"
          style={{
            backgroundColor: urgent ? "var(--hot-bg)" : "var(--surface-2)",
            color: urgent ? "var(--hot)" : "var(--muted-foreground)",
          }}
        >
          {account.contractRenewalDays}d to renewal
        </span>
        {overridden && (
          <span
            className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
            style={{ backgroundColor: "var(--primary-container)", color: "var(--on-primary-container)" }}
          >
            Manual
          </span>
        )}
      </div>

      <div className="mt-2 flex gap-1 pl-3 opacity-0 transition-opacity group-hover:opacity-100">
        <IconBtn label="Email" onClick={(e) => { e.stopPropagation(); modals.openEmail(account); }}>
          <Mail className="h-3 w-3" />
        </IconBtn>
        <IconBtn label="Plan" onClick={(e) => { e.stopPropagation(); modals.openPlan(account); }}>
          <ClipboardList className="h-3 w-3" />
        </IconBtn>
        <IconBtn label="Log" onClick={(e) => { e.stopPropagation(); modals.openCall(account); }}>
          <Phone className="h-3 w-3" />
        </IconBtn>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, label }: { children: React.ReactNode; onClick: (e: React.MouseEvent) => void; label: string }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}
