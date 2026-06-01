import { useCallback, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileSpreadsheet, Download, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/state/AppStore";
import { parseAccountsWorkbook, buildTemplateWorkbook, type ImportResult } from "@/lib/importAccounts";
import { CATEGORY_META, scoreAccount } from "@/lib/scoring";
import { formatCurrencyShort } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ImportAccountsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { addImportedAccounts } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragging, setDragging] = useState(false);

  const reset = useCallback(() => {
    setFilename(null);
    setResult(null);
    setParsing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large (max 5 MB)");
      return;
    }
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      toast.error("Please upload an .xlsx, .xls, or .csv file");
      return;
    }
    setParsing(true);
    setFilename(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseAccountsWorkbook(buffer, file.name);
      setResult(parsed);
      if (parsed.accounts.length === 0) {
        toast.error("No valid accounts found");
      }
    } catch (err) {
      toast.error("Could not read file — is it a valid spreadsheet?");
      console.error(err);
      reset();
    } finally {
      setParsing(false);
    }
  }, [reset]);

  function downloadTemplate() {
    const buf = buildTemplateWorkbook();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "netapp-accounts-template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  }

  function confirmImport() {
    if (!result?.accounts.length) return;
    addImportedAccounts(result.accounts);
    toast.success(`Imported ${result.accounts.length} account${result.accounts.length === 1 ? "" : "s"}`);
    onOpenChange(false);
    setTimeout(reset, 300);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setTimeout(reset, 300);
      }}
    >
      <DialogContent className="max-w-2xl rounded-3xl p-0 sm:p-0" style={{ boxShadow: "var(--elevation-3)" }}>
        <DialogHeader className="px-6 pb-2 pt-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl"
              style={{ backgroundColor: "var(--primary-container)" }}
            >
              <UploadCloud className="h-5 w-5" style={{ color: "var(--on-primary-container)" }} />
            </div>
            <div>
              <DialogTitle className="display text-xl">Import accounts</DialogTitle>
              <p className="text-xs text-muted-foreground">
                Upload an Excel or CSV file. We'll score new accounts automatically.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6">
          {!result ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFile(f);
                }}
                className={cn(
                  "flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-10 transition-colors",
                  dragging ? "border-primary bg-primary-container" : "border-border bg-surface-1 hover:bg-surface-2",
                )}
                style={dragging ? { backgroundColor: "var(--primary-container)" } : undefined}
              >
                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <div className="text-sm font-medium">
                    {parsing ? "Reading file…" : filename ?? "Drag & drop your spreadsheet"}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    .xlsx, .xls, or .csv · up to 5 MB
                  </div>
                </div>
                <span className="pill mt-2 inline-flex items-center gap-1 bg-card px-4 py-2 text-xs font-medium shadow-sm">
                  Choose file
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />

              <div className="flex items-center justify-between rounded-2xl bg-surface-1 p-4">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Need the right format?</div>
                    <div className="text-xs text-muted-foreground">
                      Download our template with sample rows and the expected columns.
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="pill gap-1.5" onClick={downloadTemplate}>
                  <Download className="h-3.5 w-3.5" />
                  Template
                </Button>
              </div>

              <details className="rounded-2xl bg-surface-1 p-4 text-xs">
                <summary className="cursor-pointer font-medium text-foreground">
                  Recognized columns
                </summary>
                <p className="mt-2 text-muted-foreground">
                  Account Name, Sales Rep, Industry, Region, Company Size, Device Model,
                  Device Age Years, End Of Life, Storage Capacity TB, Utilization %,
                  IT Budget USD, Cloud Status (active_cloud / hybrid / licensed_not_deployed / none),
                  Contract Renewal Days, Annual Revenue, Last Contact Date, Pipeline Stage.
                  Column names are case-insensitive. Missing fields use sensible defaults.
                </p>
              </details>
            </div>
          ) : (
            <ResultView
              result={result}
              filename={filename}
              onReset={reset}
              onConfirm={confirmImport}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResultView({
  result,
  filename,
  onReset,
  onConfirm,
}: {
  result: ImportResult;
  filename: string | null;
  onReset: () => void;
  onConfirm: () => void;
}) {
  const preview = result.accounts.slice(0, 5);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-1 p-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: result.accounts.length ? "var(--primary-container)" : "var(--hot-bg)",
              color: result.accounts.length ? "var(--on-primary-container)" : "var(--hot)",
            }}
          >
            {result.accounts.length ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </div>
          <div>
            <div className="text-sm font-medium">
              {result.accounts.length} of {result.totalRows} rows ready to import
            </div>
            <div className="text-xs text-muted-foreground">{filename}</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="gap-1" onClick={onReset}>
          <X className="h-3.5 w-3.5" />
          Change file
        </Button>
      </div>

      {result.errors.length > 0 && (
        <Notice tone="hot" title={`${result.errors.length} row${result.errors.length === 1 ? "" : "s"} skipped`}>
          <ul className="space-y-0.5">
            {result.errors.slice(0, 4).map((e, i) => (
              <li key={i}>Row {e.row}: {e.message}</li>
            ))}
            {result.errors.length > 4 && <li>…and {result.errors.length - 4} more</li>}
          </ul>
        </Notice>
      )}
      {result.warnings.length > 0 && (
        <Notice tone="warm" title={`${result.warnings.length} default${result.warnings.length === 1 ? "" : "s"} applied`}>
          <ul className="space-y-0.5">
            {result.warnings.slice(0, 3).map((w, i) => (
              <li key={i}>Row {w.row}: {w.message}</li>
            ))}
            {result.warnings.length > 3 && <li>…and {result.warnings.length - 3} more</li>}
          </ul>
        </Notice>
      )}

      {preview.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-surface-1">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <div className="col-span-5">Preview</div>
            <div className="col-span-2">Industry</div>
            <div className="col-span-2">Budget</div>
            <div className="col-span-2">Renewal</div>
            <div className="col-span-1 text-right">Score</div>
          </div>
          {preview.map((a) => {
            const s = scoreAccount(a);
            const color = CATEGORY_META[s.category].color;
            return (
              <div key={a.id} className="grid grid-cols-12 items-center gap-2 border-t px-4 py-2 text-xs">
                <div className="col-span-5 truncate font-medium">{a.accountName}</div>
                <div className="col-span-2 text-muted-foreground">{a.industry}</div>
                <div className="col-span-2 text-muted-foreground">{formatCurrencyShort(a.itBudgetUSD)}</div>
                <div className="col-span-2 text-muted-foreground tabular-nums">{a.contractRenewalDays}d</div>
                <div className="col-span-1 text-right">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white tabular-nums"
                    style={{ backgroundColor: color }}
                  >
                    {s.total}
                  </span>
                </div>
              </div>
            );
          })}
          {result.accounts.length > preview.length && (
            <div className="border-t px-4 py-2 text-[11px] text-muted-foreground">
              …and {result.accounts.length - preview.length} more
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" className="pill" onClick={onReset}>
          Cancel
        </Button>
        <Button className="pill px-5" disabled={result.accounts.length === 0} onClick={onConfirm}>
          Import {result.accounts.length} account{result.accounts.length === 1 ? "" : "s"}
        </Button>
      </div>
    </div>
  );
}

function Notice({ tone, title, children }: { tone: "hot" | "warm"; title: string; children: React.ReactNode }) {
  const bg = tone === "hot" ? "var(--hot-bg)" : "var(--warm-bg)";
  const fg = tone === "hot" ? "var(--hot)" : "var(--warm)";
  return (
    <div className="rounded-2xl p-3 text-xs" style={{ backgroundColor: bg }}>
      <div className="mb-1 flex items-center gap-1.5 font-semibold" style={{ color: fg }}>
        <AlertTriangle className="h-3.5 w-3.5" />
        {title}
      </div>
      <div className="text-foreground/80">{children}</div>
    </div>
  );
}
