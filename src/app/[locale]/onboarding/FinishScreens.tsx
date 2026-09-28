"use client";

import { ArrowRight, Check, Copy, ExternalLink, Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { AuthLanguageSwitch } from "@/components/auth/AuthLanguageSwitch";
import { AuthHeading, PaperbaseWordmark } from "@/components/auth/AuthParts";
import { SocialMark } from "@/components/SocialMark";
import { SetupGuideCard } from "@/components/setup-guide/SetupGuideCard";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { LiveShop } from "./LiveShop";
import { PreviewPanel, SETUP_COLUMNS, SetupPreview } from "./SetupShell";
import { TickMark } from "./steps";
import type { FinishTick, SetupState } from "./useSetup";

/** The last saves, each ticked as it lands, and a line filling as they do. */
function FinishSteps({ setup, onDark = false }: { setup: SetupState; onDark?: boolean }) {
  const t = useTranslations("auth.onboarding");
  const lines: { key: FinishTick; words: string }[] = [
    { key: "contact", words: t("tickContact") },
    ...(setup.shownHostname
      ? [{ key: "address" as const, words: t("tickAddress", { hostname: setup.shownHostname }) }]
      : []),
    { key: "dashboard", words: t("tickDashboard") },
  ];
  const done = lines.filter((line) => setup.ticks[line.key] === "done").length;

  return (
    <div>
      <ul className="space-y-3" aria-live="polite">
        {lines.map((line) => {
          const state = setup.ticks[line.key];
          return (
            <li
              key={line.key}
              className={cn(
                "flex items-center gap-3 text-[13.5px] transition-colors duration-300",
                state === "done"
                  ? onDark ? "text-white" : "text-foreground"
                  : onDark ? "text-white/55" : "text-muted-foreground"
              )}
            >
              <TickMark state={setup.error && state === "now" ? "fail" : state} onDark={onDark} />
              <span className="truncate">{line.words}</span>
            </li>
          );
        })}
      </ul>
      <div className={cn("mt-5 h-[3px] overflow-hidden rounded-full", onDark ? "bg-white/10" : "bg-border")}>
        <div
          className={cn("h-full transition-[width] duration-700 ease-out", onDark ? "bg-white" : "bg-foreground")}
          style={{ width: `${(done / lines.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

/** Copies `url`, and says so for a moment. */
function useCopy(url: string) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return { copied, copy: () => void navigator.clipboard?.writeText(url).then(() => setCopied(true)) };
}

function CopyLink({ url }: { url: string }) {
  const t = useTranslations("auth.onboarding");
  const { copied, copy } = useCopy(url);
  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-ui border px-2.5 text-xs transition-colors",
        copied
          ? "border-[hsl(var(--accent-green)/0.4)] bg-[hsl(var(--accent-green)/0.1)] text-[hsl(var(--accent-green))]"
          : "border-border-subtle text-foreground/80 hover:bg-muted"
      )}
    >
      {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {copied ? t("copied") : t("copy")}
    </button>
  );
}

/**
 * "Share your shop" (owner, 2026-09-29): the first thing a new shop is shown to -- a WhatsApp
 * chat, a Facebook post, a copied link. On the shop's dark panel, or under the link on a phone.
 */
function ShareBar({ url, onDark = false, className }: { url: string; onDark?: boolean; className?: string }) {
  const t = useTranslations("auth.onboarding");
  const { copied, copy } = useCopy(url);
  const round = cn(
    "flex size-9 items-center justify-center rounded-full transition-colors",
    onDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-muted text-foreground hover:bg-muted/70"
  );
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full py-1.5 pl-5 pr-1.5",
        onDark
          ? "bg-[#141414]/90 text-white shadow-[0_18px_40px_-16px_rgb(0_0_0/0.6)] ring-1 ring-white/10 backdrop-blur"
          : "border border-border-subtle bg-card text-foreground",
        className
      )}
    >
      <span className="mr-2 text-[13px] font-medium">{t("shareShop")}</span>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(t("shareText", { url }))}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("shareOnWhatsApp")}
        title={t("shareOnWhatsApp")}
        className={round}
      >
        <SocialMark platform="whatsapp" className="size-[18px]" />
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("shareOnFacebook")}
        title={t("shareOnFacebook")}
        className={round}
      >
        <SocialMark platform="facebook" className="size-[18px]" />
      </a>
      <button
        type="button"
        onClick={copy}
        className={cn(round, "w-auto gap-1.5 px-3.5 text-xs font-medium", copied && "text-[hsl(var(--accent-green))]")}
      >
        {copied ? <Check className="size-3.5" aria-hidden /> : <Link2 className="size-3.5" aria-hidden />}
        {copied ? t("copied") : t("copyLink")}
      </button>
    </div>
  );
}

/**
 * The launch (owner, 2026-09-29): a burst of confetti in the shop's own colours, once, as the real
 * shop appears after Finish. CSS only (`.pb-confetti`); not drawn at all for a device that asks
 * for less motion. The pieces' paths come from their index, so they are the same every time.
 */
function Confetti({ colors }: { colors: string[] }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 56 }, (_, i) => {
        const r = (salt: number) => {
          const x = Math.sin((i + 1) * salt) * 10000;
          return x - Math.floor(x);
        };
        const round = r(2.21) > 0.72;
        const width = 6 + Math.round(r(3.31) * 5);
        return {
          width,
          height: round ? width : 10 + Math.round(r(5.53) * 6),
          round,
          style: {
            "--dx": `${Math.round((r(12.9898) - 0.5) * 900)}px`,
            "--rise": `${Math.round(-60 - r(78.233) * 170)}px`,
            "--dy": `${Math.round(380 + r(39.3467) * 420)}px`,
            "--rot": `${Math.round((r(93.9898) - 0.5) * 1440)}deg`,
            "--delay": `${(r(11.13) * 0.25).toFixed(2)}s`,
            "--dur": `${(1.3 + r(7.77) * 0.7).toFixed(2)}s`,
          } as CSSProperties,
          color: colors[i % colors.length],
        };
      }),
    [colors]
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((piece, i) => (
        <span
          key={i}
          className="pb-confetti absolute left-1/2 top-[16%]"
          style={{
            ...piece.style,
            width: piece.width,
            height: piece.height,
            borderRadius: piece.round ? 9999 : 2,
            background: piece.color,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Setup's end, in setup's own two columns (owner, 2026-09-29: the separate finishing screen
 * "looks awful"). While the last saves run, the left says the shop is being set up and the dark
 * panel ticks them off over the drawn shop; once they are in, the left says it is live -- its
 * link, the setup guide, the way in -- and the panel opens the real shop, with a word on filling
 * it while it has no products.
 */
export function FinishScreen({ setup }: { setup: SetupState }) {
  const t = useTranslations("auth.onboarding");
  const live = setup.phase === "ready";
  const url = setup.liveUrl;
  const name = setup.shopName.trim();
  // The launch plays once, as the real shop first appears after this visit's Finish -- not on a
  // reload of the end.
  const [celebrating, setCelebrating] = useState(false);
  const celebrated = useRef(false);
  const launch = () => {
    if (!setup.justFinished || celebrated.current) return;
    celebrated.current = true;
    setCelebrating(true);
    window.setTimeout(() => setCelebrating(false), 2800);
  };
  const tokens = setup.paletteTokens;
  const confettiColors = useMemo(
    () => [tokens?.primary ?? "#0f172a", "#f5c451", "#ffffff", tokens?.muted ?? "#e7e5e0", tokens?.accent ?? "#0f172a"],
    [tokens]
  );

  return (
    <div className={cn("pb-motion min-h-dvh bg-background", SETUP_COLUMNS)}>
      <div className="flex min-h-dvh min-w-0 flex-col px-5 py-5 sm:px-12 sm:py-8 lg:min-h-[calc(100dvh-1.5rem)] lg:px-10 lg:py-10 xl:px-14">
        <header className="flex items-center justify-between gap-3">
          <PaperbaseWordmark />
          <AuthLanguageSwitch />
        </header>
        {live ? (
          <div key="live" className="pb-stagger flex flex-1 flex-col justify-center gap-5 py-10">
            <span className="pb-pop pb-ring inline-flex self-start rounded-full text-foreground">
              <span className="flex size-[52px] items-center justify-center rounded-full bg-foreground text-background">
                <Check className="size-6" strokeWidth={2.4} aria-hidden />
              </span>
            </span>
            <AuthHeading title={t("readyTitle", { name })} body={t("readyBody")} />
            {url ? (
              <div className="flex items-center gap-2 rounded-ui border border-border-subtle py-1.5 pl-3.5 pr-1.5 text-[13.5px]">
                <span className="pb-live-dot size-2 shrink-0 rounded-full bg-[hsl(var(--accent-green))]" />
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">{url}</span>
                <CopyLink url={url} />
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 items-center gap-1.5 rounded-ui border border-border-subtle px-2.5 text-xs text-foreground/80 transition-colors hover:bg-muted"
                >
                  <ExternalLink className="size-3.5" aria-hidden />
                  {t("open")}
                </a>
              </div>
            ) : null}
            {/* On a phone there is no panel: sharing sits under the link. */}
            {url ? <ShareBar url={url} className="self-start lg:hidden" /> : null}
            {setup.guide ? <SetupGuideCard guide={setup.guide} /> : null}
            <Button asChild className="h-11 w-full">
              <Link href="/">
                {t("goToDashboard")}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>
        ) : (
          <div key="finishing" className="pb-stagger flex flex-1 flex-col justify-center gap-6 py-10">
            <span
              className={cn(
                "inline-flex size-[52px] self-start rounded-full border-[3px]",
                setup.error ? "border-destructive/40" : "animate-spin border-border border-t-foreground"
              )}
              aria-hidden
            />
            <AuthHeading title={t("finishingTitle", { name })} body={t("finishingBody")} />
            {/* On a phone there is no panel: the steps tick here. */}
            <div className="lg:hidden">
              <FinishSteps setup={setup} />
            </div>
            {setup.error ? (
              <div className="pb-rise flex flex-col items-start gap-3">
                <p className="text-sm text-destructive">{t("finishFailed")}</p>
                <Button type="button" onClick={() => void setup.finish()}>
                  {t("tryAgain")}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <PreviewPanel
        keepFrame={live}
        badge={
          live ? (
            <span className="flex items-center gap-1.5 rounded-xs bg-[hsl(var(--accent-green)/0.16)] px-2.5 py-1 text-xs font-medium text-[hsl(var(--accent-green))]">
              <span className="pb-live-dot size-[7px] rounded-full bg-[hsl(var(--accent-green))]" />
              {t("liveNow")}
            </span>
          ) : (
            <span className="flex items-center gap-2 text-xs text-white/60">
              <span className="size-3 animate-spin rounded-full border-[1.5px] border-white/20 border-t-white" aria-hidden />
              {t("settingUp")}
            </span>
          )
        }
        overlay={
          live ? (
            <>
              {celebrating ? <Confetti colors={confettiColors} /> : null}
              {url ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-7 flex justify-center px-10">
                  <ShareBar url={url} onDark className="pb-rise pointer-events-auto" />
                </div>
              ) : null}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[#141414]/55 p-10 backdrop-blur-[3px]">
              <div className="pb-rise w-full max-w-[24rem] rounded-card bg-[#141414]/85 px-7 py-6 ring-1 ring-white/10">
                <FinishSteps setup={setup} onDark />
              </div>
            </div>
          )
        }
      >
        {(device) =>
          live ? (
            <LiveShop setup={setup} device={device} onShown={launch} />
          ) : (
            <SetupPreview setup={setup} device={device} fill className={setup.error ? undefined : "pb-sheen"} />
          )
        }
      </PreviewPanel>
    </div>
  );
}
