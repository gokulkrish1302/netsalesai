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
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap",
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
        <style>{`
          /* Map our font tokens to the loaded Google web fonts.
             "Google Sans" / "Google Sans Text" are not on Google Fonts as direct
             names, so we fall back to DM Sans (very similar geometric humanist) + Inter. */
          @font-face { font-family: "Google Sans"; src: local("Google Sans"), local("DM Sans"); font-display: swap; }
          @font-face { font-family: "Google Sans Text"; src: local("Google Sans Text"), local("Inter"); font-display: swap; }
        `}</style>
      </head>
      <body style={{ fontFamily: "'Google Sans Text', 'Inter', system-ui, sans-serif" }}>
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
      <ModalsProvider>
        <div className="min-h-screen bg-background">
          <Sidebar />
          <div className="md:pl-[72px]">
            <TopBar />
            <main className="p-4 pb-20 md:p-8 md:pb-8">
              <Outlet />
            </main>
          </div>
          <AccountDetailPanel />
        </div>
      </ModalsProvider>
    </AppProvider>
  );
}
