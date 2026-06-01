import { useMemo, useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useApp } from "@/state/AppStore";
import { CATEGORY_META } from "@/lib/scoring";
import type { Category, ScoredAccount } from "@/lib/types";
import { CategoryPill } from "@/components/common/CategoryPill";
import { formatCurrencyShort } from "@/lib/format";

const CATS: Category[] = ["HOT", "WARM", "COLD", "NOT_READY"];

interface Point {
  x: number;
  y: number;
  z: number;
  account: ScoredAccount;
}

export function PriorityMatrix() {
  const { scoredAccounts, openAccount } = useApp();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [animKey] = useState(() => Date.now());

  const seriesByCat = useMemo(() => {
    const m = new Map<Category, Point[]>();
    CATS.forEach((c) => m.set(c, []));
    scoredAccounts.forEach((a) => {
      m.get(a.category)!.push({
        x: a.score,
        y: Math.min(730, a.contractRenewalDays),
        z: Math.max(80_000, a.itBudgetUSD),
        account: a,
      });
    });
    return m;
  }, [scoredAccounts]);

  return (
    <div className="app-card flex flex-col p-5" style={{ minHeight: 520 }}>
      <div className="mb-1 flex items-center justify-between">
        <span className="label-eyebrow">Opportunity Matrix</span>
        <span className="text-[11px] text-muted-foreground">{scoredAccounts.length} accounts plotted</span>
      </div>
      <h2 className="serif mb-4 text-2xl tracking-tight" style={{ letterSpacing: "-0.01em" }}>
        Where to spend your time this week
      </h2>

      <div className="relative flex-1">
        {/* Quadrant watermarks */}
        <div className="pointer-events-none absolute inset-0 z-10 p-8">
          <div className="relative h-full w-full">
            <span className="absolute right-2 top-2 text-[11px] font-bold tracking-wide" style={{ color: "#FCA5A5" }}>
              ACT NOW
            </span>
            <span className="absolute left-2 top-2 text-[11px] font-bold tracking-wide" style={{ color: "#FCD9A5" }}>
              NURTURE FAST
            </span>
            <span className="absolute right-2 bottom-2 text-[11px] font-bold tracking-wide" style={{ color: "#A5C2FC" }}>
              HIGH POTENTIAL
            </span>
            <span className="absolute left-2 bottom-2 text-[11px] font-bold tracking-wide" style={{ color: "#C8CDD3" }}>
              MONITOR
            </span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height="100%" minHeight={400}>
          <ScatterChart margin={{ top: 20, right: 24, bottom: 32, left: 24 }} key={animKey}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
            <XAxis
              type="number"
              dataKey="x"
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
              label={{
                value: "Lead Score →",
                position: "insideBottom",
                offset: -16,
                style: { fontSize: 10, fill: "var(--muted-foreground)", letterSpacing: "0.08em", textTransform: "uppercase" },
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[0, 730]}
              reversed
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
              label={{
                value: "← More Urgent",
                angle: -90,
                position: "insideLeft",
                offset: 10,
                style: { fontSize: 10, fill: "var(--muted-foreground)", letterSpacing: "0.08em", textTransform: "uppercase" },
              }}
            />
            <ZAxis type="number" dataKey="z" range={[144, 1296]} />
            <ReferenceLine x={50} stroke="var(--border)" strokeDasharray="4 4" />
            <ReferenceLine y={180} stroke="var(--border)" strokeDasharray="4 4" />
            <Tooltip content={<MatrixTooltip />} cursor={{ stroke: "var(--primary)", strokeOpacity: 0.2 }} />
            {CATS.map((cat) => (
              <Scatter
                key={cat}
                name={CATEGORY_META[cat].label}
                data={seriesByCat.get(cat)}
                fill={CATEGORY_META[cat].color}
                fillOpacity={0.85}
                stroke="#fff"
                strokeWidth={2}
                onClick={(d: { account?: ScoredAccount }) => d?.account && openAccount(d.account.id)}
                onMouseEnter={(d: { account?: ScoredAccount }) => setHoverId(d?.account?.id ?? null)}
                onMouseLeave={() => setHoverId(null)}
                isAnimationActive
                animationBegin={CATS.indexOf(cat) * 80}
                animationDuration={700}
                shape={(props: unknown) => <AnimatedDot {...(props as DotProps)} hoverId={hoverId} />}
                className="cursor-pointer"
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 border-t pt-3">
        {CATS.map((c) => (
          <span key={c} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_META[c].color }} />
            {CATEGORY_META[c].label}
          </span>
        ))}
        <span className="ml-auto text-[11px] text-muted-foreground">Bubble size = IT budget</span>
      </div>
    </div>
  );
}

interface DotProps {
  cx?: number;
  cy?: number;
  fill?: string;
  payload?: Point;
  hoverId?: string | null;
}

function AnimatedDot({ cx, cy, fill, payload, hoverId }: DotProps) {
  if (cx == null || cy == null || !payload) return null;
  const z = payload.z;
  // Map ITbudget z (80k..3M) -> radius 8..22
  const min = 80_000;
  const max = 3_000_000;
  const norm = Math.min(1, Math.max(0, (z - min) / (max - min)));
  const r = 8 + norm * 14;
  const hovered = hoverId === payload.account.id;
  return (
    <g style={{ transform: hovered ? "scale(1.15)" : "scale(1)", transformOrigin: `${cx}px ${cy}px`, transition: "transform 150ms" }}>
      <circle cx={cx} cy={cy} r={r} fill={fill} fillOpacity={0.85} stroke="#fff" strokeWidth={2} />
    </g>
  );
}

function MatrixTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Point }> }) {
  if (!active || !payload?.length) return null;
  const a = payload[0].payload.account;
  return (
    <div className="rounded-md border bg-card p-3 text-xs shadow-lg" style={{ minWidth: 200 }}>
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="font-semibold">{a.accountName}</span>
        <CategoryPill category={a.category} />
      </div>
      <div className="space-y-0.5 text-muted-foreground">
        <div>
          Score <span className="font-semibold text-foreground tabular-nums">{a.score}</span>
        </div>
        <div>
          Renews in <span className="font-semibold text-foreground tabular-nums">{a.contractRenewalDays}</span> days
        </div>
        <div>
          Budget <span className="font-semibold text-foreground">{formatCurrencyShort(a.itBudgetUSD)}</span>
        </div>
      </div>
    </div>
  );
}
