"use client";

import { type ReactNode, useMemo } from "react";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useOwnerPower } from "@/hooks/useOwnerPower";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import type { Period } from "../_lib/period";
import {
  sampleCustomers,
  sampleDelivery,
  sampleDistricts,
  sampleLive,
  sampleProducts,
  sampleTraffic,
} from "../_lib/samples";
import type { SectionKey } from "../_lib/types";
import { Customers } from "../_sections/Customers";
import { Delivery } from "../_sections/Delivery";
import { Districts } from "../_sections/Districts";
import { Live } from "../_sections/Live";
import { Products } from "../_sections/Products";
import { Traffic } from "../_sections/Traffic";

/** The Premium sections; Overview and Sales stay on Essential (owner, 2026-09-27). */
export type PremiumSection = Exclude<SectionKey, "overview" | "sales">;

/** The plan is the owner's to change (owner power "billing"); a team member is shown the plans. */
const COMPARE_HREF = "/plans#compare";

/**
 * Each Premium section drawn from the made-up samples (_lib/samples.ts) -- the real section, so it
 * looks exactly as it does on Premium.
 */
const DRAW: Record<PremiumSection, (period: Period) => ReactNode> = {
  traffic: (period) => <Traffic report={sampleTraffic(period)} />,
  products: (period) => <Products report={sampleProducts(period)} />,
  districts: (period) => <Districts report={sampleDistricts(period)} />,
  delivery: (period) => <Delivery report={sampleDelivery(period)} />,
  customers: (period) => <Customers report={sampleCustomers(period)} />,
  live: () => <Live report={sampleLive()} />,
};

/**
 * A Premium section on the Essential plan (owner, 2026-10-03): the real section, blurred, drawn
 * from made-up samples, under one card -- Unlock Premium analytics. Nothing here asks the API for
 * the section's report: the shop's own numbers never reach the browser, so DevTools has nothing
 * of theirs to show (the API refuses those reports on Essential besides).
 */
export function LockedSection({ section, period }: { section: PremiumSection; period: Period }) {
  const t = useTranslations("analyticsPage");
  const drawn = useMemo(() => DRAW[section](period), [section, period]);
  return <Locked card={<UnlockCard line={t(`premium.lines.${section}`)} />}>{drawn}</Locked>;
}

/**
 * What a plan does not include: `children` blurred and out of reach -- no clicks, no keyboard, not
 * read aloud, not selectable -- with `card` over it. The card follows the reader down a long
 * section; `compact` centres it over one small card instead.
 */
export function Locked({ card, compact = false, children }: { card: ReactNode; compact?: boolean; children: ReactNode }) {
  return (
    <div className="relative isolate">
      <div aria-hidden inert className="pointer-events-none select-none blur-[6px]">
        {children}
      </div>
      <div className={cn("absolute inset-0 z-10 px-4", compact && "flex items-center justify-center")}>
        {compact ? card : <div className="sticky top-24 flex justify-center pt-10 sm:pt-16">{card}</div>}
      </div>
    </div>
  );
}

/** The card over a locked part: what it shows, and the way to it -- the owner's, or the owner to ask. */
export function UnlockCard({ line, compact = false }: { line: string; compact?: boolean }) {
  const t = useTranslations("analyticsPage");
  const mayUpgrade = useOwnerPower()("billing");
  return (
    <div
      className={cn(
        "w-full rounded-dialog bg-card text-center text-card-foreground shadow-lg ring-1 ring-border",
        compact ? "max-w-xs p-4" : "max-w-sm p-6 sm:p-7",
      )}
    >
      {compact ? null : (
        <span className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
          <Lock className="size-4 text-foreground" aria-hidden />
        </span>
      )}
      <h2 className={cn("font-semibold text-foreground", compact ? "text-[15px]" : "text-lg")}>
        {t("premium.unlockTitle")}
      </h2>
      <p className={cn("mt-1.5 text-muted-foreground", compact ? "text-xs" : "text-sm")}>
        {line} {t(mayUpgrade ? "premium.unlockOwner" : "premium.unlockMember")}
      </p>
      <div className={cn("flex flex-col items-center gap-2.5", compact ? "mt-3" : "mt-5")}>
        {mayUpgrade ? (
          <Button asChild size={compact ? "sm" : "default"} className={compact ? undefined : "w-full sm:w-auto sm:min-w-40"}>
            <Link href="/plans">{t("premium.upgrade")}</Link>
          </Button>
        ) : null}
        <Link
          href={COMPARE_HREF}
          className={cn(
            "font-medium text-foreground underline-offset-4 hover:underline",
            compact ? "text-xs" : "text-sm",
            !mayUpgrade && "rounded-ui border border-border px-3 py-1.5 hover:no-underline hover:bg-muted",
          )}
        >
          {t("premium.compare")}
        </Link>
      </div>
    </div>
  );
}
