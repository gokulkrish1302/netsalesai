import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { UploadCloud, FileSpreadsheet, Download, X, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/state/AppStore";
import { parseAccountsWorkbook, buildTemplateWorkbook, type ImportResult } from "@/lib/importAccounts";
import { CATEGORY_META, scoreAccount } from "@/lib/scoring";
import { formatCurrencyShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Account } from "@/lib/types";

interface StagedFile {
  id: string;
  filename: string;
  result: ImportResult;
}

export function InlineImporter() {
  const { addImportedAccounts } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allAccounts = useMemo(
    () => staged.flatMap((s) => s.result.accounts.map((a) => ({ a, fileId: s.id }))),
    [staged],
  );
  const allIds = useMemo(() => allAccounts.map((x) => x.a.id), [allAccounts]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = !allSelected && allIds.some((id) => selected.has(id));

  const handleFiles = useCallback(async (files: File[]) => {
    setParsing(true);
    const newStaged: StagedFile[] = [];
    const newlySelected: string[] = [];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5 MB)`);
        continue;
      }
      if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
        toast.error(`${file.name} is not an .xlsx, .xls, or .csv file`);
        continue;
      }
      try {
        const buffer = await file.arrayBuffer();
        const parsed = parseAccountsWorkbook(buffer, file.name);
        if (parsed.accounts.length === 0) {
          toast.error(`No valid accounts in ${file.name}`);
          continue;
        }
        const id = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        newStaged.push({ id, filename: file.name, result: parsed });
        newlySelected.push(...parsed.accounts.map((a) => a.id));
      } catch (err) {
        console.error(err);
        toast.error(`Could not read ${file.name}`);
      }
    }
    if (newStaged.length) {
      setStaged((prev) => [...prev, ...newStaged]);
      setSelected((prev) => {
        const next = new Set(prev);
        newlySelected.forEach((id) => next.add(id));
        return next;
      });
      toast.message(`Staged ${newStaged.length} file${newStaged.length === 1 ? "" : "s"} — review and select accounts to populate.`);
    }
    setParsing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

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

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (allSelected) return new Set();
      const next = new Set(prev);
      allIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function removeFile(fileId: string) {
    const file = staged.find((s) => s.id === fileId);
    if (!file) return;
    setStaged((prev) => prev.filter((s) => s.id !== fileId));
    setSelected((prev) => {
      const next = new Set(prev);
      file.result.accounts.forEach((a) => next.delete(a.id));
      return next;
    });
  }

  function clearAll() {
    setStaged([]);
    setSelected(new Set());
  }

  function populate() {
    if (selected.size === 0) return;
    // Group selected accounts by their source file so each populated batch keeps its filename
    const byFile = new Map<string, { filename: string; accounts: Account[] }>();
    for (const s of staged) {
      const picked = s.result.accounts.filter((a) => selected.has(a.id));
      if (picked.length) byFile.set(s.id, { filename: s.filename, accounts: picked });
    }
    let total = 0;
    for (const { filename, accounts } of byFile.values()) {
      addImportedAccounts(accounts, filename);
      total += accounts.length;
    }
    toast.success(`Populated ${total} account${total === 1 ? "" : "s"} to the tool`);
    // Remove fully consumed files; keep partials with remaining accounts
    setStaged((prev) =>
      prev
        .map((s) => ({ ...s, result: { ...s.result, accounts: s.result.accounts.filter((a) => !selected.has(a.id)) } }))
        .filter((s) => s.result.accounts.length > 0),
    );
    setSelected(new Set());
  }

  return (
    <div className="space-y-4">
      <div className="app-card space-y-4 p-5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const fs = Array.from(e.dataTransfer.files ?? []);
            if (fs.length) handleFiles(fs);
          }}
          className={cn(
            "flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-8 transition-colors",
            dragging ? "border-primary" : "border-border bg-surface-1 hover:bg-surface-2",
          )}
          style={dragging ? { backgroundColor: "var(--primary-container)" } : undefined}
        >
          <UploadCloud className="h-8 w-8 text-muted-foreground" />
          <div className="text-center">
            <div className="text-sm font-medium">
              {parsing ? "Reading files…" : staged.length ? "Add more files" : "Drag & drop spreadsheets"}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              .xlsx, .xls, or .csv · multiple files supported · up to 5 MB each
            </div>
          </div>
          <span className="pill mt-1 inline-flex items-center gap-1 bg-card px-4 py-2 text-xs font-medium shadow-sm">
            <Plus className="h-3.5 w-3.5" /> Choose files
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          multiple
          className="hidden"
          onChange={(e) => {
            const fs = Array.from(e.target.files ?? []);
            if (fs.length) handleFiles(fs);
          }}
        />
        <div className="flex items-center justify-between rounded-2xl bg-surface-1 p-3">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
            <div className="text-xs text-muted-foreground">Need the right format? Grab the template.</div>
          </div>
          <Button variant="outline" size="sm" className="pill gap-1.5" onClick={downloadTemplate}>
            <Download className="h-3.5 w-3.5" /> Template
          </Button>
        </div>
      </div>

      {staged.length > 0 && (
        <div className="app-card space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">
                {staged.length} file{staged.length === 1 ? "" : "s"} staged · {allIds.length} account{allIds.length === 1 ? "" : "s"}
              </div>
              <div className="text-xs text-muted-foreground">
                {selected.size} selected · nothing is added until you populate
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="pill" onClick={clearAll}>
                <X className="h-3.5 w-3.5" /> Clear all
              </Button>
              <Button size="sm" className="pill px-4" disabled={selected.size === 0} onClick={populate}>
                Populate {selected.size} to tool
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-surface-1 px-3 py-2">
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={toggleAll}
              aria-label="Select all accounts"
            />
            <span className="text-xs font-medium">Select all</span>
          </div>

          <div className="space-y-4">
            {staged.map((s) => (
              <FileBlock
                key={s.id}
                file={s}
                selected={selected}
                onToggle={toggleOne}
                onToggleFile={(checked) => {
                  setSelected((prev) => {
                    const next = new Set(prev);
                    s.result.accounts.forEach((a) => {
                      if (checked) next.add(a.id);
                      else next.delete(a.id);
                    });
                    return next;
                  });
                }}
                onRemove={() => removeFile(s.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FileBlock({
  file,
  selected,
  onToggle,
  onToggleFile,
  onRemove,
}: {
  file: StagedFile;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleFile: (checked: boolean) => void;
  onRemove: () => void;
}) {
  const accounts = file.result.accounts;
  const allChecked = accounts.length > 0 && accounts.every((a) => selected.has(a.id));
  const someChecked = !allChecked && accounts.some((a) => selected.has(a.id));
  const pickedCount = accounts.filter((a) => selected.has(a.id)).length;

  return (
    <div className="overflow-hidden rounded-2xl border">
      <div className="flex items-center justify-between gap-3 bg-surface-1 px-4 py-3">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={allChecked ? true : someChecked ? "indeterminate" : false}
            onCheckedChange={(c) => onToggleFile(c === true)}
            aria-label={`Select all from ${file.filename}`}
          />
          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-sm font-medium">{file.filename}</div>
            <div className="text-xs text-muted-foreground">
              {pickedCount}/{accounts.length} selected · {file.result.totalRows} rows parsed
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {(file.result.errors.length > 0 || file.result.warnings.length > 0) && (
        <div className="space-y-2 border-t bg-card px-4 py-2 text-[11px]">
          {file.result.errors.length > 0 && (
            <div className="flex items-start gap-1.5" style={{ color: "var(--hot)" }}>
              <AlertTriangle className="mt-0.5 h-3 w-3" />
              <span>{file.result.errors.length} row(s) skipped</span>
            </div>
          )}
          {file.result.warnings.length > 0 && (
            <div className="flex items-start gap-1.5" style={{ color: "var(--warm)" }}>
              <AlertTriangle className="mt-0.5 h-3 w-3" />
              <span>{file.result.warnings.length} default(s) applied</span>
            </div>
          )}
        </div>
      )}

      <div className="max-h-72 overflow-y-auto">
        <div className="grid grid-cols-12 gap-2 border-t bg-surface-1 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <div className="col-span-1" />
          <div className="col-span-4">Account</div>
          <div className="col-span-2">Industry</div>
          <div className="col-span-2">Budget</div>
          <div className="col-span-2">Renewal</div>
          <div className="col-span-1 text-right">Score</div>
        </div>
        {accounts.map((a) => {
          const s = scoreAccount(a);
          const color = CATEGORY_META[s.category].color;
          const checked = selected.has(a.id);
          return (
            <label
              key={a.id}
              className={cn(
                "grid cursor-pointer grid-cols-12 items-center gap-2 border-t px-4 py-2 text-xs transition-colors",
                checked ? "bg-primary/5" : "hover:bg-surface-1",
              )}
            >
              <div className="col-span-1">
                <Checkbox checked={checked} onCheckedChange={() => onToggle(a.id)} aria-label={`Select ${a.accountName}`} />
              </div>
              <div className="col-span-4 truncate font-medium">{a.accountName}</div>
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
            </label>
          );
        })}
      </div>
    </div>
  );
}
