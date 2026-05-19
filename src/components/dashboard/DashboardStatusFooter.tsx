"use client";

import { useLocale, useTranslations } from "next-intl";
import { appVersion } from "@/lib/app-version";
import { toLocaleDigits } from "@/lib/locale-digits";

interface DashboardStatusFooterProps {
  apiHealthy: boolean;
  latencyMs: number | null;
}

export default function DashboardStatusFooter({
  apiHealthy,
  latencyMs,
}: DashboardStatusFooterProps) {
  const locale = useLocale();
  const t = useTranslations("dashboard");

  const latencyLabel =
    latencyMs != null
      ? toLocaleDigits(String(latencyMs), locale)
      : "—";

  return (
    <footer className="flex flex-row flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-2 text-center text-xs text-muted-foreground sm:justify-between sm:text-left">
      <span>{t("footerVersion", { version: appVersion })}</span>
      <span>
        {t("footerLatency", { ms: latencyLabel })} ·{" "}
        {apiHealthy ? t("footerApiNominal") : t("footerApiDegraded")}
      </span>
    </footer>
  );
}
