import { createFileRoute } from "@tanstack/react-router";
import { KpiRow } from "@/components/dashboard/KpiRow";
import { AlertBanner } from "@/components/dashboard/AlertBanner";
import { FocusCard } from "@/components/dashboard/FocusCard";
import { CategoryDonut } from "@/components/dashboard/CategoryDonut";
import { TopAccountsBar } from "@/components/dashboard/TopAccountsBar";
import { PriorityTable } from "@/components/dashboard/PriorityTable";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — NetApp Cloud Migration Agent" },
      {
        name: "description",
        content:
          "Overview of HOT leads, pipeline value, and renewal urgency across NetApp's enterprise accounts.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Cloud migration opportunity across 20 enterprise accounts
        </p>
      </div>
      <KpiRow />
      <AlertBanner />
      <FocusCard />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CategoryDonut />
        <TopAccountsBar />
      </div>
      <PriorityTable />
    </div>
  );
}
