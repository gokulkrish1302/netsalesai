import { useEffect, useState } from "react";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ALL_KPIS, ALL_WIDGETS, useDashboards, type DashboardLayout, type KpiKey } from "@/state/DashboardsContext";
import { useApp } from "@/state/AppStore";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";

const ANY = "__any__";

export function CustomizeDashboardSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { active, updateLayout } = useDashboards();
  const { scoredAccounts } = useApp();
  const [draft, setDraft] = useState<DashboardLayout | null>(null);

  useEffect(() => {
    if (open && active) setDraft(JSON.parse(JSON.stringify(active.layout)));
  }, [open, active]);

  if (!active || !draft) return null;

  const regions = Array.from(new Set(scoredAccounts.map((a) => a.region))).sort();
  const industries = Array.from(new Set(scoredAccounts.map((a) => a.industry))).sort();

  const toggleWidget = (key: string, visible: boolean) => {
    setDraft({ ...draft, widgets: draft.widgets.map((w) => (w.key === key ? { ...w, visible } : w)) });
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...draft.widgets];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setDraft({ ...draft, widgets: next });
  };

  const toggleKpi = (key: KpiKey, checked: boolean) => {
    const set = new Set(draft.kpis);
    if (checked) {
      if (set.size >= 4) return;
      set.add(key);
    } else {
      set.delete(key);
    }
    // Preserve original ordering from ALL_KPIS
    const next = ALL_KPIS.filter((k) => set.has(k.key)).map((k) => k.key);
    setDraft({ ...draft, kpis: next });
  };

  const setFilter = (k: "region" | "industry" | "category", v: string) => {
    setDraft({ ...draft, filters: { ...draft.filters, [k]: v === ANY ? undefined : v } });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Customize "{active.name}"</SheetTitle>
          <SheetDescription>Show, hide, and reorder widgets. Pick the KPIs and scope.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <section>
            <h3 className="mb-2 text-sm font-semibold">Widgets</h3>
            <div className="space-y-1.5">
              {draft.widgets.map((w, i) => {
                const meta = ALL_WIDGETS.find((m) => m.key === w.key);
                return (
                  <div key={w.key} className="flex items-center gap-2 rounded-lg border bg-card p-2.5">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 text-sm">{meta?.label ?? w.key}</div>
                    <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === draft.widgets.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Switch checked={w.visible} onCheckedChange={(v) => toggleWidget(w.key, v)} />
                  </div>
                );
              })}
            </div>
          </section>

          <Separator />

          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold">KPIs in stat strip</h3>
              <span className="text-xs text-muted-foreground">{draft.kpis.length} / 4</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ALL_KPIS.map((k) => {
                const checked = draft.kpis.includes(k.key);
                const disabled = !checked && draft.kpis.length >= 4;
                return (
                  <label key={k.key} className={`flex items-center gap-2 rounded-lg border bg-card p-2.5 text-sm ${disabled ? "opacity-50" : "cursor-pointer"}`}>
                    <Checkbox checked={checked} disabled={disabled} onCheckedChange={(v) => toggleKpi(k.key, Boolean(v))} />
                    {k.label}
                  </label>
                );
              })}
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="mb-2 text-sm font-semibold">Filter scope</h3>
            <div className="grid grid-cols-1 gap-3">
              <FilterRow label="Region" value={draft.filters.region ?? ANY} onChange={(v) => setFilter("region", v)} options={regions} />
              <FilterRow label="Industry" value={draft.filters.industry ?? ANY} onChange={(v) => setFilter("industry", v)} options={industries} />
              <FilterRow label="Priority" value={draft.filters.category ?? ANY} onChange={(v) => setFilter("category", v)} options={["HOT", "WARM", "COLD", "NOT_READY"]} />
            </div>
          </section>
        </div>

        <SheetFooter className="mt-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={async () => { await updateLayout(draft); onOpenChange(false); }}>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function FilterRow({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-sm text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>All</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
