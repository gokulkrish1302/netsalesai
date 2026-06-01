import type { ScoredAccount } from "@/lib/types";
import { useApp } from "@/state/AppStore";
import { useModals } from "@/components/modals/ModalsProvider";
import { CATEGORY_META } from "@/lib/scoring";
import { formatCurrencyShort, formatPct } from "@/lib/format";
import { Mail, ClipboardList, Phone } from "lucide-react";

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
      className="group relative cursor-grab rounded-md bg-card p-3 transition-shadow active:cursor-grabbing"
      style={{ boxShadow: "var(--shadow-editorial)", borderLeft: `4px solid ${color}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium leading-tight">{account.accountName}</div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            {account.industry} · {account.region}
          </div>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums text-white"
          style={{ backgroundColor: color }}
        >
          {account.score}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>{account.deviceAgeYears.toFixed(1)}y</span>
        <span>·</span>
        <span>{formatPct(account.utilizationPct)}</span>
        <span>·</span>
        <span>{formatCurrencyShort(account.itBudgetUSD)}</span>
      </div>

      <div className="mt-1.5 flex items-center justify-between">
        <span
          className="text-[11px] font-medium tabular-nums"
          style={{ color: urgent ? "var(--hot)" : "var(--muted-foreground)" }}
        >
          Renews in {account.contractRenewalDays}d
        </span>
        {overridden && (
          <span
            className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
            style={{ backgroundColor: "var(--accent)", color: "var(--primary)" }}
          >
            Override
          </span>
        )}
      </div>

      <div className="mt-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
      className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}
