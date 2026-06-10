import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { syncActiveIQ, getLastSync } from "@/lib/activeIq.functions";
import { toast } from "sonner";

export function ActiveIqSync() {
  const sync = useServerFn(syncActiveIQ);
  const last = useServerFn(getLastSync);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<Awaited<ReturnType<typeof getLastSync>>>(null);

  useEffect(() => {
    last().then((r) => setInfo(r)).catch(() => setInfo(null));
  }, [last]);

  async function onSync() {
    setLoading(true);
    const t = toast.loading("Syncing accounts from Active IQ…");
    try {
      const r = await sync();
      toast.success(`Successfully synced ${r.count} accounts`, { id: t });
      const next = await last();
      setInfo(next);
      // Refresh in-memory store with newly synced accounts
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      toast.error("Sync failed — check your Active IQ token in Settings", { id: t });
      console.error(e);
      const next = await last().catch(() => null);
      setInfo(next);
    } finally {
      setLoading(false);
    }
  }

  const lastTs = info?.finished_at ?? info?.started_at;
  const lastLabel = lastTs ? new Date(lastTs).toLocaleString() : "Never";

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-secondary/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">NetApp Active IQ</div>
            <div className="text-xs text-muted-foreground">
              Pulls customers, systems, capacity, risks, and workload patterns from your Active IQ tenant.
            </div>
          </div>
          <Button onClick={onSync} disabled={loading} size="sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Syncing…" : "Sync now"}
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Last sync:</span>
          <span className="font-semibold">{lastLabel}</span>
          {info?.status === "success" && (
            <span className="inline-flex items-center gap-1 text-[var(--success)]">
              <CheckCircle2 className="h-3 w-3" /> {info.account_count ?? 0} accounts
            </span>
          )}
          {info?.status === "error" && (
            <span className="inline-flex items-center gap-1 text-[var(--hot)]">
              <AlertTriangle className="h-3 w-3" /> {info.error_message ?? "Failed"}
            </span>
          )}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        The bearer token is stored as a server-side secret (<code>ACTIVE_IQ_TOKEN</code>) and never sent to the browser.
        To rotate it, update the secret in project settings.
      </p>
    </div>
  );
}
