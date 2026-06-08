import { useState } from "react";
import { useDashboards } from "@/state/DashboardsContext";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CustomizeDashboardSheet } from "@/components/dashboard/CustomizeDashboardSheet";
import { MoreHorizontal, Plus, Settings2, Star, Pencil, Trash2 } from "lucide-react";

export function DashboardBar() {
  const { dashboards, active, activeId, setActiveId, create, rename, remove, setDefault } = useDashboards();
  const [customizing, setCustomizing] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [draftName, setDraftName] = useState("");

  if (!active || !activeId) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={activeId} onValueChange={setActiveId}>
        <SelectTrigger className="h-9 w-[220px] rounded-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {dashboards.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              <span className="flex items-center gap-2">
                {d.is_default && <Star className="h-3 w-3 fill-current text-amber-500" />}
                {d.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button size="sm" variant="outline" className="rounded-full" onClick={() => setCustomizing(true)}>
        <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Customize
      </Button>

      <Button size="sm" variant="ghost" className="rounded-full" onClick={() => { setDraftName(""); setNewOpen(true); }}>
        <Plus className="mr-1 h-3.5 w-3.5" /> New
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" aria-label="Dashboard options">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => { setDraftName(active.name); setRenameOpen(true); }}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={active.is_default}
            onClick={() => setDefault(active.id)}
          >
            <Star className="mr-2 h-3.5 w-3.5" /> Set as default
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={dashboards.length <= 1}
            className="text-destructive focus:text-destructive"
            onClick={() => remove(active.id)}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CustomizeDashboardSheet open={customizing} onOpenChange={setCustomizing} />

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New dashboard</DialogTitle></DialogHeader>
          <Input
            placeholder="e.g. Renewals view"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => { await create(draftName); setNewOpen(false); }}
            >Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename dashboard</DialogTitle></DialogHeader>
          <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} autoFocus />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await rename(active.id, draftName); setRenameOpen(false); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
