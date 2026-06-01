import { useEffect, useState } from "react";
import { CATEGORY_META } from "@/lib/scoring";
import type { Category } from "@/lib/types";

export function ScoreGauge({
  score,
  category,
  size = 160,
}: {
  score: number;
  category: Category;
  size?: number;
}) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);
  useEffect(() => {
    const t = requestAnimationFrame(() =>
      setOffset(circumference - (Math.min(100, score) / 100) * circumference),
    );
    return () => cancelAnimationFrame(t);
  }, [score, circumference]);
  const color = CATEGORY_META[category].color;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={10}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tabular-nums" style={{ color }}>
          {score}
        </span>
        <span className="text-xs text-muted-foreground">of 100</span>
      </div>
    </div>
  );
}
