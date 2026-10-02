"use client";

import type { ReactNode } from "react";
import { ArrowRight, Check, Crown } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import type { SectionKey } from "../_lib/types";

/** The Premium sections, each with its own preview and words under `analyticsPage.premium`. */
export type PremiumSection = Exclude<SectionKey, "overview" | "sales">;

/** Premium's gold: the badge, and the one button that opens it. The same in light and dark. */
const GOLD_PILL = "bg-gradient-to-r from-amber-100 to-amber-300 text-amber-950";
const GOLD_BUTTON =
  "bg-gradient-to-b from-amber-200 to-amber-400 text-amber-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_6px_18px_-8px_rgba(233,180,76,0.6)] hover:brightness-105";

/**
 * A Premium section on the Essential plan ("sneak peek", owner 2026-10-02): what the section
 * shows and the way to open it on the left; on the right, a framed preview drawn in the shape of
 * the section -- shapes only, never a made-up number or word -- fading out. Overview and Sales stay
 * on Essential (owner, 2026-09-27); the API refuses the rest, so nothing here is real data.
 */
export function PremiumShowcase({ section }: { section: PremiumSection }) {
  const t = useTranslations("analyticsPage");
  const points = [t(`premium.${section}.p1`), t(`premium.${section}.p2`), t(`premium.${section}.p3`)];
  return (
    <section
      aria-labelledby={`premium-${section}`}
      className="grid items-center gap-7 rounded-card border border-border bg-card p-5 sm:p-7 lg:grid-cols-[1fr_1.15fr]"
    >
      <div className="min-w-0">
        <PremiumBadge />
        <h2 id={`premium-${section}`} className="mt-3.5 text-xl font-semibold tracking-tight text-foreground sm:text-[22px]">
          {t(`premium.${section}.headline`)}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`premium.${section}.pitch`)}</p>
        <ul className="mt-4 space-y-2.5 text-sm text-foreground">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-2.5">
              <span className="mt-px flex size-[18px] shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                <Check className="size-3" strokeWidth={3} aria-hidden />
              </span>
              <span className="leading-snug">{point}</span>
            </li>
          ))}
        </ul>
        <UpgradeButton className="mt-6" />
        <p className="mt-3 text-xs text-muted-foreground">{t("premium.keep")}</p>
      </div>
      <PreviewWindow section={section} />
    </section>
  );
}

/** A Premium part inside an open section (beside the Overview's sales steps on Essential), filling its cell. */
export function PremiumStrip({ title }: { title: string }) {
  const t = useTranslations("analyticsPage");
  return (
    <section className="h-full rounded-card bg-gradient-to-br from-amber-400/50 via-border to-border p-px">
      <div className="flex h-full flex-col justify-center gap-4 rounded-[calc(var(--radius-card)-1px)] bg-card p-5 sm:p-6">
        <div className="min-w-0 space-y-2">
          <PremiumBadge />
          <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{t("premium.overview")}</p>
        </div>
        <UpgradeButton className="self-start" />
      </div>
    </section>
  );
}

function PremiumBadge() {
  const t = useTranslations("analyticsPage");
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold", GOLD_PILL)}>
      <Crown className="size-3" aria-hidden />
      {t("premium.badge")}
    </span>
  );
}

function UpgradeButton({ className }: { className?: string }) {
  const t = useTranslations("analyticsPage");
  return (
    <Button asChild className={cn("h-11 gap-2 px-5 font-semibold transition", GOLD_BUTTON, className)}>
      <Link href="/plans">
        {t("premium.action")}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </Button>
  );
}

/* -------------------------------------------------------------------------- */
/* The preview: the shape of each section, nothing in it                      */
/* -------------------------------------------------------------------------- */

const SOFT = "bg-muted-foreground/15";
const BLUE = "bg-[hsl(var(--accent-blue)/0.55)]";
const BLUE_SOFT = "bg-[hsl(var(--accent-blue)/0.22)]";

/** A window onto the section, framed in a hairline that warms to gold at one corner. */
function PreviewWindow({ section }: { section: PremiumSection }) {
  return (
    <div aria-hidden className="pointer-events-none select-none rounded-card bg-gradient-to-br from-amber-400/55 via-border to-border p-px">
      <div className="relative max-h-[19rem] overflow-hidden rounded-[calc(var(--radius-card)-1px)] bg-background p-4">
        <div className="mb-3 flex gap-1.5">
          {[0, 1, 2].map((dot) => (
            <span key={dot} className={cn("size-2 rounded-full", SOFT)} />
          ))}
        </div>
        <span className="block h-2.5 w-1/3 rounded-full bg-muted-foreground/25" />
        <div className="mt-4">
          <Preview section={section} />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-background" />
      </div>
    </div>
  );
}

