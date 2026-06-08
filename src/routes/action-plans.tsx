import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/action-plans")({
  component: ActionPlansLayout,
});

function ActionPlansLayout() {
  return <Outlet />;
}