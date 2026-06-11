import { useEffect, useRef } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useAuth } from "@/state/AuthContext";
import { useApp } from "@/state/AppStore";
import { markOnboarded } from "@/lib/onboarding.functions";
import { tourSteps } from "./tourSteps";

const STARTED_KEY = "netapp.onboarding.started";

export function OnboardingTour() {
  const { session, user } = useAuth();
  const { scoredAccounts, openAccount, activeAccount } = useApp();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const driverRef = useRef<Driver | null>(null);
  const onboardedAtRef = useRef<string | null | undefined>(undefined);

  // Load onboarded_at directly from supabase (AuthContext doesn't expose it)
  useEffect(() => {
    let cancelled = false;
    if (!session?.user) {
      onboardedAtRef.current = undefined;
      return;
    }
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("reps")
        .select("onboarded_at")
        .eq("id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      onboardedAtRef.current = (data?.onboarded_at as string | null) ?? null;
      maybeAutoStart();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  function startTour(force = false) {
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }
    const firstAccountId = scoredAccounts[0]?.id ?? null;

    const d = driver({
      showProgress: true,
      progressText: "{{current}} of {{total}}",
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      doneBtnText: "Got it",
      allowClose: true,
      overlayOpacity: 0.6,
      stagePadding: 6,
      stageRadius: 12,
      popoverClass: "netapp-tour-popover",
      steps: tourSteps,
      onHighlightStarted: (_el, step) => {
        const sel = (step as any)?.element as string | undefined;
        // Open detail panel before highlighting account-detail / action-plan-btn
        if (
          (sel === '[data-tour="account-detail"]' ||
            sel === '[data-tour="action-plan-btn"]') &&
          firstAccountId &&
          !activeAccount
        ) {
          openAccount(firstAccountId);
        }
      },
      onDestroyed: () => {
        // Close any opened detail panel
        openAccount(null);
        finish(!force);
      },
    });

    driverRef.current = d;
    // Ensure we're on the dashboard
    if (pathname !== "/") navigate({ to: "/" });
    // small delay so DOM targets exist
    window.setTimeout(() => d.drive(), 150);
  }

  async function finish(persist: boolean) {
    if (!persist) return;
    try {
      await markOnboarded();
      onboardedAtRef.current = new Date().toISOString();
    } catch {
      /* noop */
    }
  }

  function maybeAutoStart() {
    if (!user) return;
    if (onboardedAtRef.current === undefined) return; // still loading
    if (onboardedAtRef.current) return; // already onboarded
    if (sessionStorage.getItem(STARTED_KEY)) return;
    if (pathname !== "/") return;
    if (scoredAccounts.length === 0) return; // wait for data so selectors exist
    sessionStorage.setItem(STARTED_KEY, "1");
    startTour(true);
  }

  useEffect(() => {
    maybeAutoStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, scoredAccounts.length, user?.id]);

  // Expose manual replay via custom event from TopBar
  useEffect(() => {
    const handler = () => startTour(false);
    window.addEventListener("netapp:start-tour", handler);
    return () => window.removeEventListener("netapp:start-tour", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoredAccounts.length, pathname]);

  return null;
}
