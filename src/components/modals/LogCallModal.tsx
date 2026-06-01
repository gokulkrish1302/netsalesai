import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ScoredAccount } from "@/lib/types";
import { useApp } from "@/state/AppStore";

const DURATIONS = ["15 min", "30 min", "45 min", "60 min"];
const OUTCOMES = [
  "Left voicemail",
  "Had conversation",
  "Demo scheduled",
  "No answer",
  "Sent follow-up email",
];
const NEXT_ACTIONS = [
  "Follow up in 1 week",
  "Schedule demo",
  "Send proposal",
  "Escalate to manager",
  "No next action",
];

export function LogCallModal({
  account,
  open,
  onOpenChange,
}: {
  account: ScoredAccount | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { addCallLog } = useApp();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [duration, setDuration] = useState("30 min");
  const [outcome, setOutcome] = useState("Had conversation");
  const [notes, setNotes] = useState("");
  const [nextAction, setNextAction] = useState("Follow up in 1 week");

  useEffect(() => {
    if (open) {
      setDate(today);
      setDuration("30 min");
      setOutcome("Had conversation");
      setNotes("");
      setNextAction("Follow up in 1 week");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!account) return null;

  function save() {
    addCallLog({
      id: `call-${Date.now()}`,
      accountId: account!.id,
      date,
      duration,
      outcome,
      notes,
      nextAction,
      createdAt: new Date().toISOString(),
    });
    toast.success(`✅ Call logged for ${account!.accountName}`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log a Call — {account.accountName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Duration">
            <SelectField value={duration} onChange={setDuration} options={DURATIONS} />
          </Field>
          <Field label="Outcome">
            <SelectField value={outcome} onChange={setOutcome} options={OUTCOMES} />
          </Field>
          <Field label="Notes">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="What was discussed..."
            />
          </Field>
          <Field label="Next action">
            <SelectField value={nextAction} onChange={setNextAction} options={NEXT_ACTIONS} />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Save Call Log</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
