"use client";

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { numberTextClass } from "@/lib/number-font";

export default function PaymentSubmittedAwaitingBanner() {
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const t = useTranslations("dashboardLayout");
  const line = t("paymentSubmittedBannerOneLineNoTimer");

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
