import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import DashboardLayoutClient from "./DashboardLayoutClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "documentTitle" });
  const brand = t("brand");
  return {
    title: {
      template: `%s | ${brand}`,
      default: `${t("dashboard")} | ${brand}`,
    },
  };
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
