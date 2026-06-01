import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ClipboardList, Trophy, Bell, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/state/AppStore";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Dashboard", icon: Home, exact: true },
  { to: "/accounts", label: "Accounts", icon: ClipboardList },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/renewals", label: "Renewal Alerts", icon: Bell, badge: true },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const [open, setOpen] = useState(true);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { scoredAccounts } = useApp();
  const urgentCount = scoredAccounts.filter((a) => a.contractRenewalDays <= 60).length;

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-30 hidden h-screen flex-col border-r bg-sidebar transition-all duration-200 md:flex",
          open ? "w-[220px]" : "w-[64px]",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          {open ? (
            <span className="text-lg font-bold tracking-tight" style={{ color: "var(--primary)" }}>
              NetApp
            </span>
          ) : (
            <span className="text-lg font-bold" style={{ color: "var(--primary)" }}>
              N
            </span>
          )}
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
            aria-label="Toggle sidebar"
          >
            {open ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? path === item.to : path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {open && <span className="flex-1 truncate">{item.label}</span>}
                {open && item.badge && urgentCount > 0 && (
                  <span
                    className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold text-white"
                    style={{ backgroundColor: "var(--hot)" }}
                  >
                    {urgentCount}
                  </span>
                )}
                {!open && item.badge && urgentCount > 0 && (
                  <span
                    className="absolute right-1 top-1 h-2 w-2 rounded-full"
                    style={{ backgroundColor: "var(--hot)" }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-sidebar md:hidden">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.exact ? path === item.to : path.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2 text-[10px]",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{item.label.split(" ")[0]}</span>
              {item.badge && urgentCount > 0 && (
                <span
                  className="absolute right-3 top-1 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: "var(--hot)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export const SIDEBAR_W = { open: 220, closed: 64 };
