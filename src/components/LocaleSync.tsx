"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { CORE_LOCALE_STORAGE_KEY } from "@/lib/locale-storage";

/** Keeps `core-locale` aligned with the active URL locale (set by proxy + toggle). */
export function LocaleSync() {
  const locale = useLocale();

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(CORE_LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
