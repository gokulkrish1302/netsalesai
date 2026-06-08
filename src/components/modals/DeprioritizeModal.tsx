import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowDown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { ScoredAccount } from "@/lib/types";
import { useApp } from "@/state/AppStore";
import { suggestDeprioritization } from "@/lib/deprioritize";
import { CATEGORY_META } from "@/lib/scoring";

export function DeprioritizeModal({
  account,
  open,
  onOpenChange,
}: {
  account: ScoredAccount | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { deprioritize, undoDeprioritize } = useApp();
  const [reason, setReason] = useState("");

  function close() {
    onOpenChange(false);
    setTimeout(() => setReason(""), 200);
  }

  function confirm() {
    if (!account) return;
    const suggestion = suggestDeprioritization(reason);
    const entry = {
      category: suggestion.category,
      reason: reason.trim() || "(no reason given)",
      previousCategory: account.category,
      rationale: suggestion.rationale,
      at: new Date().toISOString(),
    };
    deprioritize(account.id, entry);

    const meta = CATEGORY_META[suggestion.category];
    toast.success(
      `${account.accountName} → ${meta.label}`,
      {
        description: suggestion.rationale,
        duration: 5000,
        action: {
          label: "Undo",
          onClick: () => undoDeprioritize(account.id),
        },
      },
    );
    close();
  }

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-md rounded-3xl p-0" style={{ boxShadow: "var(--elevation-3)" }}>
        <DialogHeader className="px-6 pb-2 pt-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl"
              style={{ backgroundColor: "var(--surface-2)" }}
            >
              <ArrowDown className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <DialogTitle className="display text-lg leading-tight">
                Why are you deprioritizing this account?
              </DialogTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">{account.accountName}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6">
          <div>
            <label className="label-eyebrow">Reason</label>
            <Textarea
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="e.g. signed a 3-year contract, no budget this year, chose a competitor…"
              className="mt-2"
            />
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              AI will use your reason to suggest a new priority.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" className="pill" onClick={close}>
              Cancel
            </Button>
            <Button className="pill px-5" onClick={confirm}>
              Confirm
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
