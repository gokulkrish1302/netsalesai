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
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ALL_KPIS, ALL_WIDGETS, useDashboards, type DashboardLayout, type KpiKey, type RenewalWindow } from "@/state/DashboardsContext";
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
  const reps = Array.from(new Set(scoredAccounts.map((a) => a.salesRep))).sort();

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
    const next = ALL_KPIS.filter((k) => set.has(k.key)).map((k) => k.key);
    setDraft({ ...draft, kpis: next });
  };

  const setFilter = (k: "region" | "industry" | "category" | "source" | "renewalWindow" | "rep", v: string) => {
    setDraft({ ...draft, filters: { ...draft.filters, [k]: v === ANY ? undefined : v } });
  };

  const scoreMin = draft.filters.scoreMin ?? 0;
  const scoreMax = draft.filters.scoreMax ?? 100;

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
              <FilterRow
                label="Priority"
                value={draft.filters.category ?? ANY}
                onChange={(v) => setFilter("category", v)}
                options={[
                  { value: "HOT", label: "Hot" },
                  { value: "WARM", label: "Warm" },
                  { value: "COLD", label: "Cold" },
                  { value: "NOT_READY", label: "Not ready" },
                ]}
              />
              <FilterRow
                label="Source"
                value={draft.filters.source ?? ANY}
                onChange={(v) => setFilter("source", v)}
                options={[
                  { value: "active_iq", label: "Active IQ" },
                  { value: "excel_import", label: "Excel import" },
                ]}
              />
              <FilterRow
                label="Renewal"
                value={draft.filters.renewalWindow ?? ANY}
                onChange={(v) => setFilter("renewalWindow", v as RenewalWindow)}
                options={[
                  { value: "30", label: "< 30 days" },
                  { value: "60", label: "< 60 days" },
                  { value: "90", label: "< 90 days" },
                  { value: "90plus", label: "> 90 days" },
                ]}
              />
              <FilterRow label="Rep" value={draft.filters.rep ?? ANY} onChange={(v) => setFilter("rep", v)} options={reps} />

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Score range</span>
                  <span className="text-xs tabular-nums">{scoreMin} – {scoreMax}</span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[scoreMin, scoreMax]}
                  onValueChange={([lo, hi]) =>
                    setDraft({
                      ...draft,
                      filters: {
                        ...draft.filters,
                        scoreMin: lo === 0 ? undefined : lo,
                        scoreMax: hi === 100 ? undefined : hi,
                      },
                    })
                  }
                />
              </div>
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

type Option = string | { value: string; label: string };

function FilterRow({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Option[] }) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-sm text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>All</SelectItem>
          {opts.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
