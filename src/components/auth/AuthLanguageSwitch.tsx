"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { CORE_LOCALE_STORAGE_KEY, setLocalePreferenceCookie } from "@/lib/locale-storage";
import { cn } from "@/lib/utils";

const LOCALES: readonly AppLocale[] = ["en", "bn"];

/**
 * English / বাংলা, for pages a person sees before the dashboard's own menu: sign in, sign up
 * and setup. Remembered the way the sidebar's switch remembers it, and the page's query (a
 * `next` return path, an email link's token) is kept.
 */
export function AuthLanguageSwitch({
  className,
  onPhoto = false,
}: {
  className?: string;
  /** Drawn over the sign-in photos (a phone's top corner): light on dark, whatever the theme. */
  onPhoto?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("language");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function choose(next: AppLocale) {
    if (next === locale) return;
    try {
      localStorage.setItem(CORE_LOCALE_STORAGE_KEY, next);
    } catch {
      /* storage unavailable (private mode) -- the cookie still carries it */
    }
    setLocalePreferenceCookie(next);
    const query = Object.fromEntries(searchParams.entries());
    router.replace({ pathname, query }, { locale: next });
  }

  return (
    <div
      role="group"
      aria-label={t("toggleAria")}
      className={cn(
        "flex gap-0.5 overflow-hidden rounded-ui border p-0.5 text-xs",
        onPhoto ? "border-white/20 bg-black/35 backdrop-blur-md" : "border-border-subtle",
        className
      )}
    >
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => choose(option)}
          aria-pressed={locale === option}
          className={cn(
            "rounded-xs px-2.5 py-1 transition-colors",
            locale === option
              ? onPhoto
                ? "bg-white font-medium text-[#0f172a]"
                : "bg-foreground font-medium text-background"
              : onPhoto
                ? "text-white/75 hover:text-white"
                : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option === "en" ? t("switchToEnglish") : t("switchToBengali")}
        </button>
      ))}
    </div>
  );
}
