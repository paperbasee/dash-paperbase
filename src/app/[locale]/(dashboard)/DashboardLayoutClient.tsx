"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { BrandingProvider } from "@/context/BrandingContext";
import { SearchModalProvider } from "@/context/SearchModalContext";
import { NotificationProvider } from "@/context/NotificationContext";
import Sidebar, { SidebarContent } from "@/components/Sidebar";
import MobileNavBar from "@/components/MobileNavBar";
import SystemNotificationBanner from "@/components/system/SystemNotificationBanner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth";
import {
  fetchMeForRouting,
  hasActiveSubscription,
  type MeForRouting,
} from "@/lib/subscription-access";
import SubscriptionAccessBlock from "@/components/auth/SubscriptionAccessBlock";

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const tSheet = useTranslations("sheet");
  const { isAuthenticated, isLoading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [systemBannerVisible, setSystemBannerVisible] = useState(false);
  const [me, setMe] = useState<MeForRouting | null>(null);
  const subscription = me?.subscription ?? null;
  const storeCount = Array.isArray(me?.stores) ? me.stores.length : 0;
  const [subChecked, setSubChecked] = useState(false);
  const [subCheckError, setSubCheckError] = useState(false);

  const normalizedPlan = (subscription?.plan ?? "").toLowerCase();
  const isEligiblePlan =
    normalizedPlan === "essential" ||
    normalizedPlan === "premium";
  const shouldRedirectToOnboarding =
    subChecked &&
    pathname === "/" &&
    subscription?.active === true &&
    isEligiblePlan &&
    storeCount === 0;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      logout();
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    fetchMeForRouting()
      .then((data) => {
        setMe(data);
        setSubCheckError(false);
      })
      .catch(() => {
        setMe(null);
        setSubCheckError(true);
      })
      .finally(() => setSubChecked(true));
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (!shouldRedirectToOnboarding) return;
    router.replace("/onboarding");
  }, [shouldRedirectToOnboarding, router]);

  if (isLoading || !isAuthenticated || !subChecked || shouldRedirectToOnboarding) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (subCheckError) {
    return <SubscriptionAccessBlock variant="verifyFailed" />;
  }

  if (me && !hasActiveSubscription(me)) {
    return <SubscriptionAccessBlock variant="inactive" />;
  }

  const showSystemBanner = systemBannerVisible;

  return (
    <BrandingProvider>
      <SearchModalProvider>
        <NotificationProvider>
          <div className="min-h-screen bg-muted/30">
            <SystemNotificationBanner
              onPresenceChange={setSystemBannerVisible}
              sidebarCollapsed={collapsed}
            />

            <Sidebar
              collapsed={collapsed}
              onToggle={() => setCollapsed(!collapsed)}
            />

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetContent
                side="left"
                className="w-64 p-0 flex flex-col"
                showCloseButton={true}
              >
                <SheetTitle className="sr-only">
                  {tSheet("navigationMenu")}
                </SheetTitle>
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
                showSystemBanner && "pt-[var(--header-height)]"
              )}
            >
              <MobileNavBar
                onMenuClick={() => setMobileOpen(true)}
                bannerVisible={showSystemBanner}
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
