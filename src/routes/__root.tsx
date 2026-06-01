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
import { ModalsProvider } from "@/components/modals/ModalsProvider";
import { AccountDetailPanel } from "@/components/detail/AccountDetailPanel";
import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "NetApp Cloud Migration Agent" },
      {
        name: "description",
        content:
          "Sales intelligence and account-scoring workspace for NetApp's cloud migration team.",
      },
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
            <Toaster position="bottom-right" />
          </div>
        </ModalsProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}
