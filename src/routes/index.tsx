import { createFileRoute } from "@tanstack/react-router";
import { StatStrip } from "@/components/dashboard/StatStrip";
import { PriorityMatrix } from "@/components/dashboard/PriorityMatrix";
import { TopPriorityCard } from "@/components/dashboard/TopPriorityCard";
import { RenewalRadar } from "@/components/dashboard/RenewalRadar";
import { AlertBanner } from "@/components/dashboard/AlertBanner";
import { useAuth } from "@/state/AuthContext";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — NetApp Cloud Migration Agent" },
      {
        name: "description",
        content:
          "Priority matrix and renewal radar across NetApp's enterprise cloud migration portfolio.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { rep, user } = useAuth();
  const source = rep?.name || user?.email?.split("@")[0] || "there";
  const firstName = source.split(/[\s.]+/)[0].replace(/^./, (c) => c.toUpperCase());
  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-[28px] leading-tight md:text-[32px]">
          Good day, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here's where your portfolio stands today.
        </p>
      </div>
      <StatStrip />
      <AlertBanner />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <PriorityMatrix />
        </div>
        <div className="flex flex-col gap-5 lg:col-span-2">
          <TopPriorityCard />
          <RenewalRadar />
        </div>
      </div>
    </div>
  );
}
