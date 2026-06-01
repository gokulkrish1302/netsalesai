import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useApp } from "@/state/AppStore";
import { ScorePill } from "@/components/common/ScoreBadge";
import { CategoryPill } from "@/components/common/CategoryPill";
import { Input } from "@/components/ui/input";

export function GlobalSearch() {
  const { scoredAccounts, openAccount } = useApp();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const matches = q.trim()
    ? scoredAccounts.filter((a) => a.accountName.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
    : [];

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function pick(id: string) {
    openAccount(id);
    setQ("");
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!matches.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => (h + 1) % matches.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => (h - 1 + matches.length) % matches.length);
            } else if (e.key === "Enter") {
              e.preventDefault();
              pick(matches[highlight].id);
            } else if (e.key === "Escape") {
              setQ("");
              setOpen(false);
            }
          }}
          placeholder="Search accounts..."
          className="pl-9"
        />
      </div>
      {open && q && matches.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-auto rounded-md border bg-popover shadow-lg">
          {matches.map((a, i) => (
            <button
              key={a.id}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => pick(a.id)}
              className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${
                i === highlight ? "bg-accent" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{a.accountName}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {a.industry} · {a.region} · Renews in {a.contractRenewalDays}d
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CategoryPill category={a.category} />
                <ScorePill score={a.score} category={a.category} />
              </div>
            </button>
          ))}
        </div>
      )}
      {open && q && matches.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border bg-popover p-4 text-sm text-muted-foreground shadow-lg">
          No accounts match "{q}"
        </div>
      )}
    </div>
  );
}
