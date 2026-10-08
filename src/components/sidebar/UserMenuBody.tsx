"use client";

import type { MouseEvent, ReactNode } from "react";
import { ChevronRight, CircleUserRound, Globe, Laptop, LogOut, Moon, Palette, Sparkles, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { AppLocale } from "@/i18n/routing";
import type { ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { unreadLine } from "@/lib/whats-new/unread";

/**
 * What the account menu holds (owner, 2026-10-07: design "A with C's What's new"): theme and
 * language as small switches on one row each, What's new as a tile that says how many updates
 * are waiting, the person's Paperbase account at Accounts (name, phone, picture, passkeys), and
 * Log out, quiet until pointed at.
 */
export function UserMenuBody({
  theme,
  onThemeChange,
  locale,
  onLocaleChange,
  unreadCount,
  onWhatsNew,
  accountHref,
  onSignOut,
}: {
  theme: ThemePreference;
  onThemeChange: (next: ThemePreference, event: MouseEvent) => void;
  locale: AppLocale;
  onLocaleChange: (next: AppLocale) => void;
  unreadCount: number;
  onWhatsNew: () => void;
  /** "Your Paperbase account" at Accounts; null in a support visit, which never opens it. */
  accountHref: string | null;
  onSignOut: () => void;
}) {
  const tSidebar = useTranslations("sidebar");
  const tLang = useTranslations("language");
  const tWhatsNew = useTranslations("whatsNew");
  const line = unreadLine(unreadCount);

  const themes = [
    { key: "light" as const, icon: Sun, label: tSidebar("light") },
    { key: "dark" as const, icon: Moon, label: tSidebar("dark") },
    { key: "system" as const, icon: Laptop, label: tSidebar("system") },
  ];
  const languages = [
    { key: "en" as const, short: tLang("shortEnglish"), label: tLang("switchToEnglish") },
    { key: "bn" as const, short: tLang("shortBengali"), label: tLang("switchToBengali") },
  ];

  return (
    <div className="py-1">
      <SettingRow icon={<Palette className="size-4 shrink-0 text-muted-foreground" aria-hidden />} label={tSidebar("theme")}>
        {themes.map(({ key, icon: Icon, label }) => (
          <SwitchButton key={key} on={theme === key} label={label} onClick={(e) => onThemeChange(key, e)} className="w-7">
            <Icon className="size-3.5" aria-hidden />
          </SwitchButton>
        ))}
      </SettingRow>
      <SettingRow icon={<Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden />} label={tSidebar("language")}>
        {languages.map(({ key, short, label }) => (
          <SwitchButton key={key} on={locale === key} label={label} onClick={() => onLocaleChange(key)} className="px-2 text-[11.5px]">
            {short}
          </SwitchButton>
        ))}
      </SettingRow>

      <DropdownMenuSeparator className="mx-0 my-1" />

      <DropdownMenuItem
        onSelect={onWhatsNew}
        aria-label={unreadCount > 0 ? tWhatsNew("menuUnreadAria") : undefined}
        className="mx-1.5 my-0.5 cursor-pointer gap-3 rounded-xs bg-muted/70 px-3 py-2.5 focus:bg-accent dark:bg-white/[0.05] dark:focus:bg-white/[0.09]"
      >
        <Sparkles className="size-[1.125rem] text-foreground" aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col leading-snug">
          <span className="truncate text-sm font-medium text-foreground">{tWhatsNew("menuLabel")}</span>
          <span className="truncate text-xs text-muted-foreground">{tWhatsNew(line.key, line.values)}</span>
        </span>
        {unreadCount > 0 ? (
          <span className="size-2 shrink-0 rounded-full bg-emerald-500 ring-[3px] ring-emerald-500/20" aria-hidden />
        ) : null}
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
      </DropdownMenuItem>

      <DropdownMenuSeparator className="mx-0 my-1" />

      {accountHref ? (
        <DropdownMenuItem asChild className="mx-1 cursor-pointer gap-2.5 rounded-xs px-2.5 py-2 text-sm font-medium text-foreground">
          <a href={accountHref}>
            <CircleUserRound className="size-4 text-muted-foreground" aria-hidden />
            <span>{tSidebar("yourAccount")}</span>
          </a>
        </DropdownMenuItem>
      ) : null}

      <DropdownMenuItem
        onSelect={onSignOut}
        className={cn(
          "mx-1 cursor-pointer gap-2.5 rounded-xs px-2.5 py-2 text-sm font-medium text-muted-foreground",
          "focus:bg-red-500/10 focus:text-red-700 dark:focus:bg-red-500/15 dark:focus:text-red-300"
        )}
      >
        {/* text-current: the icon takes the row's colour, grey at rest and red when pointed at. */}
        <LogOut className="size-4 text-current" aria-hidden />
        <span>{tSidebar("logOut")}</span>
      </DropdownMenuItem>
    </div>
  );
}

/** One setting on one line: its icon and name, then its small switch. */
function SettingRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="mx-1 flex h-9 items-center gap-2.5 rounded-xs px-2.5 text-sm font-medium text-foreground">
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <div role="group" aria-label={label} className="flex shrink-0 gap-0.5 rounded-xs bg-muted p-0.5 dark:bg-white/[0.06]">
        {children}
      </div>
    </div>
  );
}

function SwitchButton({
  on,
  label,
  onClick,
  className,
  children,
}: {
  on: boolean;
  label: string;
  onClick: (event: MouseEvent) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-6 items-center justify-center rounded-[2px] font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        on
          ? "bg-background text-foreground shadow-sm ring-1 ring-border dark:bg-white/[0.14]"
          : "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}
