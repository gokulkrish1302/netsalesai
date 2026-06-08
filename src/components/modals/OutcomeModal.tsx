import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ActionPlanStatus } from "@/lib/types";

export function OutcomeModal({
  open,
  onOpenChange,
  status,
  accountName,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  status: "won" | "lost";
  accountName: string;
  onSubmit: (factor: string, status: ActionPlanStatus) => void;
}) {
  const [factor, setFactor] = useState("");
  const isWon = status === "won";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setFactor("");
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isWon ? "🎉 Won" : "Lost"} — {accountName}
          </DialogTitle>
          <DialogDescription>What was the deciding factor?</DialogDescription>
        </DialogHeader>
        <Textarea
          autoFocus
          rows={4}
          value={factor}
          onChange={(e) => setFactor(e.target.value)}
          placeholder={
            isWon
              ? "e.g. Keystone OpEx pricing aligned to their renewal cycle"
              : "e.g. Chose competitor on price"
          }
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!factor.trim()}
            onClick={() => {
              onSubmit(factor.trim(), status);
              setFactor("");
            }}
          >
            Save outcome
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
