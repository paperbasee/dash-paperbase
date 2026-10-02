"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useOwnerPower } from "@/hooks/useOwnerPower";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { DIVISION_SHAPES, MAP_BOX } from "../_lib/bangladesh-map";
import type { SectionKey } from "../_lib/types";
import { CARD, StatLabel } from "./kit";

/** The Premium sections; Overview and Sales stay on Essential (owner, 2026-09-27). */
export type PremiumSection = Exclude<SectionKey, "overview" | "sales">;

/**
 * A Premium section on the Essential plan, the way Typeform shows locked analytics (owner,
 * 2026-10-02): the section itself with its real titles, every figure blurred, under one line that
 * says it is on Premium and how to get it. The figures are placeholders drawn here ("0,000") --
 * the API sends nothing for these sections on Essential, and nothing here pretends to be the
 * shop's numbers.
 */
export function LockedSection({ section, title }: { section: PremiumSection; title: string }) {
  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <UpgradeBar section={title} />
      <div aria-hidden className="pointer-events-none flex select-none flex-col gap-4 sm:gap-5">
        <Skeleton section={section} />
      </div>
    </div>
  );
}

/** The Overview's delivery list on Essential: its real rows, their figures blurred. */
export function LockedDelivery() {
  const t = useTranslations("analyticsPage");
  return (
    <section className={cn(CARD, "flex min-w-0 flex-col gap-4 p-4 sm:p-5 lg:px-6")}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <h2 className="text-[15px] font-semibold text-foreground">{t("overview.deliveryTitle")}</h2>
        <PlanLink />
      </div>
      <ul aria-hidden className="pointer-events-none flex select-none flex-col">
        {(["delivered", "in_transit", "returned", "not_dispatched"] as const).map((key, i) => (
          <Row key={key} share={[62, 21, 11, 6][i]} value="00%">
            <span className="text-[13px] text-foreground">{t(`overview.parcels.${key}`)}</span>
          </Row>
        ))}
      </ul>
    </section>
  );
}

/** The plan is the owner's to change (owner power "billing"); a team member is shown the plans. */
const COMPARE_HREF = "/plans#compare";

