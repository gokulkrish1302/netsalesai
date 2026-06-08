import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, ClipboardList, Trophy, Bell, Settings, Target } from "lucide-react";
import { useApp } from "@/state/AppStore";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type NavItem = {
  to: "/" | "/accounts" | "/leaderboard" | "/action-plans" | "/renewals" | "/settings";
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
  { to: "/renewals", label: "Renewal Alerts", icon: Bell, badge: "renewals" },
  { to: "/settings", label: "Settings", icon: Settings },
];

export const SIDEBAR_W = 72;

const ACTIVE_PLAN_STAGES = new Set(["contacted", "meeting_scheduled", "proposal_sent"]);

export function Sidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { scoredAccounts, state } = useApp();
  const urgentCount = scoredAccounts.filter((a) => a.contractRenewalDays <= 60).length;
  const planCount = scoredAccounts.filter((a) => {
    const stage = state.pipelineStages[a.id] ?? a.pipelineStage;
    return ACTIVE_PLAN_STAGES.has(stage);
  }).length;

  function badgeCount(b: NavItem["badge"]) {
    if (b === "renewals") return urgentCount;
    if (b === "plans") return planCount;
    return 0;
  }
  function badgeColor(b: NavItem["badge"]) {
    return b === "renewals" ? "var(--hot)" : "var(--primary)";
  }

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className="fixed left-0 top-0 z-30 hidden h-screen flex-col items-center bg-sidebar md:flex"
        style={{ width: SIDEBAR_W }}
      >
        <div className="flex h-16 w-full items-center justify-center">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-base font-bold text-white"
            style={{ backgroundColor: "var(--primary)", fontFamily: "var(--font-display)" }}
          >
            N
          </div>
        </div>
        <nav className="flex w-full flex-col items-center gap-2 py-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? path === item.to : path.startsWith(item.to);
            const count = badgeCount(item.badge);
            return (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>
                  <Link to={item.to} className="group flex flex-col items-center gap-1 py-1" aria-label={item.label}>
                    <span
                      className={cn(
                        "relative flex h-9 w-14 items-center justify-center rounded-full transition-all",
                        active
                          ? "text-on-primary-container"
                          : "text-muted-foreground group-hover:bg-accent group-hover:text-foreground",
                      )}
                      style={active ? { backgroundColor: "var(--primary-container)" } : undefined}
                    >
                      <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                      {item.badge && count > 0 && (
                        <span
                          className="absolute -right-0 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white ring-2 ring-sidebar"
                          style={{ backgroundColor: badgeColor(item.badge) }}
                        >
                          {count}
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-medium transition-colors",
                        active ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {item.label.split(" ")[0]}
                    </span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {item.label}
                  {item.badge && count > 0 && ` · ${count}`}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t bg-sidebar md:hidden">
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
    </TooltipProvider>
  );
}
