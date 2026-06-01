import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useApp } from "@/state/AppStore";
import { Button } from "@/components/ui/button";

export function AlertBanner() {
  const { scoredAccounts } = useApp();
  const count = scoredAccounts.filter((a) => a.contractRenewalDays <= 60).length;
  if (count === 0) return null;
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 text-sm"
      style={{ backgroundColor: "var(--warm-bg)", borderColor: "var(--warm)" }}
    >
      <div className="flex items-start gap-3" style={{ color: "var(--warm)" }}>
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="font-medium text-foreground">
          <span style={{ color: "var(--warm)" }}>{count} accounts</span> have contracts renewing
          within 60 days — review before they go cold
        </p>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link to="/renewals">View Renewal Alerts →</Link>
      </Button>
    </div>
  );
}
