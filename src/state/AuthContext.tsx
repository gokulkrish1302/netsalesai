import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [rep, setRep] = useState<RepProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listener first, then initial session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) setRep(null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load rep profile when session changes
  useEffect(() => {
    if (!session?.user) {
      setRep(null);
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
        // Fallback profile from auth user if reps row missing
        setRep({
          id: session.user.id,
          email: session.user.email ?? "",
          name: (session.user.user_metadata?.name as string) ?? session.user.email?.split("@")[0] ?? "Rep",
          region: (session.user.user_metadata?.region as string) ?? "—",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, rep, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
