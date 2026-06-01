import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "./GlobalSearch";
import { toast } from "sonner";

export function TopBar() {
  const [syncing, setSyncing] = useState(false);
  function sync() {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      toast.success("📊 Data refreshed — 20 accounts updated");
    }, 1500);
  }
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-card/80 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-2">
        <span className="pulse-dot inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "var(--success)" }} />
        <span className="label-eyebrow">Active IQ · Live</span>
      </div>
      <div className="flex-1 max-w-xl">
        <GlobalSearch />
      </div>
      <Button variant="outline" size="sm" onClick={sync} disabled={syncing} className="gap-2">
        <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline">Sync</span>
      </Button>
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ backgroundColor: "var(--primary)" }}
      >
        JD
      </div>
    </header>
  );
}
