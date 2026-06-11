import { useState } from "react";
import { useApp } from "@/state/AppStore";
import { useAuth } from "@/state/AuthContext";
import { Button } from "@/components/ui/button";
import { ChevronDown, FileSpreadsheet, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { deleteImportedFile } from "@/lib/imports.client";

export function ImportHistory({ onImportClick, defaultOpen = false }: { onImportClick: () => void; defaultOpen?: boolean }) {
  const { state } = useApp();
  const { rep } = useAuth();

  const [open, setOpen] = useState(defaultOpen);
  const records = state.importHistory;
  const total = records.reduce((s, r) => s + r.count, 0);

  return (
    <div className="app-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ backgroundColor: "var(--primary-container)" }}
          >
            <FileSpreadsheet className="h-4 w-4" style={{ color: "var(--on-primary-container)" }} />
          </div>
          <div>
            <div className="text-sm font-semibold">Imported files</div>
            <div className="text-xs text-muted-foreground">
              {records.length === 0
                ? "No spreadsheets imported yet"
                : `${records.length} file${records.length === 1 ? "" : "s"} · ${total} account${total === 1 ? "" : "s"} added`}
            </div>
          </div>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="border-t">
          {records.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Imports appear here after you upload an Excel or CSV file.
              </p>
              <Button size="sm" variant="outline" className="pill gap-2" onClick={onImportClick}>
                <Upload className="h-3.5 w-3.5" /> Import file
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {records.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{r.filename}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(r.importedAt)} · {r.count} account{r.count === 1 ? "" : "s"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-muted-foreground hover:text-[color:var(--hot)]"
                    onClick={() => {
                      removeImportRecord(r.id);
                      toast.success(`Removed ${r.filename}`);
                    }}
                    aria-label={`Remove ${r.filename}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
