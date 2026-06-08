import { useApp } from "@/state/AppStore";
import { CATEGORY_META } from "@/lib/scoring";
import { Button } from "@/components/ui/button";
import { CategoryPill } from "@/components/common/CategoryPill";
import { SourceBadge } from "@/components/common/SourceBadge";
import { useModals } from "@/components/modals/ModalsProvider";
import { Clock, Database, ArrowRight, Sparkles } from "lucide-react";
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
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--on-primary-container)" }} />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Today's #1 Priority
          </span>
        </div>
        <button
          onClick={() => openAccount(top.id)}
          className="text-[11px] font-medium text-primary hover:underline"
        >
          Full profile →
        </button>
      </div>

      <div className="flex items-start gap-4">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold tabular-nums text-white"
          style={{ backgroundColor: color, fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
        >
          {top.score}
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <button
            onClick={() => openAccount(top.id)}
            className="display block text-left text-lg leading-tight hover:underline"
          >
            {top.accountName}
          </button>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <CategoryPill category={top.category} />
            <SourceBadge source={top.dataSource} size="xs" />
            <span className="text-[11px] text-muted-foreground">{top.industry} · {top.region}</span>
          </div>

        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Micro icon={Clock} label="Renews" value={`${top.contractRenewalDays}d`} />
        <Micro icon={Database} label="Storage" value={formatPct(top.utilizationPct)} />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <ActionButton primary onClick={() => modals.openEmail(top)} label="Draft outreach email" />
        <ActionButton onClick={() => modals.openPlan(top)} label="View action plan" />
        <ActionButton onClick={() => modals.openCall(top)} label="Log a call" />
      </div>
    </div>
  );
}

function Micro({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-surface-1 px-3 py-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function ActionButton({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <Button
      onClick={onClick}
      variant={primary ? "default" : "ghost"}
      className="pill group h-11 w-full justify-between px-4 text-sm font-medium"
    >
      <span>{label}</span>
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </Button>
  );
}
