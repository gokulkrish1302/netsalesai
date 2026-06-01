import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApp } from "@/state/AppStore";
import { AccountCard } from "@/components/accounts/AccountCard";
import { CATEGORY_META } from "@/lib/scoring";
import type { Category, Industry, Region } from "@/lib/types";
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
import { ChevronDown, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/accounts")({
  head: () => ({
    meta: [
      { title: "Accounts — NetApp Cloud Migration Agent" },
      {
        name: "description",
        content: "Filter and triage your enterprise account portfolio by score, industry, and region.",
      },
    ],
  }),
  component: AccountsPage,
});

const CATEGORIES: (Category | "ALL")[] = ["ALL", "HOT", "WARM", "COLD", "NOT_READY"];
const INDUSTRIES: Industry[] = ["Tech", "Finance", "Healthcare", "Retail", "Manufacturing", "Government"];
const REGIONS: Region[] = ["West", "East", "Central", "EMEA", "APAC"];

type SortKey = "score" | "budget" | "deviceAge" | "renewal";

function AccountsPage() {
  const { scoredAccounts } = useApp();
  const [category, setCategory] = useState<Category | "ALL">("ALL");
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>("score");

  const filtered = useMemo(() => {
    let list = scoredAccounts;
    if (category !== "ALL") list = list.filter((a) => a.category === category);
    if (industries.length) list = list.filter((a) => industries.includes(a.industry));
    if (regions.length) list = list.filter((a) => regions.includes(a.region));
    switch (sortBy) {
      case "score":
        list = [...list].sort((a, b) => b.score - a.score);
        break;
      case "budget":
        list = [...list].sort((a, b) => b.itBudgetUSD - a.itBudgetUSD);
        break;
      case "deviceAge":
        list = [...list].sort((a, b) => b.deviceAgeYears - a.deviceAgeYears);
        break;
      case "renewal":
        list = [...list].sort((a, b) => a.contractRenewalDays - b.contractRenewalDays);
        break;
    }
    return list;
  }, [scoredAccounts, category, industries, regions, sortBy]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
        <p className="text-sm text-muted-foreground">
          Showing {filtered.length} of {scoredAccounts.length} accounts
        </p>
      </div>

      <div className="sticky top-16 z-10 flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((c) => {
            const active = c === category;
            const color = c === "ALL" ? "var(--primary)" : CATEGORY_META[c as Category].color;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                  active ? "border-transparent text-white" : "border-border text-muted-foreground hover:bg-accent",
                )}
                style={active ? { backgroundColor: color } : undefined}
              >
                {c === "ALL" ? "All" : CATEGORY_META[c as Category].label}
              </button>
            );
          })}
        </div>

        <MultiSelect
          label="Industry"
          options={INDUSTRIES}
          selected={industries}
          onChange={setIndustries as (s: string[]) => void}
        />
        <MultiSelect
          label="Region"
          options={REGIONS}
          selected={regions}
          onChange={setRegions as (s: string[]) => void}
        />

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sort</span>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="h-8 w-44 text-xs">
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
      </div>

      {filtered.length === 0 ? (
        <div className="app-card flex flex-col items-center gap-2 p-12 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No accounts match the current filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {filtered.map((a) => (
            <AccountCard key={a.id} account={a} />
          ))}
        </div>
      )}
    </div>
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
        <Button variant="outline" size="sm" className="gap-1">
          {label}
          {selected.length > 0 && (
            <span
              className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {selected.length}
            </span>
          )}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2">
        <div className="space-y-1">
          {options.map((o) => {
            const checked = selected.includes(o);
            return (
              <label
                key={o}
                className="flex cursor-pointer items-center gap-2 rounded p-1.5 text-sm hover:bg-accent"
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
