"use client";

import { useEffect, useState, type ReactNode } from "react";
import { NextIntlClientProvider, useTimeZone, type AbstractIntlMessages } from "next-intl";

import { AuthLanguageSwitch } from "@/components/auth/AuthLanguageSwitch";
import type { AppLocale } from "@/i18n/routing";
import {
  CHECKOUT_DEFAULT_LOCALE,
  CHECKOUT_LOCALE_STORAGE_KEY,
  checkoutLocale,
} from "@/lib/checkout/language";

/**
 * The payment page in its own language (lib/checkout/language.ts): Bangla first, or what this
 * device last chose, with an English / বাংলা switch in the corner. Only the page's words and the
 * document's language change; the address keeps the dashboard's, so every way out goes back to it.
 */
export function CheckoutLanguage({
  words,
  children,
}: {
  words: Record<AppLocale, AbstractIntlMessages>;
  children: ReactNode;
}) {
  const timeZone = useTimeZone();
  const [locale, setLocale] = useState<AppLocale>(CHECKOUT_DEFAULT_LOCALE);

  // Read after the first paint: the server cannot see this device's choice, and the page shows
  // its spinner while it loads the payment anyway.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(CHECKOUT_LOCALE_STORAGE_KEY);
    } catch {
      /* storage unavailable (private mode): Bangla */
    }
    setLocale(checkoutLocale(saved));
  }, []);

  // The Bangla face follows <html lang> (globals.css); the dashboard's comes back on the way out.
  useEffect(() => {
    const html = document.documentElement;
    const before = html.lang;
    html.lang = locale;
    return () => {
      html.lang = before;
    };
  }, [locale]);

  function choose(next: AppLocale) {
    setLocale(next);
    try {
      localStorage.setItem(CHECKOUT_LOCALE_STORAGE_KEY, next);
    } catch {
      /* storage unavailable: this visit only */
    }
  }

  return (
    <NextIntlClientProvider locale={locale} messages={words[locale]} timeZone={timeZone}>
      <AuthLanguageSwitch onChoose={choose} className="absolute right-4 top-4 z-20 lg:right-7 lg:top-7" />
      {children}
    </NextIntlClientProvider>
  );
}
