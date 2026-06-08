import { useEffect, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/state/AuthContext";

const PUBLIC_PATHS = new Set(["/auth"]);

export function RouteGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPublic = PUBLIC_PATHS.has(pathname);

  useEffect(() => {
    if (loading) return;
    if (!session && !isPublic) navigate({ to: "/auth", replace: true });
  }, [loading, session, isPublic, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!session && !isPublic) return null;
  return <>{children}</>;
}

export function useIsAuthRoute() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return PUBLIC_PATHS.has(pathname);
}