function Line({ w }: { w: string }) {
  return <span className={cn("block h-2 shrink-0 rounded-full", SOFT)} style={{ width: w }} />;
}

/** Rows with a bar behind each, longest first, as the page's lists are. */
function BarRows({ widths, lead }: { widths: number[]; lead?: "thumb" | "avatar" }) {
  return (
    <div className="space-y-2">
      {widths.map((width, i) => (
        <div key={i} className="flex items-center gap-2.5">
          {lead ? <span className={cn("size-6 shrink-0", SOFT, lead === "avatar" ? "rounded-full" : "rounded-ui")} /> : null}
          <div className="h-5 flex-1">
            <span className={cn("block h-full rounded-ui", i === 0 ? BLUE : BLUE_SOFT)} style={{ width: `${width}%` }} />
          </div>
          <Line w="2.25rem" />
        </div>
      ))}
    </div>
  );
}

function AreaLine({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 100" preserveAspectRatio="none" className={cn("w-full text-[hsl(var(--accent-blue))]", className)}>
      <path d="M0 78 C30 70 45 52 75 56 S120 30 150 38 S200 18 225 26 S270 10 300 14 L300 100 L0 100 Z" fill="currentColor" opacity="0.14" />
      <path d="M0 78 C30 70 45 52 75 56 S120 30 150 38 S200 18 225 26 S270 10 300 14" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.8" />
      <path d="M0 84 C40 80 70 70 100 72 S160 58 190 60 S250 46 300 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.35" />
    </svg>
  );
}

function Stack({ children }: { children: ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

function Preview({ section }: { section: PremiumSection }) {
  switch (section) {
    case "traffic":
      return (
        <Stack>
          <AreaLine className="h-28" />
          <BarRows widths={[82, 58, 40, 24]} />
        </Stack>
      );
    case "products":
      return <BarRows widths={[90, 72, 56, 42, 30, 18]} lead="thumb" />;
    case "districts":
      return (
        <div className="grid grid-cols-[auto_1fr] items-start gap-4">
          <div className="grid grid-cols-3 gap-1.5">
            {[0.55, 0.2, 0.35, 0.15, 0.6, 0.3, 0.45, 0.15, 0.25].map((opacity, i) => (
              <span key={i} className="size-9 rounded-ui" style={{ background: `hsl(var(--accent-blue) / ${opacity})` }} />
            ))}
          </div>
          <BarRows widths={[94, 66, 48, 34, 22]} />
        </div>
      );
    case "delivery":
      return (
        <div className="grid grid-cols-[auto_1fr] items-center gap-5">
          <svg viewBox="0 0 120 120" className="size-28 -rotate-90 text-[hsl(var(--accent-blue))]">
            <circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="16" />
            <circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" strokeOpacity="0.65" strokeWidth="16" strokeDasharray="190 289" />
            <circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="16" strokeDasharray="45 289" strokeDashoffset="-194" />
          </svg>
          <BarRows widths={[86, 48, 26, 12]} />
        </div>
      );
    case "customers":
      return (
        <Stack>
          <div className="flex h-20 items-end gap-1.5">
            {[72, 50, 38, 30, 24, 20, 16].map((height, i) => (
              <span key={i} className={cn("flex-1 rounded-t-ui", i === 0 ? BLUE : BLUE_SOFT)} style={{ height: `${height}%` }} />
            ))}
          </div>
          <BarRows widths={[88, 70, 52]} lead="avatar" />
        </Stack>
      );
    case "live":
      return (
        <Stack>
          <div className="flex items-center gap-4">
            <span className="relative flex size-10 shrink-0 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-emerald-500/25 motion-safe:animate-ping" />
              <span className="size-4 rounded-full bg-emerald-500/70" />
            </span>
            <div className="flex h-14 flex-1 items-end gap-1">
              {[30, 45, 25, 60, 40, 70, 50, 35, 65, 80, 55, 45, 75, 60, 40, 52, 68].map((height, i) => (
                <span key={i} className="flex-1 rounded-t-sm bg-emerald-500/35" style={{ height: `${height}%` }} />
              ))}
            </div>
          </div>
          <BarRows widths={[70, 52, 36, 22]} />
        </Stack>
      );
  }
}
