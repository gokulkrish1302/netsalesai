import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

interface RepProfile {
  id: string;
  email: string;
  name: string;
  region: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  rep: RepProfile | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [rep, setRep] = useState<RepProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) {
        setRep(null);
        setIsAdmin(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadRole = useCallback(async (userId: string) => {
    // Try to bootstrap admin if none exists yet — RPC is a no-op when one does.
    try { await supabase.rpc("bootstrap_admin" as any); } catch { /* noop */ }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setRep(null);
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("reps")
        .select("id, email, name, region")
        .eq("id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setRep(data as RepProfile);
      } else {
        setRep({
          id: session.user.id,
          email: session.user.email ?? "",
          name: (session.user.user_metadata?.name as string) ?? session.user.email?.split("@")[0] ?? "Rep",
          region: (session.user.user_metadata?.region as string) ?? "—",
        });
      }
      await loadRole(session.user.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [session, loadRole]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshRole = useCallback(async () => {
    if (session?.user) await loadRole(session.user.id);
  }, [session, loadRole]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        rep,
        isAdmin,
        loading,
        signIn,
        signOut,
        refreshRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
