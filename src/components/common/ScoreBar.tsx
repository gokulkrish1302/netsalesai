import { useEffect, useState } from "react";
import { CATEGORY_META } from "@/lib/scoring";
import type { Category } from "@/lib/types";

export function ScoreBar({
  value,
  max = 100,
  category,
}: {
  value: number;
  max?: number;
  category: Category;
}) {
  const [w, setW] = useState(0);
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  useEffect(() => {
    const t = requestAnimationFrame(() => setW(pct));
    return () => cancelAnimationFrame(t);
  }, [pct]);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className="h-full rounded-full transition-[width] duration-[600ms] ease-out"
        style={{ width: `${w}%`, backgroundColor: CATEGORY_META[category].color }}
      />
    </div>
  );
}
