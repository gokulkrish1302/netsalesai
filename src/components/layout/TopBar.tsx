import { useState } from "react";
import { RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "./GlobalSearch";
import { toast } from "sonner";
import { useModals } from "@/components/modals/ModalsProvider";

export function TopBar() {
  const [syncing, setSyncing] = useState(false);
  const modals = useModals();
  function sync() {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      toast.success("Active IQ refreshed");
    }, 1500);
  }
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 bg-background/85 px-4 backdrop-blur-md md:px-6">
      <div className="hidden items-center gap-2 md:flex">
        <span className="pulse-dot inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "var(--success)" }} />
        <span className="text-xs font-medium text-muted-foreground">Active IQ · Live</span>
      </div>
      <div className="flex-1 max-w-2xl mx-auto">
        <GlobalSearch />
      </div>
      <Button
        onClick={() => modals.openImport()}
        size="sm"
        className="pill h-10 gap-2 px-4 font-medium shadow-sm"
      >
        <Upload className="h-4 w-4" />
        <span className="hidden sm:inline">Import accounts</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={sync}
        disabled={syncing}
        className="pill h-10 gap-2 px-4"
      >
        <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline">Sync</span>
      </Button>
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ backgroundColor: "var(--primary)" }}
        aria-label="Account"
      >
        CH
      </div>
    </header>
  );
}
