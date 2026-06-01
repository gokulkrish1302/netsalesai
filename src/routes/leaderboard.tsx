import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/state/AppStore";
import { CategoryPill } from "@/components/common/CategoryPill";
import { ScoreBar } from "@/components/common/ScoreBar";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { STAGE_LABEL, formatCurrencyShort } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — NetApp Cloud Migration Agent" },
      { name: "description", content: "Top 20 accounts ranked by score, renewal urgency, or budget." },
    ],
  }),
  component: LeaderboardPage,
});

type Sort = "score" | "renewal" | "budget";

// Hardcoded small deltas per account for demo "score change"
const DELTAS: Record<string, number> = {
  "acc-01": 3,
  "acc-02": 1,
  "acc-03": -2,
  "acc-04": 5,
  "acc-05": 0,
  "acc-06": -1,
  "acc-07": 2,
  "acc-08": 4,
  "acc-09": -3,
  "acc-10": 1,
  "acc-11": -2,
  "acc-12": 0,
  "acc-13": 2,
  "acc-14": -1,
  "acc-15": 1,
  "acc-16": -4,
  "acc-17": 0,
  "acc-18": 0,
  "acc-19": 1,
  "acc-20": -1,
};

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
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-sm text-muted-foreground">Top 20 accounts across the portfolio</p>
      </div>

      <div className="flex gap-2">
        {(["score", "renewal", "budget"] as Sort[]).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              sort === s
                ? "border-transparent text-white"
                : "border-border bg-card text-muted-foreground hover:bg-accent",
            )}
            style={sort === s ? { backgroundColor: "var(--primary)" } : undefined}
          >
            {s === "score" ? "By Score" : s === "renewal" ? "By Renewal Urgency" : "By Budget"}
          </button>
        ))}
      </div>

      <div className="app-card overflow-hidden">
        <div className="grid grid-cols-12 gap-3 border-b bg-secondary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <div className="col-span-1">Rank</div>
          <div className="col-span-3">Account</div>
          <div className="col-span-3">Score</div>
          <div className="col-span-1">Cat</div>
          <div className="col-span-2">Sales Rep</div>
          <div className="col-span-1">Δ</div>
          <div className="col-span-1">Stage</div>
        </div>
        <AnimatePresence initial={false}>
          {ranked.map((a, i) => {
            const delta = DELTAS[a.id] ?? 0;
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
            return (
              <motion.div
                key={a.id}
                layout
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className="grid grid-cols-12 items-center gap-3 border-b px-4 py-3 text-sm last:border-0"
              >
                <div className="col-span-1 text-lg font-bold tabular-nums">{medal}</div>
                <div className="col-span-3">
                  <div className="font-medium">{a.accountName}</div>
                  <div className="text-xs text-muted-foreground">
                    {sort === "budget"
                      ? formatCurrencyShort(a.itBudgetUSD)
                      : sort === "renewal"
                        ? `Renews in ${a.contractRenewalDays}d`
                        : `${a.industry} · ${a.region}`}
                  </div>
                </div>
                <div className="col-span-3 flex items-center gap-2">
                  <span className="w-6 text-right text-xs font-bold tabular-nums">{a.score}</span>
                  <div className="flex-1">
                    <ScoreBar value={a.score} category={a.category} />
                  </div>
                </div>
                <div className="col-span-1">
                  <CategoryPill category={a.category} />
                </div>
                <div className="col-span-2 truncate text-xs text-muted-foreground">{a.salesRep}</div>
                <div className="col-span-1">
                  <DeltaPill delta={delta} />
                </div>
                <div className="col-span-1 truncate text-xs text-muted-foreground">
                  {STAGE_LABEL[a.pipelineStage]}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function DeltaPill({ delta }: { delta: number }) {
  const Icon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
  const color = delta > 0 ? "var(--success)" : delta < 0 ? "var(--hot)" : "var(--muted-foreground)";
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums" style={{ color }}>
      <Icon className="h-3 w-3" />
      {delta === 0 ? "0" : Math.abs(delta)}
    </span>
  );
}
