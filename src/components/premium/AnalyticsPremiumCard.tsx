"use client";

import { Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { useOwnerPower } from "@/hooks/useOwnerPower";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Analytics on a plan without it (owner, 2026-10-04, after a "premium feature" sheet the owner sent;
 * the dashboard's own corners, like every other card):
 * an open lock, what Premium shows, what else it brings, and the way there -- Upgrade for the
 * owner (owner power "billing"), "ask the owner" for a team member -- or back. In Settings > Apps,
 * when Analytics is switched on without the plan (the page itself sends them to the plans).
 */
export function AnalyticsPremiumCard({ onBack, className }: { onBack: () => void; className?: string }) {
  const t = useTranslations("analyticsPage.premium");
  const mayUpgrade = useOwnerPower()("billing");

  return (
    <div
      className={cn(
        "w-full max-w-sm rounded-card bg-muted p-6 text-center text-foreground shadow-2xl ring-1 ring-border sm:p-7",
        className,
      )}
    >
      <OpenLock className="mx-auto size-16 text-zinc-400 dark:text-zinc-500" />
      <h2 className="mt-4 text-balance text-xl font-bold leading-snug tracking-tight">{t("title")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("line")}</p>

      {/* What else Premium brings: three tiles in a fan, as the reference's faces were. */}
      <div className="mt-5 flex items-center gap-3 rounded-card bg-card px-3.5 py-3 text-left ring-1 ring-border/60">
        <div className="flex shrink-0">
          {TILES.map(({ icon: Icon, tile, turn }, index) => (
            <span
              key={index}
              className={cn("flex size-9 shrink-0 items-center justify-center rounded-ui shadow-sm ring-2 ring-card", tile, turn, index > 0 && "-ml-1")}
            >
              <Icon className="size-4" aria-hidden />
            </span>
          ))}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-tight">{t("alsoTitle")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("alsoLine")}</p>
        </div>
      </div>

      {mayUpgrade ? (
        <Link
          href="/plans"
          className="mt-6 flex h-12 w-full items-center justify-center rounded-button bg-linear-to-b from-zinc-700 to-zinc-950 text-[15px] font-semibold text-white shadow-[0_12px_24px_-10px_rgba(0,0,0,0.7)] transition hover:to-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:from-white dark:to-zinc-200 dark:text-zinc-950"
        >
          {t("upgrade")}
        </Link>
      ) : (
        <p className="mt-6 rounded-card bg-card px-4 py-3 text-sm text-muted-foreground ring-1 ring-border/60">{t("askOwner")}</p>
      )}
      <button
        type="button"
        onClick={onBack}
        className="mt-3 h-9 rounded-button px-4 text-sm font-medium text-foreground/80 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t("goBack")}
      </button>
    </div>
  );
}

/** Fraud check, order emails, premium sections. */
const TILES = [
  { icon: ShieldCheck, tile: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300", turn: "-rotate-6" },
  { icon: Mail, tile: "bg-violet-200 text-violet-700 dark:bg-violet-950 dark:text-violet-300", turn: "" },
  { icon: Sparkles, tile: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300", turn: "rotate-6" },
];

/** A solid, opened padlock with two sparks: the lock the reference sheet opens with. */
function OpenLock({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden className={className}>
      <path d="M21 29v-9a11 11 0 0 1 21.6-3" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <rect x="12" y="27" width="34" height="29" rx="10" fill="currentColor" />
      <circle cx="29" cy="39.5" r="3.6" className="fill-muted" />
      <rect x="27.4" y="40" width="3.2" height="8" rx="1.6" className="fill-muted" />
      <circle cx="51" cy="13" r="4" fill="currentColor" />
      <circle cx="56.5" cy="23" r="2.6" fill="currentColor" />
      <circle cx="9" cy="58" r="2.6" fill="currentColor" />
    </svg>
  );
}
