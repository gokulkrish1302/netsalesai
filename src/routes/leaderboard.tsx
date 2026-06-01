import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/state/AppStore";
import { CATEGORY_META } from "@/lib/scoring";
import { STAGE_LABEL, formatCurrencyShort } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — NetApp Cloud Migration Agent" },
      { name: "description", content: "Ranked heat-map leaderboard of accounts by score, renewal urgency, or budget." },
    ],
  }),
  component: LeaderboardPage,
});

type Sort = "score" | "renewal" | "budget";

const MEDAL_COLORS: [string, string][] = [
  ["#F59E0B", "Gold"],
  ["#9CA3AF", "Silver"],
  ["#B45309", "Bronze"],
];

function LeaderboardPage() {
  const { scoredAccounts } = useApp();
  const [sort, setSort] = useState<Sort>("score");

  const ranked = useMemo(() => {
    const arr = [...scoredAccounts];
    if (sort === "score") arr.sort((a, b) => b.score - a.score);
    if (sort === "renewal") arr.sort((a, b) => a.contractRenewalDays - b.contractRenewalDays);
    if (sort === "budget") arr.sort((a, b) => b.itBudgetUSD - a.itBudgetUSD);
    return arr;
  }, [scoredAccounts, sort]);

  return (
    <div className="space-y-5">
      <div>
        <span className="label-eyebrow">Heat Map</span>
        <h1 className="serif mt-1 text-3xl tracking-tight" style={{ letterSpacing: "-0.02em" }}>
          Leaderboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Each row's tint shows where it stands — the longer the color, the higher the rank.
        </p>
      </div>

      <div className="flex gap-2">
        {(["score", "renewal", "budget"] as Sort[]).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              sort === s ? "text-white" : "bg-card text-muted-foreground hover:bg-accent",
            )}
            style={sort === s ? { backgroundColor: "var(--primary)" } : { boxShadow: "var(--shadow-editorial)" }}
          >
            {s === "score" ? "By Score" : s === "renewal" ? "By Renewal Urgency" : "By Budget"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {ranked.map((a, i) => {
            const color = CATEGORY_META[a.category].color;
            const fillPct =
              sort === "renewal"
                ? Math.max(8, 100 - Math.min(100, (a.contractRenewalDays / 730) * 100))
                : sort === "budget"
                  ? Math.max(8, (a.itBudgetUSD / 3_000_000) * 100)
                  : Math.max(8, a.score);
            const medal = i < 3 ? MEDAL_COLORS[i] : null;
            const rightText =
              sort === "budget"
                ? formatCurrencyShort(a.itBudgetUSD)
                : sort === "renewal"
                  ? `${a.contractRenewalDays}d`
                  : String(a.score);
            return (
              <motion.div
                key={a.id}
                layout
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className="relative overflow-hidden rounded-md bg-card"
                style={{
                  boxShadow: medal
                    ? `inset 4px 0 0 ${medal[0]}, 0 0 12px -4px ${medal[0]}55, var(--shadow-editorial)`
                    : "var(--shadow-editorial)",
                }}
              >
                {/* Heat fill background */}
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-500"
                  style={{
                    width: `${fillPct}%`,
                    backgroundColor: color,
                    opacity: 0.12,
                  }}
                />
                <div className="relative grid grid-cols-12 items-center gap-3 px-4 py-3">
                  <div className="col-span-1 flex items-center gap-1">
                    <span className="serif text-[26px] tabular-nums" style={{ lineHeight: 1, color: medal ? medal[0] : "var(--foreground)" }}>
                      {i + 1}
                    </span>
                  </div>
                  <div className="col-span-5 min-w-0">
                    <div className="truncate text-sm font-semibold">{a.accountName}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {a.industry} · {a.region} · {a.salesRep}
                    </div>
                  </div>
                  <div className="col-span-3 text-[11px] text-muted-foreground">
                    {STAGE_LABEL[a.pipelineStage]}
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                      style={{ backgroundColor: color }}
                    >
                      {CATEGORY_META[a.category].label}
                    </span>
                    <span
                      className="serif text-xl tabular-nums"
                      style={{ color, letterSpacing: "-0.02em" }}
                    >
                      {rightText}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
