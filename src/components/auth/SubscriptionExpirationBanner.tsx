"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { numberTextClass } from "@/lib/number-font";
import {
  formatTimeLeftHm,
  resolveStorefrontBlocksAtIso,
} from "@/lib/storefront-blocks-at";

export type SubscriptionBannerVariant = "grace" | "expired";

interface SubscriptionExpirationBannerProps {
  variant: SubscriptionBannerVariant;
  /** Current plan public id from auth/me — used to open checkout for the same plan. */
  planPublicId?: string | null;
  /** From auth/me; fallback computed from `endDate` when absent (older caches). */
  storefrontBlocksAt?: string | null;
  endDate?: string | null;
}

export default function SubscriptionExpirationBanner({
  variant,
  planPublicId,
  storefrontBlocksAt,
  endDate,
}: SubscriptionExpirationBannerProps) {
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const t = useTranslations("dashboardLayout");
  const router = useRouter();
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const deadlineMs = useMemo(() => {
    const iso = resolveStorefrontBlocksAtIso(endDate, storefrontBlocksAt);
    if (!iso) return null;
    const parsed = Date.parse(iso);
    return Number.isNaN(parsed) ? null : parsed;
  }, [endDate, storefrontBlocksAt]);

  useEffect(() => {
    if (variant !== "grace" || deadlineMs == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [variant, deadlineMs]);

  const messageKey = variant === "grace" ? "graceBannerText" : "expiredBannerText";
  const showGraceTimer = variant === "grace" && deadlineMs != null;
  const timeLeftHm = showGraceTimer
    ? formatTimeLeftHm(deadlineMs - now)
    : null;

  async function handlePay() {
    const id = (planPublicId ?? "").trim();
    if (!id) {
      router.push("/plans");
      return;
    }
    setPayError(null);
    setPayLoading(true);
    try {
      await api.post("billing/payment/initiate/", { plan_public_id: id });
      router.push("/checkout");
    } catch {
      setPayError(t("expiredBannerPayError"));
    } finally {
      setPayLoading(false);
    }
  }

  const payLinkClass = cn(
    "h-auto min-h-0 shrink-0 bg-transparent px-0 py-0 text-[11px] leading-snug sm:text-xs font-medium text-red-800 underline underline-offset-2 shadow-none",
    "hover:bg-transparent hover:text-red-900 hover:underline",
    "dark:text-red-200 dark:hover:text-red-100"
  );

  return (
    <div className="border-b border-border bg-red-50 dark:bg-red-950">
      <div className="mx-auto flex w-full max-w-[88rem] flex-wrap items-center justify-center gap-x-2 gap-y-1 px-2 py-1 text-center md:gap-x-3 md:px-4 md:py-1">
        <div className="flex max-w-3xl flex-wrap items-center justify-center gap-1 sm:gap-1.5">
          <p className="text-center text-[11px] leading-snug text-red-800 sm:text-xs dark:text-red-200">
            {variant === "grace" ? (
              <span className={cn("font-medium", numClass)}>
                {timeLeftHm != null
                  ? t("graceBannerText", { time: timeLeftHm })
                  : t("graceBannerTextNoTimer")}
              </span>
            ) : (
              <span>{t(messageKey)}</span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Button
            type="button"
            variant="link"
            className={payLinkClass}
            loading={payLoading}
            onClick={() => void handlePay()}
          >
            {variant === "grace" ? t("bannerPayNow") : t("expiredBannerPay")}
          </Button>
          {payError ? (
            <span className="text-xs text-red-800 dark:text-red-200">{payError}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
