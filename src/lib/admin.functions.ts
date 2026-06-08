import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Admin access required");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: reps, error: rerr }, { data: roles, error: rrerr }] = await Promise.all([
      supabaseAdmin.from("reps").select("id, email, name, region, created_at"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    if (rerr) throw new Error(rerr.message);
    if (rrerr) throw new Error(rrerr.message);

    const roleMap = new Map<string, Set<string>>();
    for (const r of roles ?? []) {
      const s = roleMap.get(r.user_id) ?? new Set<string>();
      s.add(r.role);
      roleMap.set(r.user_id, s);
    }
    return {
      users: (reps ?? []).map((r) => ({
        ...r,
        isAdmin: roleMap.get(r.id)?.has("admin") ?? false,
      })),
    };
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    email: string;
    password: string;
    name: string;
    region: string;
    isAdmin: boolean;
  }) => {
    if (!data.email || !data.password || !data.name) throw new Error("Missing fields");
    if (data.password.length < 6) throw new Error("Password must be at least 6 characters");
    return data;
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name, region: data.region },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed to create user");

    const newId = created.user.id;
    const { error: repErr } = await supabaseAdmin
      .from("reps")
      .insert({ id: newId, email: data.email, name: data.name, region: data.region || "—" });
    if (repErr) {
      await supabaseAdmin.auth.admin.deleteUser(newId);
      throw new Error(repErr.message);
    }
    if (data.isAdmin) {
      await supabaseAdmin.from("user_roles").insert({ user_id: newId, role: "admin" });
    }
    return { ok: true, id: newId };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    if (data.userId === userId) throw new Error("You cannot remove your own account");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; isAdmin: boolean }) => data)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as any;
    await assertAdmin(supabase, userId);
    if (data.userId === userId && !data.isAdmin) {
      throw new Error("You cannot remove your own admin role");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.isAdmin) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.userId, role: "admin" });
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
