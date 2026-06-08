import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, ShieldCheck, UserPlus } from "lucide-react";
import { listUsers, createUser, deleteUser, setUserRole } from "@/lib/admin.functions";
import { useAuth } from "@/state/AuthContext";

interface TeamUser {
  id: string;
  email: string;
  name: string;
  region: string;
  isAdmin: boolean;
}

export function TeamManagement() {
  const { user } = useAuth();
  const list = useServerFn(listUsers);
  const create = useServerFn(createUser);
  const remove = useServerFn(deleteUser);
  const setRole = useServerFn(setUserRole);

  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [password, setPassword] = useState("");
  const [makeAdmin, setMakeAdmin] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const res = await list();
      setUsers(res.users as TeamUser[]);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await create({ data: { email: email.trim(), password, name: name.trim(), region: region.trim(), isAdmin: makeAdmin } });
      toast.success("User created");
      setEmail(""); setName(""); setRegion(""); setPassword(""); setMakeAdmin(false);
      await refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  }

  async function onToggleAdmin(u: TeamUser, next: boolean) {
    try {
      await setRole({ data: { userId: u.id, isAdmin: next } });
      toast.success(next ? `${u.name} is now an admin` : `Admin removed from ${u.name}`);
      await refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update role");
    }
  }

  async function onDelete(u: TeamUser) {
    if (!confirm(`Remove ${u.name} (${u.email})? This cannot be undone.`)) return;
    try {
      await remove({ data: { userId: u.id } });
      toast.success("User removed");
      await refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to remove user");
    }
  }

  return (
    <div className="space-y-6">
      <div className="app-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          <h2 className="text-lg font-semibold">Add a sales rep</h2>
        </div>
        <form onSubmit={onCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="t-email">Work email</Label>
            <Input id="t-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="rep@netapp.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-name">Full name</Label>
            <Input id="t-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-region">Region</Label>
            <Input id="t-region" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="West" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-pwd">Temporary password</Label>
            <Input id="t-pwd" type="text" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Switch id="t-admin" checked={makeAdmin} onCheckedChange={setMakeAdmin} />
            <Label htmlFor="t-admin" className="cursor-pointer">Grant admin access</Label>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={submitting} className="pill h-10">
              {submitting ? "Creating…" : "Create user"}
            </Button>
          </div>
        </form>
      </div>

      <div className="app-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Team members</h2>
          <span className="text-xs text-muted-foreground">{users.length} user{users.length === 1 ? "" : "s"}</span>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users yet.</p>
        ) : (
          <ul className="divide-y">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{u.name}</span>
                    {u.isAdmin && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        <ShieldCheck className="h-3 w-3" /> Admin
                      </span>
                    )}
                    {u.id === user?.id && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">You</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{u.email} · {u.region || "—"}</div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Admin</span>
                    <Switch
                      checked={u.isAdmin}
                      onCheckedChange={(v) => onToggleAdmin(u, v)}
                      disabled={u.id === user?.id}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(u)}
                    disabled={u.id === user?.id}
                    aria-label="Remove user"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
