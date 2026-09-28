"use client";

import { ArrowRight, Check, Copy, ExternalLink, PackagePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { AuthLanguageSwitch } from "@/components/auth/AuthLanguageSwitch";
import { AuthHeading, PaperbaseWordmark } from "@/components/auth/AuthParts";
import { SetupGuideCard } from "@/components/setup-guide/SetupGuideCard";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { SETUP_GUIDE_HREF } from "@/lib/setup-guide";
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

function CopyLink({ url }: { url: string }) {
  const t = useTranslations("auth.onboarding");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return (
    <button
      type="button"
      onClick={() => void navigator.clipboard?.writeText(url).then(() => setCopied(true))}
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
  const hasProduct = setup.guide?.steps.some((step) => step.key === "product" && step.done) ?? true;

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
            hasProduct ? null : (
              // Over the shop, not in it: the frame underneath stays the shopper's page.
              <div className="pointer-events-none absolute inset-x-0 bottom-7 flex justify-center px-10">
                <div className="pb-rise pointer-events-auto flex max-w-[36rem] items-center gap-4 rounded-card bg-[#141414]/90 py-3.5 pl-4 pr-3.5 text-white shadow-[0_18px_40px_-16px_rgb(0_0_0/0.6)] ring-1 ring-white/10 backdrop-blur">
                  <PackagePlus className="size-5 shrink-0 text-white/70" aria-hidden />
                  <p className="min-w-0 flex-1 text-[13px] leading-snug text-white/85">{t("emptyShopNote")}</p>
                  <Link
                    href={SETUP_GUIDE_HREF.product}
                    className="shrink-0 rounded-ui bg-white px-3.5 py-2 text-xs font-medium text-[#0f172a] transition-colors hover:bg-white/90"
                  >
                    {t("addProduct")}
                  </Link>
                </div>
              </div>
            )
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
            <LiveShop setup={setup} device={device} />
          ) : (
            <SetupPreview setup={setup} device={device} fill className={setup.error ? undefined : "pb-sheen"} />
          )
        }
      </PreviewPanel>
    </div>
  );
}
