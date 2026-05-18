"use client";

import { useLocale, useTranslations } from "next-intl";
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
    <footer className="flex flex-col gap-2 pt-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>{t("footerVersion", { version: "1.3.0" })}</span>
      <span>
        {t("footerLatency", { ms: latencyLabel })} ·{" "}
        {apiHealthy ? t("footerApiNominal") : t("footerApiDegraded")}
      </span>
    </footer>
  );
}
