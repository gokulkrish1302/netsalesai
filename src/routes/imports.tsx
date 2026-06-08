import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/state/AppStore";
import { ImportHistory } from "@/components/accounts/ImportHistory";
import { InlineImporter } from "@/components/imports/InlineImporter";
import { useModals } from "@/components/modals/ModalsProvider";

export const Route = createFileRoute("/imports")({
  head: () => ({
    meta: [
      { title: "Imports — NetApp Cloud Migration Agent" },
      { name: "description", content: "Upload spreadsheets and review before populating accounts into the tool." },
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
      <div>
        <h1 className="display text-[28px] leading-tight md:text-[32px]">Imports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a spreadsheet, preview the parsed rows, and confirm to populate them into the tool.
          {state.importHistory.length > 0 && (
            <>
              {" "}· {state.importHistory.length} file{state.importHistory.length === 1 ? "" : "s"} ·{" "}
              {total} account{total === 1 ? "" : "s"} added
            </>
          )}
        </p>
      </div>

      <InlineImporter />

      <ImportHistory onImportClick={() => modals.openImport()} defaultOpen />
    </div>
  );
}
