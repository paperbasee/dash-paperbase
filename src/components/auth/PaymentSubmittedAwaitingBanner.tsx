"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { numberTextClass } from "@/lib/number-font";
import {
  formatTimeLeftHm,
  resolveStorefrontBlocksAtIso,
} from "@/lib/storefront-blocks-at";

interface PaymentSubmittedAwaitingBannerProps {
  endDate?: string | null;
  storefrontBlocksAt?: string | null;
}

export default function PaymentSubmittedAwaitingBanner({
  endDate,
  storefrontBlocksAt,
}: PaymentSubmittedAwaitingBannerProps) {
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const t = useTranslations("dashboardLayout");
  const [now, setNow] = useState(() => Date.now());

  const deadlineMs = useMemo(() => {
    const iso = resolveStorefrontBlocksAtIso(endDate, storefrontBlocksAt);
    if (!iso) return null;
    const parsed = Date.parse(iso);
    return Number.isNaN(parsed) ? null : parsed;
  }, [endDate, storefrontBlocksAt]);

  useEffect(() => {
    if (deadlineMs == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [deadlineMs]);

  const timeLeftHm =
    deadlineMs != null ? formatTimeLeftHm(deadlineMs - now) : null;

  const line =
    timeLeftHm != null
      ? t("paymentSubmittedBannerOneLine", { time: timeLeftHm })
      : t("paymentSubmittedBannerOneLineNoTimer");

  return (
    <div
      role="status"
      className="border-b border-border bg-amber-50 dark:bg-amber-950"
    >
      <div className="mx-auto w-full max-w-[88rem] px-2 py-2 text-center md:px-4 md:py-1.5">
        <p
          className={cn(
            "mx-auto max-w-3xl text-balance text-[11px] font-medium leading-snug text-amber-900 sm:text-xs dark:text-amber-100",
            numClass
          )}
        >
          {line}
        </p>
      </div>
    </div>
  );
}
