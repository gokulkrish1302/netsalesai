import { CATEGORY_META } from "@/lib/scoring";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ScoreBadge({
  score,
  category,
  size = "md",
  className,
}: {
  score: number;
  category: Category;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const meta = CATEGORY_META[category];
  const dims =
    size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-20 w-20 text-2xl" : "h-12 w-12 text-base";
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full font-bold tabular-nums",
        dims,
        className,
      )}
      style={{ backgroundColor: meta.color, color: "white" }}
    >
      {score}
    </div>
  );
}

export function ScorePill({ score, category }: { score: number; category: Category }) {
  const meta = CATEGORY_META[category];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums"
      style={{ backgroundColor: meta.bg, color: meta.color }}
    >
      {score}
    </span>
  );
}
