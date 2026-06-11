import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Sparkles, Upload, RefreshCw } from "lucide-react";

export function EmptyAccountsState({ onImport }: { onImport: () => void }) {
  return (
    <div className="app-card flex flex-col items-center gap-4 p-12 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ backgroundColor: "var(--primary-container)" }}
      >
        <Sparkles className="h-7 w-7" style={{ color: "var(--on-primary-container)" }} />
      </div>
      <div className="max-w-md space-y-2">
        <h2 className="display text-xl">Welcome to NetApp Cloud Compass</h2>
        <p className="text-sm text-muted-foreground">
          Import your accounts via Excel or sync with Active IQ to get started.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        <Button className="pill gap-2" onClick={onImport}>
          <Upload className="h-4 w-4" /> Import Excel
        </Button>
        <Button asChild variant="outline" className="pill gap-2">
          <Link to="/imports">
            <Upload className="h-4 w-4" /> Go to Imports
          </Link>
        </Button>
        <Button asChild variant="ghost" className="pill gap-2">
          <Link to="/settings">
            <RefreshCw className="h-4 w-4" /> Sync Active IQ
          </Link>
        </Button>
      </div>
    </div>
  );
}
