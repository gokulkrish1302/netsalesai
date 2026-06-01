import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, ClipboardList, Trophy, Bell, Settings } from "lucide-react";
import { useApp } from "@/state/AppStore";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type NavItem = {
  to: "/" | "/accounts" | "/leaderboard" | "/renewals" | "/settings";
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  badge?: boolean;
};

const items: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/accounts", label: "Accounts", icon: ClipboardList },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/renewals", label: "Renewal Alerts", icon: Bell, badge: true },
  { to: "/settings", label: "Settings", icon: Settings },
];

export const SIDEBAR_W = 56;

export function Sidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { scoredAccounts } = useApp();
  const urgentCount = scoredAccounts.filter((a) => a.contractRenewalDays <= 60).length;

  return (
    <TooltipProvider delayDuration={150}>
      {/* Desktop slim sidebar */}
      <aside
        className="fixed left-0 top-0 z-30 hidden h-screen flex-col items-center bg-sidebar md:flex"
        style={{ width: SIDEBAR_W, boxShadow: "1px 0 0 0 var(--border)" }}
      >
        <div
          className="serif flex h-14 w-full items-center justify-center text-2xl font-bold"
          style={{ color: "var(--primary)", letterSpacing: "-0.02em" }}
        >
          N
        </div>
        <nav className="flex w-full flex-col items-center gap-1 py-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? path === item.to : path.startsWith(item.to);
            return (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.to}
                    className={cn(
                      "relative flex h-12 w-12 items-center justify-center rounded-md transition-colors",
                      active ? "text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                    aria-label={item.label}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r"
                        style={{ backgroundColor: "var(--primary)" }}
                      />
                    )}
                    <Icon className="h-5 w-5" />
                    {item.badge && urgentCount > 0 && (
                      <span
                        className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-white"
                        style={{ backgroundColor: "var(--hot)" }}
                      />
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {item.label}
                  {item.badge && urgentCount > 0 && ` · ${urgentCount}`}
                </TooltipContent>
              </Tooltip>
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
    </TooltipProvider>
  );
}
