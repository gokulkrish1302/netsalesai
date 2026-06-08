import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { AppProvider } from "@/state/AppStore";
import { AuthProvider } from "@/state/AuthContext";
import { DashboardsProvider } from "@/state/DashboardsContext";
import { DbSync } from "@/state/DbSync";
import { RouteGate, useIsAuthRoute } from "@/components/auth/RouteGate";
import { ModalsProvider } from "@/components/modals/ModalsProvider";
import { AccountDetailPanel } from "@/components/detail/AccountDetailPanel";
import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "visibilitynet" },
      {
        name: "description",
        content:
          "Sales intelligence and account-scoring workspace for NetApp's cloud migration team.",
      },
      { property: "og:title", content: "visibilitynet" },
      { name: "twitter:title", content: "visibilitynet" },
      { name: "description", content: "NetApp Cloud Compass is a sales intelligence tool for NetApp's sales team." },
      { property: "og:description", content: "NetApp Cloud Compass is a sales intelligence tool for NetApp's sales team." },
      { name: "twitter:description", content: "NetApp Cloud Compass is a sales intelligence tool for NetApp's sales team." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a64db1de-ef87-4f6c-8dc6-ebb9851c21b1/id-preview-49d92f94--66e230a6-e893-4a65-9a41-ebb8e8c71fae.lovable.app-1780280366525.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a64db1de-ef87-4f6c-8dc6-ebb9851c21b1/id-preview-49d92f94--66e230a6-e893-4a65-9a41-ebb8e8c71fae.lovable.app-1780280366525.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body style={{ fontFamily: "'Manrope', 'Inter', system-ui, sans-serif" }}>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouteGate>
          <AppShell />
        </RouteGate>
        <Toaster position="bottom-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AppShell() {
  const isAuthRoute = useIsAuthRoute();
  if (isAuthRoute) {
    return <Outlet />;
  }
  return (
    <AppProvider>
      <DashboardsProvider>
        <ModalsProvider>
          <DbSync />
          <div className="min-h-screen bg-background">
            <Sidebar />
            <div className="md:pl-[240px]">
              <TopBar />
              <main className="p-4 pb-20 md:p-8 md:pb-8">
                <Outlet />
              </main>
            </div>
            <AccountDetailPanel />
          </div>
        </ModalsProvider>
      </DashboardsProvider>
    </AppProvider>
  );
}
