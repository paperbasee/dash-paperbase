"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { BrandingProvider } from "@/context/BrandingContext";
import { SearchModalProvider } from "@/context/SearchModalContext";
import { NotificationProvider } from "@/context/NotificationContext";
import Sidebar, { SidebarContent } from "@/components/Sidebar";
import MobileNavBar from "@/components/MobileNavBar";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

interface MeSubscription {
  active: boolean;
  plan: string | null;
  end_date: string | null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [subscription, setSubscription] = useState<MeSubscription | null>(null);
  const [subChecked, setSubChecked] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    api.get<{ subscription: MeSubscription }>("auth/me/")
      .then(({ data }) => setSubscription(data.subscription))
      .catch(() => setSubscription(null))
      .finally(() => setSubChecked(true));
  }, [isAuthenticated, isLoading]);

  if (isLoading || !isAuthenticated || !subChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!subscription?.active) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-10 text-center shadow-xl ring-1 ring-slate-100">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-3xl">
            🔒
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            No active subscription
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Your account does not have an active plan. Please contact support to
            activate a subscription before accessing the dashboard.
          </p>
          <div className="mt-6 space-y-3">
            <a
              href="mailto:support@yourplatform.com"
              className="block w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              Contact support
            </a>
            <button
              onClick={() => { localStorage.clear(); router.replace("/login"); }}
              className="block w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BrandingProvider>
      <SearchModalProvider>
        <NotificationProvider>
          <div className="min-h-screen bg-muted/30">
            {/* Fixed banner at top - no scroll jitter, pixel-perfect alignment with sidebar header */}
            {!bannerDismissed && (
              <AnnouncementBanner
                onDismiss={() => setBannerDismissed(true)}
                sidebarCollapsed={collapsed}
              />
            )}

            <Sidebar
              collapsed={collapsed}
              onToggle={() => setCollapsed(!collapsed)}
            />

            {/* Mobile sidebar sheet (single instance) */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetContent
                side="left"
                className="w-64 p-0 flex flex-col"
                showCloseButton={true}
              >
                <SheetTitle className="sr-only">Navigation menu</SheetTitle>
                <SidebarContent
                  collapsed={false}
                  onNavigate={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>

            <div
              className={cn(
                "min-h-screen border-t border-border transition-[margin,padding-top] duration-300",
                collapsed ? "md:ml-16" : "md:ml-72",
                !bannerDismissed && "pt-[var(--header-height)]"
              )}
            >
              {/* Mobile: top bar with hamburger */}
              <MobileNavBar
                onMenuClick={() => setMobileOpen(true)}
                bannerVisible={!bannerDismissed}
              />

              <main className="px-4 py-4 md:px-6 md:py-6 lg:px-8">
                <div className="mx-auto max-w-7xl">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </NotificationProvider>
      </SearchModalProvider>
    </BrandingProvider>
  );
}
