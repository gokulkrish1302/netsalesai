import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { StatStrip } from "@/components/dashboard/StatStrip";
import { PriorityMatrix } from "@/components/dashboard/PriorityMatrix";
import { TopPriorityCard } from "@/components/dashboard/TopPriorityCard";
import { RenewalRadar } from "@/components/dashboard/RenewalRadar";
import { AlertBanner } from "@/components/dashboard/AlertBanner";
import { DashboardBar } from "@/components/dashboard/DashboardBar";
import { CategoryDonut } from "@/components/dashboard/CategoryDonut";
import { TopAccountsBar } from "@/components/dashboard/TopAccountsBar";
import { RankedAccountsList } from "@/components/dashboard/RankedAccountsList";
import { ContextPreview } from "@/components/dashboard/ContextPreview";
import { SortableWidget } from "@/components/dashboard/SortableWidget";
import { MorningBriefing } from "@/components/dashboard/MorningBriefing";
import { EmptyAccountsState } from "@/components/common/EmptyAccountsState";
import { useModals } from "@/components/modals/ModalsProvider";
import { useAuth } from "@/state/AuthContext";
import { useApp } from "@/state/AppStore";
import { useDashboards, DEFAULT_LAYOUT, type WidgetKey } from "@/state/DashboardsContext";
import type { ScoredAccount } from "@/lib/types";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

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
  const modals = useModals();
  const { active, updateLayout } = useDashboards();
  const layout = active?.layout ?? DEFAULT_LAYOUT;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active: a, over } = event;
    if (!over || a.id === over.id || !active) return;
    const ids = layout.widgets.map((w) => w.key);
    const oldIndex = ids.indexOf(a.id as WidgetKey);
    const newIndex = ids.indexOf(over.id as WidgetKey);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(layout.widgets, oldIndex, newIndex);
    void updateLayout({ ...layout, widgets: next });
  };

  const filtered: ScoredAccount[] = useMemo(() => {
    const f = layout.filters;
    return scoredAccounts.filter((a) => {
      if (f.region && a.region !== f.region) return false;
      if (f.industry && a.industry !== f.industry) return false;
      if (f.category && a.category !== f.category) return false;
      if (f.source && (a.dataSource ?? "active_iq") !== f.source) return false;
      if (f.rep && a.salesRep !== f.rep) return false;
      if (f.scoreMin !== undefined && a.score < f.scoreMin) return false;
      if (f.scoreMax !== undefined && a.score > f.scoreMax) return false;
      if (f.renewalWindow) {
        const d = a.contractRenewalDays;
        if (f.renewalWindow === "30" && d > 30) return false;
        if (f.renewalWindow === "60" && d > 60) return false;
        if (f.renewalWindow === "90" && d > 90) return false;
        if (f.renewalWindow === "90plus" && d <= 90) return false;
      }
      return true;
    });
  }, [scoredAccounts, layout.filters]);

  const source = rep?.name || user?.email?.split("@")[0] || "there";
  const firstName = source.split(/[\s.]+/)[0].replace(/^./, (c) => c.toUpperCase());

  const activeFilters = Object.entries(layout.filters).filter(([, v]) => v !== undefined && v !== "");
  const visibleSet = new Set(layout.widgets.filter((w) => w.visible).map((w) => w.key));

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
              {visibleSet.has("top") && <TopPriorityCard accounts={filtered} />}
              {visibleSet.has("renewal") && <RenewalRadar accounts={filtered} />}
            </div>
          </div>
        );
      case "top":
        if (visibleSet.has("matrix")) return null;
        return (
          <div key="top" className="max-w-md">
            <TopPriorityCard accounts={filtered} />
          </div>
        );
      case "renewal":
        if (visibleSet.has("matrix")) return null;
        return (
          <div key="renewal" className="max-w-md">
            <RenewalRadar accounts={filtered} />
          </div>
        );
      case "ranked":
        // Render ranked + context as a paired 2-col block when both visible.
        if (visibleSet.has("context")) {
          return (
            <div key="ranked-context" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <RankedAccountsList accounts={filtered} selectedId={selectedId} onSelect={setSelectedId} />
              <ContextPreview accounts={filtered} selectedId={selectedId} />
            </div>
          );
        }
        return (
          <div key="ranked" className="max-w-md">
            <RankedAccountsList accounts={filtered} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
        );
      case "context":
        if (visibleSet.has("ranked")) return null;
        return (
          <div key="context" className="max-w-md">
            <ContextPreview accounts={filtered} selectedId={selectedId} />
          </div>
        );
      case "donut":
        return (
          <div key="donut" className="max-w-md">
            <CategoryDonut accounts={filtered} />
          </div>
        );
      case "topbar":
        return <TopAccountsBar key="topbar" accounts={filtered} />;
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

      <MorningBriefing />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={layout.widgets.filter((w) => w.visible).map((w) => w.key)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-6">
            {layout.widgets
              .filter((w) => w.visible)
              .map((w) => {
                const node = renderWidget(w.key);
                if (!node) return null;
                return (
                  <SortableWidget key={w.key} id={w.key}>
                    {node}
                  </SortableWidget>
                );
              })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