function UpgradeBar({ section }: { section: string }) {
  const t = useTranslations("analyticsPage");
  const mayUpgrade = useOwnerPower()("billing");
  return (
    <div className={cn(CARD, "flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5")}>
      <div className="flex min-w-0 items-start gap-3">
        <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{t("premium.locked", { section })}</h2>
          <p className="text-[13px] text-muted-foreground">
            {t(mayUpgrade ? "premium.lockedLine" : "premium.askOwnerLine")}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button asChild variant={mayUpgrade ? "outline" : "default"} size="sm">
          <Link href={COMPARE_HREF}>{t("premium.compare")}</Link>
        </Button>
        {mayUpgrade ? (
          <Button asChild size="sm">
            <Link href="/plans">{t("premium.upgrade")}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function PlanLink() {
  const t = useTranslations("analyticsPage");
  const mayUpgrade = useOwnerPower()("billing");
  return (
    <Link
      href={mayUpgrade ? "/plans" : COMPARE_HREF}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-ui text-[13px] font-medium text-blue-600 hover:underline dark:text-blue-400"
    >
      <Lock className="size-3.5" aria-hidden />
      {t(mayUpgrade ? "premium.upgrade" : "premium.compare")}
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* The section's own shape, its figures blurred                                */
/* -------------------------------------------------------------------------- */

/** A placeholder figure, unreadable on purpose. */
function Blurred({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("select-none blur-[5px]", className)}>{children}</span>;
}

/** How long the stand-in for each row's name is, so the rows don't look stamped out. */
const LINES = [7, 5.5, 6.5, 4.5, 6, 5];

/** A row of a list: a bar behind it, its name (a line when the name would be the shop's own) and a figure. */
function Row({ share, value, line = 0, children }: { share: number; value: string; line?: number; children?: ReactNode }) {
  return (
    <li className="relative flex min-h-10 items-center justify-between gap-3 px-2.5 py-1.5">
      <span className="absolute inset-y-1 left-0 rounded-ui bg-blue-500/10 dark:bg-blue-400/15" style={{ width: `${share}%` }} />
      <span className="relative min-w-0">
        {children ?? <span className="block h-2.5 rounded-full bg-muted-foreground/20" style={{ width: `${LINES[line % LINES.length]}rem` }} />}
      </span>
      <Blurred className="relative text-[13px] font-medium tabular-nums text-foreground">{value}</Blurred>
    </li>
  );
}

function Panel({ title, note, children, className }: { title: string; note?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn(CARD, "flex min-w-0 flex-col gap-4 p-4 sm:p-5 lg:px-6", className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
        {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

function List({ title, note, shares, className }: { title: string; note?: string; shares: number[]; className?: string }) {
  return (
    <Panel title={title} note={note} className={className}>
      <ul className="flex flex-col">
        {shares.map((share, i) => (
          <Row key={i} share={share} value="0,000" line={i} />
        ))}
      </ul>
    </Panel>
  );
}

function Stats({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className={cn(CARD, "grid grid-cols-2 gap-px overflow-hidden bg-border", items.length === 4 && "lg:grid-cols-4")}>
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col gap-1.5 bg-card px-4 py-3.5 sm:px-5 sm:py-4">
          <StatLabel label={item.label} />
          <Blurred className="text-xl font-semibold tracking-tight text-foreground tabular-nums sm:text-2xl">{item.value}</Blurred>
        </div>
      ))}
    </div>
  );
}

function Chart({ title }: { title: string }) {
  return (
    <Panel title={title}>
      <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="h-40 w-full text-[hsl(var(--accent-blue))] blur-[3px]">
        <path d="M0 78 C30 70 45 52 75 56 S120 30 150 38 S200 18 225 26 S270 10 300 14 L300 100 L0 100 Z" fill="currentColor" opacity="0.14" />
        <path d="M0 78 C30 70 45 52 75 56 S120 30 150 38 S200 18 225 26 S270 10 300 14" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.8" />
      </svg>
    </Panel>
  );
}

function Skeleton({ section }: { section: PremiumSection }) {
  const t = useTranslations("analyticsPage");
  switch (section) {
    case "traffic":
      return (
        <>
          <Stats
            items={[
              { label: t("cards.visitors"), value: "0,000" },
              { label: t("cards.visits"), value: "0,000" },
              { label: t("cards.engaged"), value: "00%" },
              { label: t("cards.timeOnShop"), value: "0m 00s" },
            ]}
          />
          <Chart title={t("chart.visitors", { by: "day" })} />
          <div className="grid gap-4 lg:grid-cols-2">
            <List title={t("traffic.sourcesTitle")} note={t("traffic.sourcesNote")} shares={[84, 58, 36, 20]} />
            <List title={t("traffic.campaignsTitle")} note={t("traffic.campaignsNote")} shares={[70, 48, 28, 14]} />
          </div>
        </>
      );
    case "products":
      return (
        <div className="grid gap-4 lg:grid-cols-2">
          <List className="lg:col-span-2" title={t("products.bestTitle")} note={t("products.bestNote")} shares={[90, 72, 55, 41, 28]} />
          <List title={t("products.categoriesTitle")} shares={[80, 52, 30, 16]} />
          <List title={t("products.lookTitle")} note={t("products.lookNote")} shares={[64, 40, 22]} />
        </div>
      );
    case "districts":
      return (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <Panel title={t("districts.divisionsTitle")} note={t("districts.divisionsNote")}>
            <svg
              viewBox={`0 0 ${MAP_BOX.width} ${MAP_BOX.height}`}
              className="mx-auto h-auto w-full max-w-[14rem] blur-[2px]"
            >
              {Object.values(DIVISION_SHAPES).map((shape, i) => (
                <path
                  key={i}
                  d={shape.path}
                  fill={`hsl(var(--accent-blue) / ${[0.3, 0.5, 0.2, 0.25, 0.85, 0.4, 0.15, 0.6][i]})`}
                  stroke="hsl(var(--card))"
                  strokeWidth={1.2}
                  strokeLinejoin="round"
                />
              ))}
            </svg>
          </Panel>
          <List title={t("districts.listTitle")} note={t("districts.listNote")} shares={[92, 74, 61, 50, 41, 33, 26, 20, 14, 9]} />
        </div>
      );
    case "delivery":
      return (
        <>
          <Stats
            items={[
              { label: t("cards.delivered"), value: "00%" },
              { label: t("cards.returned"), value: "00%" },
              { label: t("cards.daysToDeliver"), value: "0.0" },
              { label: t("cards.notSent"), value: "00" },
            ]}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <List title={t("delivery.couriersTitle")} shares={[78, 46, 20]} />
            <List title={t("delivery.speedTitle")} note={t("delivery.speedNote")} shares={[60, 28, 14, 8]} />
          </div>
        </>
      );
    case "customers":
      return (
        <>
          <Stats
            items={[
              { label: t("cards.customers"), value: "000" },
              { label: t("cards.cameBack"), value: "00%" },
            ]}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <List title={t("customers.mixTitle")} shares={[68, 32]} />
            <List title={t("customers.topTitle")} note={t("customers.topNote")} shares={[88, 70, 52, 36]} />
          </div>
        </>
      );
    case "live":
      return (
        <>
          <Panel title={t("live.title")} note={t("live.note")}>
            <div className="flex items-baseline gap-3">
              <Blurred className="text-4xl font-semibold tabular-nums text-foreground">00</Blurred>
              <span className="text-sm text-muted-foreground">{t("live.rightNow")}</span>
            </div>
          </Panel>
          <div className="grid gap-4 lg:grid-cols-2">
            <List title={t("live.pagesTitle")} shares={[72, 50, 30]} />
            <List title={t("live.sourcesTitle")} shares={[66, 40, 18]} />
          </div>
        </>
      );
  }
}
