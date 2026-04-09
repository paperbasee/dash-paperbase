"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

interface SubscriptionExpirationBannerProps {
  daysRemaining: number;
}

export default function SubscriptionExpirationBanner({
  daysRemaining,
}: SubscriptionExpirationBannerProps) {
  const t = useTranslations("dashboardLayout");

  return (
    <div className="border-b border-border bg-red-50 dark:bg-red-950">
      <div className="mx-auto flex w-full max-w-[88rem] flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-3 py-1.5 text-center md:gap-x-4 md:px-6 md:py-2 lg:px-8">
        <div className="flex max-w-3xl flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          <AlertTriangle
            className="size-3.5 shrink-0 text-red-600 dark:text-red-400 sm:size-4"
            aria-hidden
          />
          <p className="text-center text-xs leading-tight text-red-800 sm:text-sm dark:text-red-200">
            {t("expiringBannerText", { days: daysRemaining })}
          </p>
        </div>
        <a
          href="mailto:noreply@mail.paperbase.me"
          className="shrink-0 rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
        >
          {t("expiringBannerCta")}
        </a>
      </div>
    </div>
  );
}
