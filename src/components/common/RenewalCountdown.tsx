import { cn } from "@/lib/utils";

export function RenewalCountdown({
  days,
  className,
}: {
  days: number;
  className?: string;
}) {
  const color =
    days <= 60 ? "var(--hot)" : days <= 180 ? "var(--warm)" : "var(--muted-foreground)";
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-sm font-semibold tabular-nums", className)}
      style={{ color }}
    >
      {days <= 60 && <span aria-hidden>⚠️</span>}
      {days} day{days === 1 ? "" : "s"}
    </span>
  );
}
