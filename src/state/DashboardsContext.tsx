import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/AuthContext";
import { toast } from "sonner";

export type WidgetKey = "stats" | "alert" | "matrix" | "top" | "renewal";
export type KpiKey = "accounts" | "hot" | "pipeline" | "active_plans" | "avg_score" | "renewals_60";

export interface DashboardLayout {
  widgets: { key: WidgetKey; visible: boolean }[];
  kpis: KpiKey[];
  filters: { region?: string; industry?: string; category?: string };
}

export interface Dashboard {
  id: string;
  name: string;
  layout: DashboardLayout;
  is_default: boolean;
}

export const ALL_WIDGETS: { key: WidgetKey; label: string }[] = [
  { key: "stats", label: "Stat strip" },
  { key: "alert", label: "Renewal alert banner" },
  { key: "matrix", label: "Opportunity matrix" },
  { key: "top", label: "Today's #1 priority" },
  { key: "renewal", label: "Renewal radar" },
];

export const ALL_KPIS: { key: KpiKey; label: string }[] = [
  { key: "accounts", label: "Accounts" },
  { key: "hot", label: "Hot leads" },
  { key: "pipeline", label: "Pipeline value" },
  { key: "active_plans", label: "Active action plans" },
  { key: "avg_score", label: "Avg score" },
  { key: "renewals_60", label: "Renewals < 60d" },
];

export const DEFAULT_LAYOUT: DashboardLayout = {
  widgets: ALL_WIDGETS.map((w) => ({ key: w.key, visible: true })),
  kpis: ["accounts", "hot", "pipeline", "active_plans"],
  filters: {},
};

function normalizeLayout(raw: unknown): DashboardLayout {
  const r = (raw ?? {}) as Partial<DashboardLayout>;
  const widgetsByKey = new Map(
    (r.widgets ?? []).filter(Boolean).map((w) => [w.key, w]),
  );
  const widgets = ALL_WIDGETS.map(
    (w) => widgetsByKey.get(w.key) ?? { key: w.key, visible: true },
  );
  const kpis = (r.kpis ?? DEFAULT_LAYOUT.kpis).filter((k) =>
    ALL_KPIS.some((x) => x.key === k),
  );
  return {
    widgets,
    kpis: kpis.length ? kpis.slice(0, 4) : DEFAULT_LAYOUT.kpis,
    filters: r.filters ?? {},
  };
}

interface Ctx {
  dashboards: Dashboard[];
  activeId: string | null;
  active: Dashboard | null;
  loading: boolean;
  setActiveId: (id: string) => void;
  create: (name: string) => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setDefault: (id: string) => Promise<void>;
  updateLayout: (layout: DashboardLayout) => Promise<void>;
}

const DashboardsContext = createContext<Ctx | null>(null);

const LS_ACTIVE = "netapp-cma-active-dashboard";

export function DashboardsProvider({ children }: { children: ReactNode }) {
  const { rep } = useAuth();
  const email = rep?.email ?? null;
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load on rep change
  useEffect(() => {
    if (!email) {
      setDashboards([]);
      setActiveIdState(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("dashboards")
        .select("id, name, layout, is_default")
        .eq("rep_email", email)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        toast.error("Could not load dashboards");
        setLoading(false);
        return;
      }
      let list: Dashboard[] = (data ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        layout: normalizeLayout(d.layout),
        is_default: d.is_default,
      }));
      // Seed default dashboard if none
      if (list.length === 0) {
        const { data: created, error: err } = await supabase
          .from("dashboards")
          .insert({
            rep_email: email,
            name: "My dashboard",
            layout: DEFAULT_LAYOUT as never,
            is_default: true,
          })
          .select("id, name, layout, is_default")
          .single();
        if (err || !created) {
          toast.error("Could not initialize dashboard");
          setLoading(false);
          return;
        }
        list = [{ id: created.id, name: created.name, layout: normalizeLayout(created.layout), is_default: created.is_default }];
      }
      setDashboards(list);
      const stored = typeof window !== "undefined" ? localStorage.getItem(LS_ACTIVE) : null;
      const initial = list.find((d) => d.id === stored)?.id
        ?? list.find((d) => d.is_default)?.id
        ?? list[0].id;
      setActiveIdState(initial);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [email]);

  const setActiveId = useCallback((id: string) => {
    setActiveIdState(id);
    if (typeof window !== "undefined") localStorage.setItem(LS_ACTIVE, id);
  }, []);

  const create = useCallback(async (name: string) => {
    if (!email) return;
    const { data, error } = await supabase
      .from("dashboards")
      .insert({ rep_email: email, name: name.trim() || "Untitled", layout: DEFAULT_LAYOUT as never, is_default: false })
      .select("id, name, layout, is_default")
      .single();
    if (error || !data) {
      toast.error("Could not create dashboard");
      return;
    }
    const fresh: Dashboard = { id: data.id, name: data.name, layout: normalizeLayout(data.layout), is_default: data.is_default };
    setDashboards((d) => [...d, fresh]);
    setActiveId(fresh.id);
    toast.success(`Created "${fresh.name}"`);
  }, [email, setActiveId]);

  const rename = useCallback(async (id: string, name: string) => {
    const trimmed = name.trim() || "Untitled";
    setDashboards((d) => d.map((x) => (x.id === id ? { ...x, name: trimmed } : x)));
    await supabase.from("dashboards").update({ name: trimmed }).eq("id", id);
  }, []);

  const remove = useCallback(async (id: string) => {
    setDashboards((list) => {
      if (list.length <= 1) {
        toast.error("Keep at least one dashboard");
        return list;
      }
      const next = list.filter((d) => d.id !== id);
      if (activeId === id) setActiveId(next[0].id);
      return next;
    });
    await supabase.from("dashboards").delete().eq("id", id);
  }, [activeId, setActiveId]);

  const setDefault = useCallback(async (id: string) => {
    if (!email) return;
    setDashboards((d) => d.map((x) => ({ ...x, is_default: x.id === id })));
    await supabase.from("dashboards").update({ is_default: false }).eq("rep_email", email);
    await supabase.from("dashboards").update({ is_default: true }).eq("id", id);
  }, [email]);

  const updateLayout = useCallback(async (layout: DashboardLayout) => {
    if (!activeId) return;
    setDashboards((d) => d.map((x) => (x.id === activeId ? { ...x, layout } : x)));
    await supabase.from("dashboards").update({ layout: layout as never }).eq("id", activeId);
  }, [activeId]);

  const active = useMemo(
    () => dashboards.find((d) => d.id === activeId) ?? null,
    [dashboards, activeId],
  );

  const value: Ctx = { dashboards, activeId, active, loading, setActiveId, create, rename, remove, setDefault, updateLayout };
  return <DashboardsContext.Provider value={value}>{children}</DashboardsContext.Provider>;
}

export function useDashboards() {
  const ctx = useContext(DashboardsContext);
  if (!ctx) throw new Error("useDashboards must be used inside DashboardsProvider");
  return ctx;
}
