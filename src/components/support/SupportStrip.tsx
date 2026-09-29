"use client";

import { LifeBuoy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import api from "@/lib/api";
import { leaveSupportSession } from "@/lib/auth";
import { toLocaleDigits } from "@/lib/locale-digits";

/** The strip's height: the dashboard's fixed parts sit below it (--subscription-banner-offset). */
export const SUPPORT_STRIP_HEIGHT = 36;

/**
 * Across the top of a shop's dashboard while Paperbase support is in it (owner, 2026-09-29):
 * whose shop, how long is left, and the way out. It looks like nothing else in the dashboard on
 * purpose -- one glance says this is not your own shop. The API ends the session's tokens at the
 * minute; the strip leaves with it rather than waiting for a refused request.
 */
export function SupportStrip({ session }: { session: { store_name: string; expires_at: string } }) {
  const t = useTranslations("supportMode");
  const locale = useLocale();
  const [now, setNow] = useState(() => Date.now());
  const [ending, setEnding] = useState(false);
  const endsAt = Date.parse(session.expires_at);
  const minutesLeft = Math.max(0, Math.ceil((endsAt - now) / 60_000));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (now >= endsAt) leaveSupportSession();
  }, [now, endsAt]);

  async function end() {
    setEnding(true);
    try {
      await api.post("auth/support/end/");
    } catch {
      // Ended already, or unreachable: the tokens are forgotten here either way.
    }
    leaveSupportSession();
  }

  return (
    <div
      role="status"
      className="flex shrink-0 items-center justify-center gap-2.5 bg-[#1c1917] px-3 text-[12.5px] text-white sm:gap-3"
      style={{ height: SUPPORT_STRIP_HEIGHT }}
    >
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-semibold text-amber-950">
        <LifeBuoy className="size-3.5" strokeWidth={2} aria-hidden />
        {t("badge")}
      </span>
      <span className="min-w-0 truncate">{t("inShop", { store: session.store_name })}</span>
      <span className="hidden shrink-0 text-white/60 sm:inline">
        {toLocaleDigits(t("minutesLeft", { count: minutesLeft }), locale)}
      </span>
      <button
        type="button"
        onClick={() => void end()}
        disabled={ending}
        className="shrink-0 rounded-full border border-white/25 px-2.5 py-0.5 text-xs font-medium transition-colors hover:bg-white/10 disabled:opacity-60"
      >
        {t("end")}
      </button>
    </div>
  );
}
