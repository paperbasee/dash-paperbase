import { redirect } from "next/navigation";
import { SHIPPING_SETTINGS_HREF } from "@/app/[locale]/(dashboard)/settings/sections/shipping/shippingHref";

/** Shipping now lives under Settings → Shipping; keeps old bookmarks and links working. */
export default async function LegacyShippingRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}${SHIPPING_SETTINGS_HREF}`);
}
