import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Stakeholder = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  email: z.string(),
});
const SharedFile = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
});

const GetInput = z.object({ accountId: z.string().uuid() });
const SaveInput = z.object({
  accountId: z.string().uuid(),
  stakeholders: z.array(Stakeholder),
  files: z.array(SharedFile),
});

export type Stakeholder = z.infer<typeof Stakeholder>;
export type SharedFile = z.infer<typeof SharedFile>;

export const getPlanExtras = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GetInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("account_action_plans")
      .select("stakeholders, files")
      .eq("account_id", data.accountId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      stakeholders: (row?.stakeholders as Stakeholder[] | null) ?? [],
      files: (row?.files as SharedFile[] | null) ?? [],
    };
  });

export const savePlanExtras = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("account_action_plans")
      .update({
        stakeholders: data.stakeholders,
        files: data.files,
        updated_at: new Date().toISOString(),
      })
      .eq("account_id", data.accountId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
