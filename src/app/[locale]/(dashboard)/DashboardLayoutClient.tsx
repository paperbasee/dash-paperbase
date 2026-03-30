"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { BookOpenText, History } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { BrandingProvider } from "@/context/BrandingContext";
import { SearchModalProvider } from "@/context/SearchModalContext";
import { NotificationProvider } from "@/context/NotificationContext";
import Sidebar, { SidebarContent } from "@/components/Sidebar";
import MobileNavBar from "@/components/MobileNavBar";
import NotificationDropdown from "@/components/NotificationDropdown";
import SystemNotificationBanner from "@/components/system/SystemNotificationBanner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/subscription-access";
import SubscriptionAccessBlock from "@/components/auth/SubscriptionAccessBlock";

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const tSheet = useTranslations("sheet");
  const tDashboard = useTranslations("dashboard");
  const {
    isAuthenticated,
    isLoading,
    authHydrated,
    meProfile,
    meProfileStatus,
  } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSystemBannerVisible, setMobileSystemBannerVisible] = useState(false);
  const subscription =
    meProfileStatus === "ready" ? (meProfile?.subscription ?? null) : null;
  const storeCount =
    meProfileStatus === "ready" && Array.isArray(meProfile?.stores)
      ? meProfile.stores.length
      : 0;
  const contentContainerClass = "mx-auto w-full max-w-[88rem] px-4 md:px-6 lg:px-8";

  const normalizedPlan = (subscription?.plan ?? "").toLowerCase();
  const isEligiblePlan =
    normalizedPlan === "essential" ||
    normalizedPlan === "premium";
  const meReady = meProfileStatus === "ready";
  const shouldRedirectToOnboarding =
    meReady &&
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
    if (!shouldRedirectToOnboarding) return;
    router.replace("/onboarding");
  }, [shouldRedirectToOnboarding, router]);

  useEffect(() => {
    const root = document.documentElement;
    const syncDashboardInset = () => {
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      root.style.setProperty("--dashboard-main-left-inset", isDesktop ? (collapsed ? "4rem" : "18rem") : "0rem");
    };
    syncDashboardInset();
    window.addEventListener("resize", syncDashboardInset);
    return () => window.removeEventListener("resize", syncDashboardInset);
  }, [collapsed]);

  const authBlocking =
    !authHydrated ||
    isLoading ||
    !isAuthenticated ||
    meProfileStatus === "loading" ||
    (meProfileStatus === "idle" && isAuthenticated);

  if (authBlocking || shouldRedirectToOnboarding) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (meProfileStatus === "error") {
    return <SubscriptionAccessBlock variant="verifyFailed" />;
  }

  if (meProfileStatus === "ready" && meProfile && !hasActiveSubscription(meProfile)) {
    return <SubscriptionAccessBlock variant="inactive" />;
  }

  return (
    <BrandingProvider>
      <SearchModalProvider>
        <NotificationProvider>
          <div className="min-h-screen bg-muted/30">
            <SystemNotificationBanner
              className="md:hidden"
              onPresenceChange={setMobileSystemBannerVisible}
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
                  showSystemNotification={false}
                />
              </SheetContent>
            </Sheet>

            <div
              className={cn(
                "min-h-screen transition-[margin,padding-top] duration-300",
                collapsed ? "md:ml-16" : "md:ml-72"
                ,
                mobileSystemBannerVisible && "pt-[var(--header-height)] md:pt-0"
              )}
            >
              <MobileNavBar
                onMenuClick={() => setMobileOpen(true)}
                bannerVisible={mobileSystemBannerVisible}
              />

              <div className="sticky top-0 z-30 hidden h-[var(--header-height)] border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:block">
                <div className={cn(contentContainerClass, "flex h-full items-center justify-end")}>
                  <div className="flex items-center">
                    <Link href="/activities">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={tDashboard("activitiesAria")}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        <History className="size-5" />
                      </Button>
                    </Link>
                    <a
                      href="https://docs.paperbase.me"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Documentation"
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        <BookOpenText className="size-5" />
                      </Button>
                    </a>
                    <NotificationDropdown />
                  </div>
                </div>
              </div>

              <main className="py-4 md:pt-6 md:pb-6">
                <div className={contentContainerClass}>
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
