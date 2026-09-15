import { redirect } from "next/navigation";
import { promotionsHref } from "@/app/[locale]/(dashboard)/settings/sections/promotions/promotionTabs";

/** Banners now lives under Settings → Promotions; keeps old bookmarks and links working. */
export default async function LegacyBannersRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}${promotionsHref("banners")}`);
}
