import { CheckoutLanguage } from "@/components/checkout/CheckoutLanguage";
import { loadMessages } from "@/i18n/messages";
import { routing, type AppLocale } from "@/i18n/routing";
import { checkoutWords } from "@/lib/checkout/language";

import CheckoutScreen from "./CheckoutScreen";

/** The payment page, in its own language (Bangla first): its words in both, nothing more. */
export default async function CheckoutPage() {
  const words = Object.fromEntries(
    await Promise.all(
      routing.locales.map(async (locale) => [locale, checkoutWords(await loadMessages(locale))] as const)
    )
  ) as Record<AppLocale, ReturnType<typeof checkoutWords>>;

  return (
    <CheckoutLanguage words={words}>
      <CheckoutScreen />
    </CheckoutLanguage>
  );
}
