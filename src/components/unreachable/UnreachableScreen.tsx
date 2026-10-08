"use client";

import { useLocale, useTranslations } from "next-intl";

import { NOTICE_DOT, NOTICE_TONE } from "@/components/status/StatusNoticeBar";
import { Button } from "@/components/ui/button";
import { NoInternet, ServerDown, SignInDown } from "@/components/unreachable/drawings";
import { useStatusSummary } from "@/hooks/useStatusNotice";
import { signOut } from "@/lib/auth";
import { formatDashboardDateTime, formatDashboardTime } from "@/lib/datetime-display";
import { toLocaleDigits } from "@/lib/locale-digits";
import { dhakaDay, noticeWhileAway, statusUrl } from "@/lib/status-notice";
import { cn } from "@/lib/utils";

/** The part that is away: Paperbase's API, Accounts where everyone signs in, or the device's own internet. */
export type AwayPart = "api" | "signIn" | "offline";

const SCREEN = {
  api: { Drawing: ServerDown, title: "apiTitle", body: "apiBody" },
  signIn: { Drawing: SignInDown, title: "signInTitle", body: "signInBody" },
  offline: { Drawing: NoInternet, title: "offlineTitle", body: "offlineBody" },
} as const;

const INCIDENT_WORDS = {
  investigating: "statusInvestigating",
  identified: "statusIdentified",
  monitoring: "statusMonitoring",
} as const;

/**
 * The status page's word on it, as a line under the drawing: the incident and since when, the
 * maintenance and until when, or that nothing is reported yet. No line when the status page did
 * not answer either.
 */
function StatusLine() {
  const t = useTranslations("unreachable");
  const locale = useLocale();
  const { summary, now } = useStatusSummary(true);
  if (!summary) return null;

  const notice = noticeWhileAway(summary, Math.floor(now / 1000));
  /** A time today, or the date and time on another day. */
  const at = (seconds: number) => {
    const iso = new Date(seconds * 1000).toISOString();
    return dhakaDay(seconds) === dhakaDay(now / 1000) ? formatDashboardTime(iso, locale) : formatDashboardDateTime(iso, locale);
  };

  let words: string;
  let tone: keyof typeof NOTICE_TONE | null = null;
  if (!notice) {
    words = t("statusQuiet");
  } else if (notice.kind === "incident") {
    const key = INCIDENT_WORDS[notice.status as keyof typeof INCIDENT_WORDS] ?? INCIDENT_WORDS.investigating;
    words = t(key, { time: at(notice.started_at) });
    tone = notice.impact;
  } else {
    words = t("statusMaintenance", { until: at(notice.ends_at) });
    tone = "maintenance";
  }

  return (
    <p
      className={cn(
        "mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs leading-snug sm:px-3.5 sm:text-[13px]",
        tone ? NOTICE_TONE[tone] : "bg-muted text-muted-foreground"
      )}
    >
      <span aria-hidden className={cn("size-[7px] shrink-0 rounded-full", tone ? NOTICE_DOT[tone] : "bg-muted-foreground/60")} />
      {words}
    </p>
  );
}

/**
 * What a signed-in merchant sees while a part of Paperbase is away (owner, 2026-10-09: "we will
 * show a screen", not a read-only dashboard), each part with its own drawing. The page holding it
 * keeps asking (server-unreachable/page.tsx); this says what is known meanwhile: the status page's
 * word, when the next ask is, and what the merchant can do.
 */
export default function UnreachableScreen({
  part,
  checking,
  secondsLeft,
  onTryNow,
}: {
  part: AwayPart;
  /** Asking right now. */
  checking: boolean;
  /** Until the next ask. */
  secondsLeft: number;
  onTryNow: () => void;
}) {
  const t = useTranslations("unreachable");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { Drawing, title, body } = SCREEN[part];
  const status = statusUrl();

  let next: string;
  if (checking) next = t("checkingNow");
  else if (part === "offline") next = t("waiting");
  else next = t("checkingIn", { seconds: toLocaleDigits(String(secondsLeft), locale), count: secondsLeft });

  return (
    <div className="pb-motion flex min-h-dvh flex-col bg-background text-foreground">
      <header className="px-5 py-4 sm:px-8 sm:py-6">
        <span className="text-sm font-semibold tracking-wide text-muted-foreground">Paperbase</span>
      </header>
      <main className="flex flex-1 flex-col items-center px-5 pb-8 text-center sm:px-6 sm:pb-14">
        <Drawing className="w-80 max-w-full sm:w-100" />
        {/* Offline, the status page is out of reach too -- and Paperbase is not the one away. */}
        {part === "offline" ? null : <StatusLine />}
        <h1 className="mt-4 text-[22px] font-semibold leading-snug tracking-tight sm:text-[28px]">{t(title)}</h1>
        <p className="mt-2.5 max-w-[30rem] text-[15px] leading-relaxed text-muted-foreground sm:mt-3 sm:text-base">
          {t.rich(body, { nowrap: (words) => <span className="whitespace-nowrap">{words}</span> })}
        </p>

        <div className="mt-6 flex w-full flex-col items-stretch gap-3.5 sm:mt-7 sm:w-auto sm:flex-row sm:items-center sm:gap-5">
          <Button type="button" variant="outline" size="lg" onClick={onTryNow} className="sm:px-7">
            {t("tryNow")}
          </Button>
          {part !== "offline" && status ? (
            <a
              href={status}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[15px] font-medium underline underline-offset-4 hover:text-foreground/80"
            >
              {t("seeStatus")}
            </a>
          ) : null}
        </div>

        <p className="mt-5 inline-flex items-center gap-2 text-[13px] text-muted-foreground">
          <span aria-hidden className="size-2 animate-pulse rounded-full bg-muted-foreground/50" />
          {next}
        </p>

        {/* Signing out needs Accounts and a connection: offered only while the API is the part away. */}
        {part === "api" ? (
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-auto pt-8 text-[13px] text-muted-foreground underline underline-offset-[3px] hover:text-foreground sm:mt-8 sm:pt-0"
          >
            {tCommon("signOut")}
          </button>
        ) : null}
      </main>
    </div>
  );
}
