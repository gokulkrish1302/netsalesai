import { useApp } from "@/state/AppStore";
import { CATEGORY_META } from "@/lib/scoring";
import { Button } from "@/components/ui/button";
import { CategoryPill } from "@/components/common/CategoryPill";
import { useModals } from "@/components/modals/ModalsProvider";
import { Clock, Database, ArrowRight } from "lucide-react";
import { formatPct } from "@/lib/format";

export function TopPriorityCard() {
  const { scoredAccounts, openAccount } = useApp();
  const modals = useModals();
  const top = [...scoredAccounts].sort((a, b) => b.score - a.score)[0];
  if (!top) return null;
  const color = CATEGORY_META[top.category].color;

  return (
    <div className="app-card flex flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="label-eyebrow">#1 Priority</span>
        <button
          onClick={() => openAccount(top.id)}
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          View full profile →
        </button>
      </div>

      <div className="flex items-start gap-4">
        <div className="kpi-num shrink-0 text-[72px] tabular-nums" style={{ color, lineHeight: 0.9 }}>
          {top.score}
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <button
            onClick={() => openAccount(top.id)}
            className="serif block text-left text-[22px] font-normal leading-tight hover:underline"
            style={{ letterSpacing: "-0.01em" }}
          >
            {top.accountName}
          </button>
          <div className="mt-2">
            <CategoryPill category={top.category} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Renews in <span className="font-semibold text-foreground tabular-nums">{top.contractRenewalDays}</span> days
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Database className="h-3.5 w-3.5" />
          Storage <span className="font-semibold text-foreground tabular-nums">{formatPct(top.utilizationPct)}</span>
        </div>
      </div>

      <hr className="my-4 border-t" />

      <div className="flex flex-col gap-2">
        <ActionButton primary onClick={() => modals.openEmail(top)} label="Draft Outreach Email" />
        <ActionButton onClick={() => modals.openPlan(top)} label="View Action Plan" />
        <ActionButton onClick={() => modals.openCall(top)} label="Log a Call" />
      </div>
    </div>
  );
}

function ActionButton({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <Button
      onClick={onClick}
      variant={primary ? "default" : "ghost"}
      className="group h-10 w-full justify-between text-sm font-medium"
    >
      <span>{label}</span>
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </Button>
  );
}
