import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function dashboardSegmentTitle(
  locale: string,
  key: string,
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "documentTitle" });
  return { title: t(key) };
}
