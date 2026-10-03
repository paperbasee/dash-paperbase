import { hasLocale, type AbstractIntlMessages } from "next-intl";

import { routing, type AppLocale } from "@/i18n/routing";

/**
 * The payment page reads in its own language, Bangla first (owner, 2026-10-03): the bKash and
 * Nagad steps are clearest in Bangla, whatever language the dashboard is in. A merchant who
 * switches it is remembered on that device. The dashboard's own language -- the address and the
 * NEXT_LOCALE cookie -- is never touched, so leaving the page goes back to it.
 */
export const CHECKOUT_LOCALE_STORAGE_KEY = "paperbase_checkout_locale_v1";

export const CHECKOUT_DEFAULT_LOCALE: AppLocale = "bn";

/** The words the payment page draws: its own and the language switch's. */
export const CHECKOUT_NAMESPACES = ["checkoutPage", "language"] as const;

/** The page's language: what this device chose on it, else Bangla. */
export function checkoutLocale(saved: string | null): AppLocale {
  return hasLocale(routing.locales, saved) ? saved : CHECKOUT_DEFAULT_LOCALE;
}

/** The payment page's words out of a language's messages, so only they reach the browser. */
export function checkoutWords(messages: Record<string, unknown>): AbstractIntlMessages {
  return Object.fromEntries(CHECKOUT_NAMESPACES.map((namespace) => [namespace, messages[namespace]])) as AbstractIntlMessages;
}
