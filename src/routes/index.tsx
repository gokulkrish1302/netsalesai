import { createFileRoute } from "@tanstack/react-router";
import { StatStrip } from "@/components/dashboard/StatStrip";
import { PriorityMatrix } from "@/components/dashboard/PriorityMatrix";
import { TopPriorityCard } from "@/components/dashboard/TopPriorityCard";
import { RenewalRadar } from "@/components/dashboard/RenewalRadar";
import { AlertBanner } from "@/components/dashboard/AlertBanner";

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
  return (
    <div className="-mx-4 md:-mx-6">
      <div className="px-4 pb-2 pt-1 md:px-6">
        <span className="label-eyebrow">Intelligence Briefing</span>
        <h1 className="serif mt-1 text-3xl tracking-tight" style={{ letterSpacing: "-0.02em" }}>
          Cloud migration outlook
        </h1>
      </div>
      <StatStrip />
      <div className="px-4 pt-5 md:px-6">
        <AlertBanner />
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <PriorityMatrix />
          </div>
          <div className="flex flex-col gap-5 lg:col-span-2">
            <TopPriorityCard />
            <RenewalRadar />
          </div>
        </div>
      </div>
    </div>
  );
}
