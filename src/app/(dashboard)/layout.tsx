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

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
