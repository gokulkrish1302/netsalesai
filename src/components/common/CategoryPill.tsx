import { CATEGORY_META } from "@/lib/scoring";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CategoryPill({ category, className }: { category: Category; className?: string }) {
  const meta = CATEGORY_META[category];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        className,
      )}
      style={{ backgroundColor: meta.bg, color: meta.color }}
    >
      {meta.label}
    </span>
  );
}

export function CategoryDot({ category }: { category: Category }) {
  const meta = CATEGORY_META[category];
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ backgroundColor: meta.color }}
    />
  );
}
