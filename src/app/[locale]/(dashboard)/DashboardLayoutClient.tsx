"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { History } from "lucide-react";
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
import { isNetworkError } from "@/lib/network-error";
import { logout } from "@/lib/auth";
import {
  hasVisitedPlans,
  shouldOfferInitialPlanSelection,
} from "@/lib/plans-onboarding";
import { subscriptionIsPaidPeriod } from "@/lib/subscription-access";
import { resolveSubscriptionUIStateFromMe } from "@/lib/subscription-ui-state";
import SubscriptionAccessBlock from "@/components/auth/SubscriptionAccessBlock";
import PaymentSubmittedAwaitingBanner from "@/components/auth/PaymentSubmittedAwaitingBanner";
import SubscriptionExpirationBanner from "@/components/auth/SubscriptionExpirationBanner";

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const tSheet = useTranslations("sheet");
  const tDashboard = useTranslations("dashboard");
  const tDashboardLayout = useTranslations("dashboardLayout");
  const {
    isAuthenticated,
    isLoading,
    authHydrated,
    meProfile,
    meProfileStatus,
    meProfileError,
  } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSystemBannerVisible, setMobileSystemBannerVisible] = useState(false);
  const subscriptionBannerStackRef = useRef<HTMLDivElement>(null);
  const subscription =
    meProfileStatus === "ready" ? (meProfile?.subscription ?? null) : null;
  const subscriptionUiState =
    meProfileStatus === "ready" && meProfile
      ? resolveSubscriptionUIStateFromMe(meProfile)
      : null;
  /** Must match `resolvePostAuthPath` in subscription-access.ts (avoid / ↔ /onboarding / create-store loops). */
  const hasStoreContext =
    meProfileStatus === "ready" &&
    Boolean(
      (meProfile?.active_store_public_id &&
        String(meProfile.active_store_public_id).trim()) ||
        meProfile?.store?.public_id
    );
  const storeCount = hasStoreContext ? 1 : 0;
  const contentContainerClass = "mx-auto w-full max-w-[88rem] px-4 md:px-6 lg:px-8";

  const showTopBannerStrip =
    meProfileStatus === "ready" &&
    subscriptionUiState !== null &&
    subscriptionUiState !== "none";

  const normalizedPlan = (subscription?.plan ?? "").toLowerCase();
  const isEligiblePlan =
    normalizedPlan === "essential" ||
    normalizedPlan === "premium";
  const meReady = meProfileStatus === "ready";
  const shouldRedirectToOnboarding =
    meReady &&
    meProfile !== null &&
    pathname === "/" &&
    subscriptionIsPaidPeriod(meProfile) &&
    isEligiblePlan &&
    storeCount === 0;
  const authCheckReady = authHydrated && !isLoading;

  useEffect(() => {
    // Wait for client auth hydration before deciding user is unauthenticated.
    // Without this guard, refresh can momentarily see `isAuthenticated=false`
    // and incorrectly trigger a hard logout.
    if (!authCheckReady) return;
    if (!isAuthenticated) {
      logout();
    }
  }, [isAuthenticated, authCheckReady]);

  useEffect(() => {
    if (!shouldRedirectToOnboarding) return;
    router.replace("/onboarding");
  }, [shouldRedirectToOnboarding, router]);

  /** One-time: new store owners with no subscription row → /plans (flag prevents loops). */
  useEffect(() => {
    if (!meReady || !meProfile || pathname !== "/") return;
    if (hasVisitedPlans()) return;
    if (!shouldOfferInitialPlanSelection(meProfile)) return;
    router.replace("/plans");
  }, [meReady, meProfile, pathname, router]);

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

  /** Match actual fixed subscription/pending strip height so nav & system banner sit flush (no hardcoded gap). */
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (!showTopBannerStrip) {
      root.style.setProperty("--subscription-banner-offset", "0px");
      return;
    }
    const el = subscriptionBannerStackRef.current;
    if (!el) {
      root.style.setProperty("--subscription-banner-offset", "0px");
      return;
    }
    const apply = () => {
      const h = el.getBoundingClientRect().height;
      root.style.setProperty("--subscription-banner-offset", `${Math.max(0, Math.ceil(h))}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.setProperty("--subscription-banner-offset", "0px");
    };
  }, [showTopBannerStrip]);

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
    return isNetworkError(meProfileError)
      ? <SubscriptionAccessBlock variant="serverUnreachable" />
      : <SubscriptionAccessBlock variant="verifyFailed" />;
  }

  return (
    <BrandingProvider>
      <SearchModalProvider>
        <NotificationProvider>
          {showTopBannerStrip && subscriptionUiState ? (
            <div
              ref={subscriptionBannerStackRef}
              className="fixed inset-x-0 top-0 z-[60] flex flex-col"
            >
              {subscriptionUiState === "pending_review" ? (
                meProfile?.latest_payment_status === "PENDING_REVIEW" ? (
                  <PaymentSubmittedAwaitingBanner
                    endDate={subscription?.end_date ?? null}
                    storefrontBlocksAt={subscription?.storefront_blocks_at ?? null}
                  />
                ) : (
                  <div
                    role="status"
                    className="border-b border-border bg-amber-50 dark:bg-amber-950"
                  >
                    <div className="mx-auto flex w-full max-w-[88rem] flex-wrap items-center justify-center gap-x-2 gap-y-1 px-2 py-1 text-center md:gap-x-3 md:px-4 md:py-1">
                      <div className="flex max-w-3xl flex-wrap items-center justify-center gap-1 sm:gap-1.5">
                        <p className="text-center text-[11px] leading-snug text-amber-900 sm:text-xs dark:text-amber-100">
                          {tDashboardLayout("pendingReviewBannerText")}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              ) : null}
              {subscriptionUiState === "grace" || subscriptionUiState === "expired" ? (
                <SubscriptionExpirationBanner
                  variant={subscriptionUiState}
                  planPublicId={subscription?.plan_public_id ?? null}
                  storefrontBlocksAt={subscription?.storefront_blocks_at ?? null}
                  endDate={subscription?.end_date ?? null}
                />
              ) : null}
              {subscriptionUiState === "inactive" ? (
                <div
                  role="status"
                  className="border-b border-border bg-amber-50 dark:bg-amber-950"
                >
                  <div className="mx-auto flex w-full max-w-[88rem] flex-wrap items-center justify-center gap-x-2 gap-y-1 px-2 py-1 text-center md:gap-x-3 md:px-4 md:py-1">
                    <div className="flex max-w-3xl flex-wrap items-center justify-center gap-1 sm:gap-1.5">
                      <p className="text-center text-[11px] leading-snug text-amber-900 sm:text-xs dark:text-amber-100">
                        {tDashboardLayout("inactivePlanBannerText")}{" "}
                        <Link
                          href="/plans"
                          className="font-medium underline underline-offset-2 hover:text-amber-950 dark:hover:text-amber-50"
                        >
                          {tDashboardLayout("inactivePlanBannerPlansLink")}
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
              {subscriptionUiState === "rejected" ? (
                <div
                  role="status"
                  className="border-b border-border bg-orange-50 dark:bg-orange-950"
                >
                  <div className="mx-auto flex w-full max-w-[88rem] flex-wrap items-center justify-center gap-x-2 gap-y-1 px-2 py-1 text-center md:gap-x-3 md:px-4 md:py-1">
                    <div className="flex max-w-3xl flex-wrap items-center justify-center gap-1 sm:gap-1.5">
                      <p className="text-center text-[11px] leading-snug text-orange-900 sm:text-xs dark:text-orange-100">
                        {tDashboardLayout("rejectedPlanBannerText")}{" "}
                        <Link
                          href="/plans"
                          className="font-medium underline underline-offset-2 hover:text-orange-950 dark:hover:text-orange-50"
                        >
                          {tDashboardLayout("rejectedPlanBannerPlansLink")}
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="min-h-screen pt-[var(--subscription-banner-offset,0px)]">
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

              <div className="sticky top-[var(--subscription-banner-offset,0px)] z-30 hidden h-[var(--header-height)] border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:block">
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
