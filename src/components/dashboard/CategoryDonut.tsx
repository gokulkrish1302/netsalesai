import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useApp } from "@/state/AppStore";
import { CATEGORY_META } from "@/lib/scoring";
import type { Category, ScoredAccount } from "@/lib/types";

const ORDER: Category[] = ["HOT", "WARM", "COLD", "NOT_READY"];

export function CategoryDonut({ accounts }: { accounts?: ScoredAccount[] } = {}) {
  const { scoredAccounts } = useApp();
  const source = accounts ?? scoredAccounts;
  const data = ORDER.map((c) => ({
    name: CATEGORY_META[c].label,
    value: source.filter((a) => a.category === c).length,
    color: CATEGORY_META[c].color,
  }));
  const total = source.length;
  return (
    <div className="app-card p-5">
      <h3 className="mb-2 text-sm font-semibold">Account Mix</h3>
      <div className="relative h-64">
        <ResponsiveContainer>
          <PieChart>
            <Tooltip
              contentStyle={{
                background: "white",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 12,
              }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums">{total}</span>
          <span className="text-xs text-muted-foreground">accounts</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="flex-1 text-muted-foreground">{d.name}</span>
            <span className="font-semibold tabular-nums">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
