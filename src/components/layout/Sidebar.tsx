import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, ClipboardList, Trophy, Bell, Settings, Target, Upload } from "lucide-react";
import { useApp } from "@/state/AppStore";
import { cn } from "@/lib/utils";

type NavItem = {
  to: "/" | "/accounts" | "/leaderboard" | "/action-plans" | "/renewals" | "/imports" | "/settings";
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  badge?: "renewals" | "plans";
};

const items: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/accounts", label: "Accounts", icon: ClipboardList },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/action-plans", label: "Action Plans", icon: Target, badge: "plans" },
  { to: "/renewals", label: "Renewals", icon: Bell, badge: "renewals" },
  { to: "/imports", label: "Imports", icon: Upload },
  { to: "/settings", label: "Settings", icon: Settings },
];

export const SIDEBAR_W = 240;

export function Sidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { scoredAccounts, activePlanCount } = useApp();
  const urgentCount = scoredAccounts.filter((a) => a.contractRenewalDays <= 60).length;
  const planCount = activePlanCount;

  function badgeCount(b: NavItem["badge"]) {
    if (b === "renewals") return urgentCount;
    if (b === "plans") return planCount;
    return 0;
  }
  function badgeColor(b: NavItem["badge"]) {
    return b === "renewals" ? "var(--hot)" : "var(--primary)";
  }

  return (
    <>
      <aside
        className="fixed left-0 top-0 z-30 hidden h-screen flex-col border-r bg-sidebar md:flex"
        style={{ width: SIDEBAR_W }}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 px-5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-base font-bold text-white"
            style={{ backgroundColor: "var(--primary)", fontFamily: "var(--font-display)" }}
          >
            N
          </div>
          <div className="flex flex-col leading-tight">
            <span
              className="text-[15px] font-semibold tracking-tight text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Cloud Compass
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              by NetApp
            </span>
          </div>
        </div>

        <div className="mx-3 mb-2 mt-1 h-px bg-border/70" />

        <nav className="flex-1 space-y-1 px-3 pt-1">
          <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Workspace
          </div>
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? path === item.to : path.startsWith(item.to);
            const count = badgeCount(item.badge);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary-container text-on-primary-container"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && count > 0 && (
                  <span
                    className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold text-white"
                    style={{ backgroundColor: badgeColor(item.badge) }}
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer tip */}
        <div className="mx-3 mb-4 mt-2 rounded-xl border bg-card p-3">
          <div className="text-[11px] font-semibold text-foreground">Need a hand?</div>
          <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            Press <kbd className="rounded border bg-muted px-1 text-[10px]">⌘ K</kbd> to search anywhere.
          </div>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-7 border-t bg-sidebar md:hidden">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.exact ? path === item.to : path.startsWith(item.to);
          const count = badgeCount(item.badge);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2 text-[10px]",
                active ? "text-on-primary-container" : "text-muted-foreground",
              )}
            >
              <span
                className="flex h-7 w-12 items-center justify-center rounded-full"
                style={active ? { backgroundColor: "var(--primary-container)" } : undefined}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="truncate">{item.label.split(" ")[0]}</span>
              {item.badge && count > 0 && (
                <span
                  className="absolute right-3 top-1 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: badgeColor(item.badge) }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
