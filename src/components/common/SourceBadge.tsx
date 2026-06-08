import { RefreshCw, Upload } from "lucide-react";
import type { DataSource } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  source?: DataSource;
  size?: "xs" | "sm";
  className?: string;
}

export function SourceBadge({ source = "active_iq", size = "sm", className }: Props) {
  const isIQ = source === "active_iq";
  const Icon = isIQ ? RefreshCw : Upload;
  const label = isIQ ? "Active IQ" : "Excel Import";
  const bg = isIQ
    ? "color-mix(in oklab, var(--primary) 12%, transparent)"
    : "color-mix(in oklab, var(--success) 14%, transparent)";
  const fg = isIQ ? "var(--on-primary-container)" : "var(--success)";
  const iconSize = size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3";
  const padding = size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wide",
        padding,
        className,
      )}
      style={{ backgroundColor: bg, color: fg }}
      title={isIQ ? "Synced from Active IQ" : "Uploaded via Excel import"}
    >
      <Icon className={iconSize} />
      {label}
    </span>
  );
}
