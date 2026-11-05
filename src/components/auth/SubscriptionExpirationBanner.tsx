"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useDeferredNavigate } from "@/hooks/useDeferredNavigate";
import api from "@/lib/api";
import { payRefusal } from "@/lib/billing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SubscriptionExpirationBannerProps {
  /** Current plan public id from auth/me — used to open checkout for the same plan. */
  planPublicId?: string | null;
  /**
   * Moderators see the active store’s subscription (owner billing), not their own.
   * Uses store-focused copy and hides pay/renew (only the owner can renew).
   */
  moderatorNotice?: boolean;
}

/**
 * The plan has ended, and the shop with it: plans run to the minute since 2026-11-05, with no free
 * day in which to warn before it closes.
 */
export default function SubscriptionExpirationBanner({
  planPublicId,
  moderatorNotice = false,
}: SubscriptionExpirationBannerProps) {
  const t = useTranslations("dashboardLayout");
  const tPay = useTranslations("billingPay");
  const router = useRouter();
  const navigate = useDeferredNavigate();
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  async function handlePay() {
    const id = (planPublicId ?? "").trim();
    if (!id) {
      navigate("/plans");
      return;
    }
    setPayError(null);
    setPayLoading(true);
    try {
      await api.post("billing/payment/initiate/", { plan_public_id: id });
      router.push("/checkout");
    } catch (err) {
      const refusal = payRefusal(err);
      setPayError(refusal ? tPay(refusal) : t("expiredBannerPayError"));
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
            <span>{t(moderatorNotice ? "moderatorExpiredBannerText" : "expiredBannerText")}</span>
          </p>
        </div>
        {!moderatorNotice ? (
        <div className="flex flex-col items-center gap-1">
          <Button
            type="button"
            variant="link"
            className={payLinkClass}
            loading={payLoading}
            onClick={() => void handlePay()}
          >
            {t("expiredBannerPay")}
          </Button>
          {payError ? (
            <span className="text-xs text-red-800 dark:text-red-200">{payError}</span>
          ) : null}
        </div>
        ) : null}
      </div>
    </div>
  );
}
