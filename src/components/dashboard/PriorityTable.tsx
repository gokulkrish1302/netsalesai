import { useApp } from "@/state/AppStore";
import { ScorePill } from "@/components/common/ScoreBadge";
import { CategoryPill } from "@/components/common/CategoryPill";
import { RenewalCountdown } from "@/components/common/RenewalCountdown";
import { Button } from "@/components/ui/button";
import { Mail, ClipboardList, Check } from "lucide-react";
import { useModals } from "@/components/modals/ModalsProvider";
import { STAGE_LABEL } from "@/lib/format";

export function PriorityTable() {
  const { scoredAccounts, openAccount, state } = useApp();
  const modals = useModals();
  const top = [...scoredAccounts].sort((a, b) => b.score - a.score).slice(0, 10);

  return (
    <div className="app-card overflow-hidden">
      <div className="border-b p-5">
        <h3 className="text-sm font-semibold">Top 10 Priority Accounts</h3>
        <p className="text-xs text-muted-foreground">Ranked by composite score</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">#</th>
              <th className="px-4 py-2 text-left">Account</th>
              <th className="px-4 py-2 text-left">Score</th>
              <th className="px-4 py-2 text-left">Category</th>
              <th className="px-4 py-2 text-left">Renewal</th>
              <th className="px-4 py-2 text-left">Stage</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {top.map((a, i) => {
              const stage = state.pipelineStages[a.id] ?? a.pipelineStage;
              return (
                <tr key={a.id} className="border-t">
                  <td className="px-4 py-3 font-semibold tabular-nums">{i + 1}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openAccount(a.id)} className="font-medium hover:underline">
                      {a.accountName}
                    </button>
                    <div className="text-xs text-muted-foreground">
                      {a.industry} · {a.region}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ScorePill score={a.score} category={a.category} />
                  </td>
                  <td className="px-4 py-3">
                    <CategoryPill category={a.category} />
                  </td>
                  <td className="px-4 py-3">
                    <RenewalCountdown days={a.contractRenewalDays} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{STAGE_LABEL[stage]}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => modals.openEmail(a)} title="Email">
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => modals.openPlan(a)} title="Plan">
                        <ClipboardList className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => modals.openCall(a)} title="Log Call">
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
