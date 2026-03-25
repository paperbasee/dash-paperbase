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
import { Button } from "@/components/ui/button";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { logout } from "@/lib/auth";

interface MeSubscription {
  active: boolean;
  plan: string | null;
  end_date: string | null;
}

interface MeResponse {
  subscription: MeSubscription;
  stores?: Array<{ id?: string | number; public_id?: string | number }>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const tLayout = useTranslations("dashboardLayout");
  const tCommon = useTranslations("common");
  const tSheet = useTranslations("sheet");
  const { isAuthenticated, isLoading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [systemBannerVisible, setSystemBannerVisible] = useState(false);
  const [subscription, setSubscription] = useState<MeSubscription | null>(null);
  const [storeCount, setStoreCount] = useState(0);
  const [subChecked, setSubChecked] = useState(false);
  const [subCheckError, setSubCheckError] = useState(false);

  const normalizedPlan = (subscription?.plan ?? "").toLowerCase();
  const isEligiblePlan = normalizedPlan === "basic" || normalizedPlan === "premium";
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
    api.get<MeResponse>("auth/me/")
      .then(({ data }) => {
        setSubscription(data.subscription);
        setStoreCount(Array.isArray(data.stores) ? data.stores.length : 0);
        setSubCheckError(false);
      })
      .catch(() => {
        setSubscription(null);
        setStoreCount(0);
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
    return (
      <AuthPageShell>
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {tLayout("subscriptionVerifyTitle")}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {tLayout("subscriptionVerifyBody")}
          </p>
        </div>

        <div className="mx-auto w-11/12 max-w-sm space-y-3 sm:w-full">
          <Button type="button" className="w-full" onClick={() => window.location.reload()}>
            {tCommon("reload")}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => logout()}>
            {tCommon("signOut")}
          </Button>
        </div>
      </AuthPageShell>
    );
  }

  if (subscription?.active === false) {
    return (
      <AuthPageShell>
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {tLayout("noSubscriptionTitle")}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {tLayout("noSubscriptionBody")}
          </p>
        </div>

        <div className="mx-auto w-11/12 max-w-sm space-y-3 sm:w-full">
          <Button asChild className="w-full">
            <a href="mailto:support@yourplatform.com">{tCommon("contactSupport")}</a>
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => logout()}>
            {tCommon("signOut")}
          </Button>
        </div>
      </AuthPageShell>
    );
  }

  const showSystemBanner = systemBannerVisible;

  return (
    <BrandingProvider>
      <SearchModalProvider>
        <NotificationProvider>
          <div className="min-h-screen bg-muted/30">
            {/* Fixed banner at top - no scroll jitter, pixel-perfect alignment with sidebar header */}
            <SystemNotificationBanner
              onPresenceChange={setSystemBannerVisible}
              sidebarCollapsed={collapsed}
            />

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
              {/* Mobile: top bar with hamburger */}
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
