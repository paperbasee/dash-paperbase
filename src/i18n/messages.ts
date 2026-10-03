import type { AppLocale } from "./routing";

/** A language's words: messages/<locale>.json. */
export async function loadMessages(locale: AppLocale) {
  return (await import(`../../messages/${locale}.json`)).default;
}
