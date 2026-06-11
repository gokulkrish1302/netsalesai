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
import { supabase } from "@/integrations/supabase/client";

export function PipelineStageSelect({ accountId }: { accountId: string }) {
  const { state, setStage } = useApp();
  const current = state.pipelineStages[accountId] ?? "not_contacted";
  const [flash, setFlash] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(false), 700);
    return () => clearTimeout(t);
  }, [flash]);

  const handleChange = async (v: string) => {
    const stage = v as PipelineStage;
    setStage(accountId, stage);
    setFlash(true);
    setSaving(true);
    const { error } = await supabase
      .from("accounts")
      .update({ status: stage, pipeline_stage: stage })
      .eq("id", accountId);
    setSaving(false);
    if (error) {
      toast.error(`Could not save stage: ${error.message}`);
      return;
    }
    toast.success(`Stage updated → ${STAGE_LABEL[stage]}`);
  };

  return (
    <Select value={current} onValueChange={handleChange} disabled={saving}>
      <SelectTrigger className={cn("h-8 w-full cursor-pointer text-xs", flash && "flash-success")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STAGE_ORDER.map((s) => (
          <SelectItem key={s} value={s} className="cursor-pointer">
            {STAGE_LABEL[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
