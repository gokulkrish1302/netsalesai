import { useApp } from "@/state/AppStore";
import { ScoreBadge } from "@/components/common/ScoreBadge";
import { CategoryPill } from "@/components/common/CategoryPill";
import { Button } from "@/components/ui/button";
import { Mail, ClipboardList, Phone } from "lucide-react";
import { useModals } from "@/components/modals/ModalsProvider";
import { formatPct } from "@/lib/format";

export function FocusCard() {
  const { scoredAccounts } = useApp();
  const modals = useModals();
  const top = [...scoredAccounts].sort((a, b) => b.score - a.score)[0];
  if (!top) return null;
  return (
    <div className="app-card p-6">
      <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        🎯 Your #1 Priority This Week
      </div>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <ScoreBadge score={top.score} category={top.category} size="lg" />
        <div className="flex-1">
          <h2 className="text-xl font-bold">{top.accountName}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <CategoryPill category={top.category} />
            <span>·</span>
            <span>
              Renewal in <strong className="text-foreground">{top.contractRenewalDays} days</strong>
            </span>
            <span>·</span>
            <span>
              Storage at <strong className="text-foreground">{formatPct(top.utilizationPct)}</strong>
            </span>
          </div>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={() => modals.openEmail(top)}>
          <Mail className="mr-2 h-4 w-4" /> Draft Outreach Email
        </Button>
        <Button variant="outline" onClick={() => modals.openPlan(top)}>
          <ClipboardList className="mr-2 h-4 w-4" /> View Action Plan
        </Button>
        <Button variant="outline" onClick={() => modals.openCall(top)}>
          <Phone className="mr-2 h-4 w-4" /> Log a Call
        </Button>
      </div>
    </div>
  );
}
