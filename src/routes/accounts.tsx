import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApp } from "@/state/AppStore";
import { AccountCard } from "@/components/accounts/AccountCard";
import { SwimlaneCard } from "@/components/accounts/SwimlaneCard";
import { CATEGORY_META } from "@/lib/scoring";
import type { Category, Industry, Region, ScoredAccount } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, Inbox, LayoutGrid, List, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrencyShort } from "@/lib/format";
import { toast } from "sonner";
import { useModals } from "@/components/modals/ModalsProvider";

export const Route = createFileRoute("/accounts")({
  head: () => ({
    meta: [
      { title: "Accounts — NetApp Cloud Migration Agent" },
      {
        name: "description",
        content: "Triage your portfolio in a swimlane board or list view by category, industry, and region.",
      },
    ],
  }),
  component: AccountsPage,
});

const INDUSTRIES: Industry[] = ["Tech", "Finance", "Healthcare", "Retail", "Manufacturing", "Government"];
const REGIONS: Region[] = ["West", "East", "Central", "EMEA", "APAC"];
const COLUMNS: Category[] = ["HOT", "WARM", "COLD", "NOT_READY"];

type SortKey = "score" | "budget" | "deviceAge" | "renewal";
type ViewMode = "board" | "list";
type SourceFilter = "all" | "active_iq" | "excel_import";

function AccountsPage() {
  const { scoredAccounts } = useApp();
  const modals = useModals();
  const [view, setView] = useState<ViewMode>("board");
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [overrides, setOverrides] = useState<Record<string, Category>>({});
  const [dragOver, setDragOver] = useState<Category | null>(null);

  const accounts = useMemo(() => {
    let list = scoredAccounts.map((a) =>
      overrides[a.id] ? { ...a, category: overrides[a.id] } : a,
    );
    if (industries.length) list = list.filter((a) => industries.includes(a.industry));
    if (regions.length) list = list.filter((a) => regions.includes(a.region));
    if (sourceFilter !== "all") {
      list = list.filter((a) => (a.dataSource ?? "active_iq") === sourceFilter);
    }
    return list;
  }, [scoredAccounts, industries, regions, sourceFilter, overrides]);


  const sorted = useMemo(() => {
    const arr = [...accounts];
    switch (sortBy) {
      case "score": arr.sort((a, b) => b.score - a.score); break;
      case "budget": arr.sort((a, b) => b.itBudgetUSD - a.itBudgetUSD); break;
      case "deviceAge": arr.sort((a, b) => b.deviceAgeYears - a.deviceAgeYears); break;
      case "renewal": arr.sort((a, b) => a.contractRenewalDays - b.contractRenewalDays); break;
    }
    return arr;
  }, [accounts, sortBy]);

  function handleDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDrop(e: React.DragEvent, col: Category) {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const a = sorted.find((x) => x.id === id);
    if (!a || a.category === col) return;
    setOverrides((o) => ({ ...o, [id]: col }));
    toast.success(`Moved ${a.accountName} → ${CATEGORY_META[col].label}`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[28px] leading-tight md:text-[32px]">Accounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sorted.length} of {scoredAccounts.length} accounts shown
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="pill h-10 gap-2 px-4"
            onClick={() => modals.openImport()}
          >
            <Upload className="h-4 w-4" />
            Import from Excel
          </Button>
          <div className="flex items-center gap-1 rounded-full bg-surface-2 p-1">
            <ToggleBtn active={view === "board"} onClick={() => setView("board")}>
              <LayoutGrid className="h-3.5 w-3.5" /> Board
            </ToggleBtn>
            <ToggleBtn active={view === "list"} onClick={() => setView("list")}>
              <List className="h-3.5 w-3.5" /> List
            </ToggleBtn>
          </div>
        </div>
      </div>

      <ImportHistory onImportClick={() => modals.openImport()} />

      <div className="flex flex-wrap items-center gap-3">
        <MultiSelect label="Industry" options={INDUSTRIES} selected={industries} onChange={setIndustries as (s: string[]) => void} />
        <MultiSelect label="Region" options={REGIONS} selected={regions} onChange={setRegions as (s: string[]) => void} />
        <div className="flex items-center gap-1 rounded-full bg-surface-2 p-1">
          {(["all", "active_iq", "excel_import"] as SourceFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setSourceFilter(s)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                sourceFilter === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s === "all" ? "All sources" : s === "active_iq" ? "Active IQ" : "Excel"}
            </button>
          ))}
        </div>
        {view === "list" && (

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort</span>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
              <SelectTrigger className="h-9 w-44 rounded-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Score ↓</SelectItem>
                <SelectItem value="budget">Budget ↓</SelectItem>
                <SelectItem value="deviceAge">Device Age ↓</SelectItem>
                <SelectItem value="renewal">Renewal ↑</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="app-card flex flex-col items-center gap-3 p-12 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No accounts match the current filters.</p>
          <Button variant="outline" size="sm" className="pill gap-2" onClick={() => modals.openImport()}>
            <Upload className="h-3.5 w-3.5" />
            Import some
          </Button>
        </div>
      ) : view === "board" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((cat) => {
            const items = sorted
              .filter((a) => a.category === cat)
              .sort((a, b) => b.score - a.score);
            const total = items.reduce((s, a) => s + a.itBudgetUSD, 0);
            const color = CATEGORY_META[cat].color;
            return (
              <div
                key={cat}
                onDragOver={(e) => { e.preventDefault(); setDragOver(cat); }}
                onDragLeave={() => setDragOver((d) => (d === cat ? null : d))}
                onDrop={(e) => handleDrop(e, cat)}
                className={cn(
                  "flex min-h-[300px] flex-col rounded-2xl p-3 transition-colors",
                  dragOver === cat && "swimlane-dragover",
                )}
                style={{ backgroundColor: "var(--surface-1)" }}
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-xs font-bold uppercase tracking-wide" style={{ color }}>
                        {CATEGORY_META[cat].label}
                      </span>
                      <span
                        className="rounded-full px-1.5 text-[11px] font-semibold tabular-nums text-muted-foreground"
                        style={{ backgroundColor: "var(--surface-2)" }}
                      >
                        {items.length}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      {formatCurrencyShort(total)} pipeline
                    </div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  {items.map((a: ScoredAccount) => (
                    <SwimlaneCard
                      key={a.id}
                      account={a}
                      overridden={!!overrides[a.id]}
                      onDragStart={handleDragStart}
                    />
                  ))}
                  {items.length === 0 && (
                    <div className="mt-2 rounded-xl border-2 border-dashed border-border p-4 text-center text-[11px] text-muted-foreground">
                      Drop accounts here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {sorted.map((a) => (
            <AccountCard key={a.id} account={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function MultiSelect<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly T[];
  selected: T[];
  onChange: (s: T[]) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="pill h-9 gap-1.5 px-3">
          {label}
          {selected.length > 0 && (
            <span
              className="ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {selected.length}
            </span>
          )}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 rounded-2xl p-2">
        <div className="space-y-0.5">
          {options.map((o) => {
            const checked = selected.includes(o);
            return (
              <label
                key={o}
                className="flex cursor-pointer items-center gap-2 rounded-xl p-2 text-sm hover:bg-accent"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(c) =>
                    onChange(c ? [...selected, o] : selected.filter((x) => x !== o))
                  }
                />
                {o}
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
