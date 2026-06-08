import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet } from "lucide-react";
import { useApp } from "@/state/AppStore";
import { useModals } from "@/components/modals/ModalsProvider";
import { ImportHistory } from "@/components/accounts/ImportHistory";

export const Route = createFileRoute("/imports")({
  head: () => ({
    meta: [
      { title: "Imports — NetApp Cloud Migration Agent" },
      { name: "description", content: "Review every spreadsheet imported into the tool." },
    ],
  }),
  component: ImportsPage,
});

function ImportsPage() {
  const { state } = useApp();
  const modals = useModals();
  const total = state.importHistory.reduce((s, r) => s + r.count, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[28px] leading-tight md:text-[32px]">Imports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {state.importHistory.length} file{state.importHistory.length === 1 ? "" : "s"} ·{" "}
            {total} account{total === 1 ? "" : "s"} added
          </p>
        </div>
        <Button onClick={() => modals.openImport()} className="pill h-10 gap-2 px-4">
          <Upload className="h-4 w-4" />
          Import from Excel
        </Button>
      </div>

      <ImportHistory onImportClick={() => modals.openImport()} defaultOpen />

      {state.importHistory.length === 0 && (
        <div className="app-card flex flex-col items-center gap-3 p-12 text-center">
          <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No spreadsheets imported yet. Upload an Excel or CSV file to get started.
          </p>
        </div>
      )}
    </div>
  );
}
