import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Urgency, ScoredAccount } from "@/lib/types";
import { URGENCY_LABEL } from "@/lib/actionPlans";

export function UrgencyModal({
  account,
  open,
  onOpenChange,
  onConfirm,
}: {
  account: ScoredAccount | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (urgency: Urgency) => void;
}) {
  const [urgency, setUrgency] = useState<Urgency>("this_month");
  if (!account) return null;

  const options: { value: Urgency; hint: string }[] = [
    { value: "this_week", hint: "Day 1 · 2 · 4 · 7" },
    { value: "this_month", hint: "Day 1 · 3 · 7 · 14" },
    { value: "this_quarter", hint: "Day 1 · 7 · 21 · 45" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>How urgent is {account.accountName}?</DialogTitle>
          <DialogDescription>
            We'll calibrate the outreach timeline to match.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {options.map((o) => {
            const selected = urgency === o.value;
            return (
              <button
                key={o.value}
                onClick={() => setUrgency(o.value)}
                className={cn(
                  "flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all",
                  selected
                    ? "border-transparent shadow-sm"
                    : "border-border bg-card hover:border-foreground/20",
                )}
                style={
                  selected
                    ? { backgroundColor: "var(--primary-container)", color: "var(--on-primary-container)" }
                    : undefined
                }
              >
                <div>
                  <div className="text-sm font-semibold">{URGENCY_LABEL[o.value]}</div>
                  <div className="text-xs opacity-80">{o.hint}</div>
                </div>
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border-2",
                    selected ? "border-current" : "border-border",
                  )}
                >
                  {selected && <span className="h-2.5 w-2.5 rounded-full bg-current" />}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(urgency)}>Create Action Plan</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
