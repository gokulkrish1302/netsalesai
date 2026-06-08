import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { StatStrip } from "@/components/dashboard/StatStrip";
import { PriorityMatrix } from "@/components/dashboard/PriorityMatrix";
import { TopPriorityCard } from "@/components/dashboard/TopPriorityCard";
import { RenewalRadar } from "@/components/dashboard/RenewalRadar";
import { AlertBanner } from "@/components/dashboard/AlertBanner";
import { DashboardBar } from "@/components/dashboard/DashboardBar";
import { useAuth } from "@/state/AuthContext";
import { useApp } from "@/state/AppStore";
import { useDashboards, DEFAULT_LAYOUT, type WidgetKey } from "@/state/DashboardsContext";
import type { ScoredAccount } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — NetApp Cloud Migration Agent" },
      {
        name: "description",
        content:
          "Priority matrix and renewal radar across NetApp's enterprise cloud migration portfolio.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { rep, user } = useAuth();
  const { scoredAccounts } = useApp();
  const { active } = useDashboards();
  const layout = active?.layout ?? DEFAULT_LAYOUT;

  const filtered: ScoredAccount[] = useMemo(() => {
    const { region, industry, category } = layout.filters;
    return scoredAccounts.filter(
      (a) =>
        (!region || a.region === region) &&
        (!industry || a.industry === industry) &&
        (!category || a.category === category),
    );
  }, [scoredAccounts, layout.filters]);

  const source = rep?.name || user?.email?.split("@")[0] || "there";
  const firstName = source.split(/[\s.]+/)[0].replace(/^./, (c) => c.toUpperCase());

  const activeFilters = Object.entries(layout.filters).filter(([, v]) => Boolean(v));

  const renderWidget = (key: WidgetKey) => {
    switch (key) {
      case "stats":
        return <StatStrip key="stats" accounts={filtered} kpis={layout.kpis} />;
      case "alert":
        return <AlertBanner key="alert" accounts={filtered} />;
      case "matrix":
        return (
          <div key="matrix" className="grid grid-cols-1 gap-5 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <PriorityMatrix accounts={filtered} />
            </div>
            <div className="flex flex-col gap-5 lg:col-span-2">
              {layout.widgets.find((w) => w.key === "top")?.visible && (
                <TopPriorityCard accounts={filtered} />
              )}
              {layout.widgets.find((w) => w.key === "renewal")?.visible && (
                <RenewalRadar accounts={filtered} />
              )}
            </div>
          </div>
        );
      // Top + Renewal are rendered inside the matrix block when matrix is visible.
      // If matrix is hidden, render them standalone.
      case "top":
        if (layout.widgets.find((w) => w.key === "matrix")?.visible) return null;
        return (
          <div key="top" className="max-w-md">
            <TopPriorityCard accounts={filtered} />
          </div>
        );
      case "renewal":
        if (layout.widgets.find((w) => w.key === "matrix")?.visible) return null;
        return (
          <div key="renewal" className="max-w-md">
            <RenewalRadar accounts={filtered} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[28px] leading-tight md:text-[32px]">
            Good day, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's where your portfolio stands today.
            {activeFilters.length > 0 && (
              <>
                {" · "}
                <span className="text-foreground">
                  Filtered: {activeFilters.map(([k, v]) => `${k}=${v}`).join(", ")}
                </span>
              </>
            )}
          </p>
        </div>
        <DashboardBar />
      </div>

      {layout.widgets
        .filter((w) => w.visible)
        .map((w) => renderWidget(w.key))}
    </div>
  );
}
