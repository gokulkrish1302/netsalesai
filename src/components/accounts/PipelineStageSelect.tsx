import { useApp } from "@/state/AppStore";
import type { PipelineStage } from "@/lib/types";
import { STAGE_LABEL, STAGE_ORDER } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function PipelineStageSelect({ accountId }: { accountId: string }) {
  const { state, setStage } = useApp();
  const current = state.pipelineStages[accountId] ?? "not_contacted";
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(false), 700);
    return () => clearTimeout(t);
  }, [flash]);
  return (
    <Select
      value={current}
      onValueChange={(v) => {
        setStage(accountId, v as PipelineStage);
        setFlash(true);
        toast.success(`Stage updated → ${STAGE_LABEL[v]}`);
      }}
    >
      <SelectTrigger className={cn("h-8 w-full text-xs", flash && "flash-success")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STAGE_ORDER.map((s) => (
          <SelectItem key={s} value={s}>
            {STAGE_LABEL[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
