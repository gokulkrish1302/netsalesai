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
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
      <div className="flex-1">
        <GlobalSearch />
      </div>
      <Button variant="outline" onClick={sync} disabled={syncing} className="gap-2">
        <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline">Sync Active IQ</span>
      </Button>
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ backgroundColor: "var(--primary)" }}
      >
        JD
      </div>
    </header>
  );
}
