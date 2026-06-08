import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp } from "@/state/AppStore";
import { CATEGORY_META } from "@/lib/scoring";
import type { ScoredAccount } from "@/lib/types";

export function TopAccountsBar({ accounts }: { accounts?: ScoredAccount[] } = {}) {
  const { scoredAccounts, openAccount } = useApp();
  const source = accounts ?? scoredAccounts;
  const data = [...source]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((a) => ({
      name: a.accountName.length > 22 ? a.accountName.slice(0, 20) + "…" : a.accountName,
      score: a.score,
      id: a.id,
      color: CATEGORY_META[a.category].color,
    }));

  return (
    <div className="app-card p-5">
      <h3 className="mb-2 text-sm font-semibold">Top 8 by Score</h3>
      <div className="h-64">
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 16, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
            <YAxis
              dataKey="name"
              type="category"
              width={130}
              tick={{ fontSize: 11 }}
              stroke="var(--muted-foreground)"
            />
            <Tooltip
              contentStyle={{
                background: "white",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 12,
              }}
            />
            <Bar
              dataKey="score"
              radius={[0, 4, 4, 0]}
              onClick={(d: { id: string }) => openAccount(d.id)}
              cursor="pointer"
            >
              {data.map((d) => (
                <Cell key={d.id} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
