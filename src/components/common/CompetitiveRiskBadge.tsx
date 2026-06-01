import { AlertTriangle } from "lucide-react";

export function CompetitiveRiskBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold"
      style={{ borderColor: "var(--hot)", color: "var(--hot)" }}
    >
      <AlertTriangle className="h-3 w-3" />
      Competitive Risk — AWS/Azure
    </span>
  );
}
