/**
 * The plan payment page reads in its own language, Bangla first, with an English / বাংলা switch
 * (owner, 2026-10-03). The dashboard's own language is left as it is.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { CheckoutLanguage } from "@/components/checkout/CheckoutLanguage";
import { CHECKOUT_NAMESPACES, checkoutLocale, checkoutWords } from "@/lib/checkout/language";
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

// The switch needs Next's router; drawing it never navigates.
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }), usePathname: () => "/checkout" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));

describe("the payment page's language", () => {
  it("is Bangla unless this device chose another on it", () => {
    expect(checkoutLocale(null)).toBe("bn");
    expect(checkoutLocale("")).toBe("bn");
    expect(checkoutLocale("fr")).toBe("bn");
    expect(checkoutLocale("bn")).toBe("bn");
    expect(checkoutLocale("en")).toBe("en");
  });

  it("sends the browser only its own words, in both languages", () => {
    for (const messages of [en, bn]) {
      const words = checkoutWords(messages);
      expect(Object.keys(words)).toEqual([...CHECKOUT_NAMESPACES]);
      for (const namespace of CHECKOUT_NAMESPACES) expect(words[namespace]).toBeTruthy();
    }
    expect(Object.keys(checkoutWords(en).checkoutPage as object).sort()).toEqual(
      Object.keys(checkoutWords(bn).checkoutPage as object).sort()
    );
  });

  it("opens in Bangla on an English dashboard, with the switch on বাংলা", () => {
    function Title() {
      const t = useTranslations("checkoutPage");
      return <h1>{t("title")}</h1>;
    }
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Dhaka">
        <CheckoutLanguage words={{ en: checkoutWords(en), bn: checkoutWords(bn) }}>
          <Title />
        </CheckoutLanguage>
      </NextIntlClientProvider>
    );
    expect(html).toContain(`<h1>${bn.checkoutPage.title}</h1>`);
    expect(html).not.toContain(en.checkoutPage.title);
    expect(html).toMatch(/aria-pressed="true"[^>]*>বাংলা</);
    expect(html).toMatch(/aria-pressed="false"[^>]*>English</);
  });
});
