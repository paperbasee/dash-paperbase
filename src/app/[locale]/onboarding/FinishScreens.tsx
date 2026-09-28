"use client";

import { ArrowRight, Check, Copy, ExternalLink } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { AuthLanguageSwitch } from "@/components/auth/AuthLanguageSwitch";
import { SetupGuideCard } from "@/components/setup-guide/SetupGuideCard";
import { ScaleToFit } from "@/components/shop-preview/ScaleToFit";
import { SHOP_WINDOW_WIDTH } from "@/components/shop-preview/ShopWindow";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { paletteName } from "@/lib/theme-editor/palettes";
import { cn } from "@/lib/utils";

import { PreviewPanel, SetupPreview } from "./SetupShell";
import { TickMark } from "./steps";
import type { FinishTick, SetupState } from "./useSetup";

/** The last saves, each ticked as it lands, while the owner's shop shines above them. */
export function FinishingScreen({ setup }: { setup: SetupState }) {
  const t = useTranslations("auth.onboarding");
  const locale = useLocale();
  const palette = setup.palettes.find((one) => one.key === setup.chosenPalette);
  const lines: { key: FinishTick; words: string }[] = [
    { key: "contact", words: t("tickContact") },
    { key: "look", words: t("tickLook", { palette: palette ? paletteName(palette, locale) : "" }) },
    ...(setup.shownHostname
      ? [{ key: "address" as const, words: t("tickAddress", { hostname: setup.shownHostname }) }]
      : []),
    { key: "dashboard", words: t("tickDashboard") },
  ];
  const done = lines.filter((line) => setup.ticks[line.key] === "done").length;

  return (
    <div className="pb-motion flex min-h-dvh flex-col items-center justify-center bg-muted/40 px-5 py-10">
      <div className="pb-rise w-full max-w-[32.5rem]">
        <ScaleToFit width={SHOP_WINDOW_WIDTH}>
          <div className={cn("rounded-card", !setup.error && "pb-sheen")}>
            <SetupPreview setup={setup} />
          </div>
        </ScaleToFit>
      </div>
      <h1 className="pb-rise mt-9 text-center text-[1.375rem] font-semibold tracking-[-0.02em] text-foreground" style={{ animationDelay: "120ms" }}>
        {t("finishingTitle", { name: setup.shopName.trim() })}
      </h1>
      <ul className="mt-5 w-full max-w-[20rem] space-y-2.5" aria-live="polite">
        {lines.map((line) => {
          const state = setup.ticks[line.key];
          return (
            <li
              key={line.key}
              className={cn(
                "flex items-center gap-2.5 text-[13.5px] transition-colors duration-300",
                state === "done" ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <TickMark state={setup.error && state === "now" ? "fail" : state} />
              <span className="truncate">{line.words}</span>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 h-[3px] w-full max-w-[20rem] overflow-hidden rounded-full bg-border">
        <div
          className="h-full bg-foreground transition-[width] duration-700 ease-out"
          style={{ width: `${(done / lines.length) * 100}%` }}
        />
      </div>
      {setup.error ? (
        <div className="pb-rise mt-6 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-destructive">{t("finishFailed")}</p>
          <Button type="button" onClick={() => void setup.finish()}>
            {t("tryAgain")}
          </Button>
        </div>
      ) : null}
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

/** The shop is live: its link, the setup guide, and the way into the dashboard. */
export function ReadyScreen({ setup }: { setup: SetupState }) {
  const t = useTranslations("auth.onboarding");
  const url = setup.liveUrl;

  return (
    <div className="pb-motion grid min-h-dvh bg-background lg:grid-cols-[minmax(26rem,33rem)_minmax(0,1fr)] lg:gap-3 lg:p-3">
      <div className="flex min-w-0 flex-col px-5 py-5 sm:px-12 sm:py-7">
        {/* On a computer English / বাংলা sits in the shop panel's corner. */}
        <header className="flex justify-end lg:hidden">
          <AuthLanguageSwitch />
        </header>
        <div className="pb-stagger flex flex-1 flex-col justify-center gap-5 py-10">
          <span className="pb-pop pb-ring inline-flex self-start rounded-full text-foreground">
            <span className="flex size-[52px] items-center justify-center rounded-full bg-foreground text-background">
              <Check className="size-6" strokeWidth={2.4} aria-hidden />
            </span>
          </span>
          <div>
            <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.025em] text-foreground sm:text-[1.875rem]">
              {t("readyTitle", { name: setup.shopName.trim() })}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("readyBody")}</p>
          </div>
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
      </div>
      <PreviewPanel
        badge={
          <span className="flex items-center gap-1.5 rounded-xs bg-[hsl(var(--accent-green)/0.16)] px-2.5 py-1 text-xs font-medium text-[hsl(var(--accent-green))]">
            <span className="pb-live-dot size-[7px] rounded-full bg-[hsl(var(--accent-green))]" />
            {t("liveNow")}
          </span>
        }
      >
        <SetupPreview setup={setup} />
      </PreviewPanel>
    </div>
  );
}
