"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CircleCheck } from "@/components/ui/circle-check";
import { hasAuthSessionCookie } from "@/lib/auth-session-cookie";
import api from "@/lib/api";
import { formatBillingAmount, formatBillingDay } from "@/lib/billing";
import { toLocaleDigits } from "@/lib/locale-digits";
import { ensureMeProfile } from "@/lib/me-profile-store";
import { numberTextClass } from "@/lib/number-font";
import { cn } from "@/lib/utils";
import { markPlansVisited } from "@/lib/plans-onboarding";
import {
  cardAction,
  cardLines,
  groupDescription,
  groupPlans,
  groupSaving,
  highlightedGroup,
  nextStart,
  planOn,
  switchOpens,
  type BillingCycle,
  type CardLine,
  type CurrentPlan,
  type Plan,
  type PlanGroup,
} from "@/lib/plans-compare";
import type { MeForRouting } from "@/lib/subscription-access";
import { SupportReadOnly } from "@/components/support/SupportReadOnly";

type PageState = "loading" | "ready" | "error";

/**
 * The shop's plan now: paid or on trial and in force, or just ended and in its grace days. A lapsed
 * or unpaid one is not "current".
 */
function currentPlanOf(me: MeForRouting | null): CurrentPlan | null {
  const sub = me?.subscription;
  if (!sub?.plan_public_id) return null;
  if (sub.subscription_status !== "ACTIVE" && sub.subscription_status !== "GRACE") return null;
  return {
    id: sub.plan_public_id,
    name: sub.plan ?? "",
    trial: Boolean(sub.is_trial),
    ended: sub.subscription_status === "GRACE",
    endDate: sub.end_date ?? null,
    daysLeft: sub.days_remaining,
    paidUntil: sub.next_period?.end_date ?? null,
  };
}

/**
 * Plans (owner, 2026-10-02; this look, 2026-10-03, from their reference): a card per plan -- its
 * price, its line, and what it gives (the first what you get, each after "Everything in ..., plus:")
 * -- with the recommended one dark, a tag in a cut corner (current plan, the yearly saving,
 * recommended), and a yearly / monthly switch. A shop sent here from Analytics, which its plan
 * does not include (`?from=analytics`), is told so at the top. Paying is the owner's alone; a team
 * member reads the same page without the buttons.
 *
 * Rounder than the rest of the dashboard (whose corners are 3px) on purpose: the owner's
 * reference, approved as a mockup, on a page that stands outside the dashboard's frame.
 */
export default function PlansPage() {
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const t = useTranslations("plansPage");
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromAnalytics = searchParams.get("from") === "analytics";
  // Settings > Billing's "See yearly prices" opens on them (`?cycle=yearly`).
  const askedCycle = searchParams.get("cycle");

  const [pageState, setPageState] = useState<PageState>("loading");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [me, setMe] = useState<MeForRouting | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>("yearly");

  useEffect(() => {
    if (!hasAuthSessionCookie()) {
      router.replace("/login");
      return;
    }
    markPlansVisited();
    Promise.all([api.get<Plan[]>("billing/plans/"), ensureMeProfile().catch(() => null)])
      .then(([{ data }, profile]) => {
        setPlans(data);
        setMe(profile);
        // The cycle asked for; else the shop's own; else yearly, where the saving shows, if any plan has one.
        const current = data.find((plan) => plan.public_id === currentPlanOf(profile)?.id);
        const asked = askedCycle === "yearly" || askedCycle === "monthly" ? askedCycle : null;
        setCycle(asked ?? current?.billing_cycle ?? (data.some((plan) => plan.billing_cycle === "yearly") ? "yearly" : "monthly"));
        setPageState("ready");
      })
      .catch(() => setPageState("error"));
  }, [router, askedCycle]);

  async function select(plan: Plan) {
    setSelectingId(plan.public_id);
    setSelectError(null);
    try {
      await api.post("billing/payment/initiate/", { plan_public_id: plan.public_id });
      router.push("/checkout");
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "message" in err && typeof err.message === "string" ? err.message : "";
      setSelectError(detail && !detail.startsWith("HTTP ") ? detail : t("initiateError"));
    } finally {
      setSelectingId(null);
    }
  }

  const groups = groupPlans(plans);
  const hasYearly = groups.some((group) => group.yearly);
  const current = currentPlanOf(me);
  const currentGroup = groups.find(
    (group) => group.monthly?.public_id === current?.id || group.yearly?.public_id === current?.id,
  );
  const highlighted = highlightedGroup(groups);
  // A team member reads the plans; paying is the owner's (api: owner power "billing").
  const mayPay = !me?.is_moderator;
  const digits = (text: string) => toLocaleDigits(text, locale);
  const taka = (value: number) => formatBillingAmount(value, locale);
  const withLines = groups.some((group) => groupDescription(group, locale));

  return (
    <div className="min-h-screen bg-(--plans-page) px-4 py-10 text-foreground [--plans-page:#f3f3f2] sm:py-14 dark:[--plans-page:hsl(var(--background))]">
      <div className="mx-auto flex max-w-5xl flex-col">
        <p className="text-[13px] font-semibold tracking-wide text-muted-foreground">Paperbase</p>
        {fromAnalytics ? (
          <p className="mt-3 inline-flex w-fit items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[13px] font-medium text-amber-900 dark:bg-amber-400/15 dark:text-amber-200">
            <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400 dark:fill-amber-300 dark:text-amber-300" aria-hidden />
            {t("fromAnalytics")}
          </p>
        ) : null}
        <header className="mb-7 mt-1.5 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-medium tracking-tight sm:text-[40px] sm:leading-tight">{t("title")}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {currentGroup
                ? `${t(!mayPay ? "shopOnLine" : current?.trial ? "trialLine" : "currentLine", { plan: currentGroup.name })} ${t("paidBy")}`
                : t("subtitle")}
            </p>
          </div>
          {pageState === "ready" && hasYearly ? <CycleSwitch cycle={cycle} onChange={setCycle} /> : null}
        </header>

        {pageState === "error" && (
          <div className="rounded-card border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
            {t("errorLoad")}
          </div>
        )}

        {pageState === "loading" && (
          <div className="flex items-center justify-center py-16">
            <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}

        {pageState === "ready" && groups.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">{t("empty")}</p>
        )}

        {/* Choosing and paying for the plan is the owner's: Paperbase support sees it, greyed. */}
        {pageState === "ready" && groups.length > 0 && (
          <SupportReadOnly centered>
            {selectError && (
              <div className="mb-6 rounded-card border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
                {selectError}
              </div>
            )}
            <div
              className={cn(
                "grid gap-5",
                groups.length === 1 ? "mx-auto w-full max-w-md" : groups.length === 2 ? "md:grid-cols-2" : "lg:grid-cols-3",
              )}
            >
              {groups.map((group, index) => (
                <PlanCard
                  key={group.name}
                  group={group}
                  plan={planOn(group, cycle)!}
                  list={cardLines(groups, index, cycle)}
                  line={withLines ? groupDescription(group, locale) : null}
                  dark={group === highlighted}
                  current={current}
                  own={group === currentGroup}
                  mayPay={mayPay}
                  busy={selectingId}
                  onSelect={select}
                  taka={taka}
                  digits={digits}
                  numClass={numClass}
                />
              ))}
            </div>
            {!mayPay ? <p className="mt-5 text-center text-sm text-muted-foreground">{t("ownerOnly")}</p> : null}
          </SupportReadOnly>
        )}

        <div className="mt-8 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => router.push("/")}
          >
            {t("backHome")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CycleSwitch({ cycle, onChange }: { cycle: BillingCycle; onChange: (cycle: BillingCycle) => void }) {
  const t = useTranslations("plansPage");
  return (
    <div role="group" aria-label={t("cycle")} className="inline-flex rounded-full bg-card p-1 shadow-xs ring-1 ring-border/60">
      {(["yearly", "monthly"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={cycle === option}
          onClick={() => onChange(option)}
          className={cn(
            "rounded-full px-4 py-2 text-[13px] font-medium transition-colors",
            cycle === option ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t(option)}
        </button>
      ))}
    </div>
  );
}

/**
 * The tag in a card's top-right corner, in a notch cut from the card in the page's own colour:
 * the corner's two curves are drawn by the page colour's shadow round a transparent square.
 */
function Notch({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "absolute right-0 top-0 z-10 rounded-bl-[18px] bg-(--plans-page) pb-2.5 pl-3.5",
        "before:absolute before:-left-[18px] before:top-0 before:size-[18px] before:rounded-tr-[18px] before:shadow-[6px_-6px_0_6px_var(--plans-page)] before:content-['']",
        "after:absolute after:-bottom-[18px] after:right-0 after:size-[18px] after:rounded-tr-[18px] after:shadow-[6px_-6px_0_6px_var(--plans-page)] after:content-['']",
      )}
    >
      {children}
    </div>
  );
}

function PlanCard({
  group,
  plan,
  list,
  line,
  dark,
  current,
  own,
  mayPay,
  busy,
  onSelect,
  taka,
  digits,
  numClass,
}: {
  group: PlanGroup;
  plan: Plan;
  list: { plus: string | null; lines: CardLine[] };
  /** Null when no plan has a line: then none leaves room for one. */
  line: string | null;
  dark: boolean;
  /** The shop's plan now, whichever card this is. */
  current: CurrentPlan | null;
  /** This card is the shop's own plan. */
  own: boolean;
  mayPay: boolean;
  busy: string | null;
  onSelect: (plan: Plan) => void;
  taka: (value: number) => string;
  digits: (text: string) => string;
  numClass: string;
}) {
  const t = useTranslations("plansPage");
  const locale = useLocale();
  const monthly = Number(plan.price);
  const yearly = plan.billing_cycle === "yearly";
  const saving = groupSaving(group);
  // The dark card shows what a month would cost without paying yearly, struck through.
  const was = dark && yearly && saving && group.monthly ? Number(group.monthly.price) : null;

  const tag = own && current ? (
    <Tag dot="bg-amber-400">{t(current.trial ? "trialBadge" : "currentBadge")}</Tag>
  ) : dark && yearly && saving ? (
    <Tag dot="bg-zinc-900" className="bg-amber-300 text-zinc-900">
      {t("save", { percent: digits(String(saving)) })}
    </Tag>
  ) : dark ? (
    <Tag dot="bg-green-600">{t("recommended")}</Tag>
  ) : null;

  // A paid plan with more than a week to run has no button (lib/plans-compare cardAction): it shows
  // until when instead -- the last day paid for, when the next period is paid too.
  const kind = cardAction(current, plan);
  const paidAndOn = kind === null;
  const action =
    kind === "renew" || kind === "select" || kind === "switchTo" ? t(kind, { plan: group.name }) : kind ? t(kind) : null;
  const untilDay = own ? (current?.paidUntil ?? (current?.endDate && !current.ended ? current.endDate : null)) : null;
  const until = untilDay ? formatBillingDay(untilDay, locale) : null;
  // Another plan, before the shop's plan's last week: when switching to it opens.
  const opens = !own && !kind ? switchOpens(current) : null;
  // Paid now, a period starts the day after the current one (or the trial) ends: no day is lost.
  const starts = kind && current ? nextStart(current) : null;

  return (
    <section
      aria-label={group.name}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[26px] px-6 pb-7 pt-13 sm:px-8",
        tag && "rounded-tr-none",
        // No outline in dark mode: a ring runs straight across the notch. The recommended card is a
        // shade lighter there instead, beside the cards' own surface.
        dark
          ? "bg-zinc-900 text-zinc-50 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.45)] dark:bg-zinc-800"
          : "bg-card text-card-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-18px_rgba(0,0,0,0.18)]",
      )}
    >
      {tag ? <Notch>{tag}</Notch> : null}
      <h2 className="text-center text-xl font-medium">{group.name}</h2>

      <div className="mt-4 flex flex-wrap items-end justify-center gap-x-2.5 gap-y-1.5">
        {was ? (
          <span className={cn("text-[34px] leading-none text-zinc-400 line-through decoration-2", numClass)}>
            {taka(was)}
          </span>
        ) : null}
        <span className={cn("text-5xl font-medium leading-none tracking-tight", dark && "text-amber-300", numClass)}>
          {taka(monthly)}
        </span>
        <span className={cn("basis-full pb-1 text-center text-xs leading-normal sm:basis-auto sm:text-left", dark ? "text-zinc-400" : "text-muted-foreground")}>
          <span className={cn(dark && "font-medium text-amber-300")}>{t("perMonth")}</span>
          <span className="sm:hidden"> · </span>
          <br className="hidden sm:block" />
          {yearly ? t("billedYearly", { total: taka(monthly * 12) }) : t("billedMonthly")}
        </span>
      </div>

      {line !== null ? (
        <p className={cn("mx-auto mt-4 min-h-[3.2em] max-w-[22rem] text-center text-[13px] leading-relaxed", dark ? "text-zinc-400" : "text-muted-foreground")}>
          {line}
        </p>
      ) : null}

      <hr className={cn("my-6 border-0 border-t-[1.5px] border-dashed", dark ? "border-zinc-700" : "border-border")} />

      {list.plus ? (
        <p className={cn("mb-3 text-[13px] font-medium", dark ? "text-zinc-300" : "text-foreground")}>
          {t("everythingIn", { plan: list.plus })}
        </p>
      ) : null}
      <ul className="flex flex-1 flex-col gap-3">
        {list.lines.map((item) => (
          <li key={item.id} className="flex items-center gap-3 text-[13.5px]">
            <CircleCheck />
            <span className="min-w-0">
              {item.count === undefined
                ? t(`lines.${item.id}`)
                : t(`lines.${item.id}`, { count: digits(new Intl.NumberFormat("en-US").format(item.count)) })}
            </span>
          </li>
        ))}
      </ul>

      {paidAndOn && own ? (
        // Where the button would be: the plan in force, and until when.
        <p
          className={cn(
            "mt-7 inline-flex h-11 items-center self-center rounded-full border px-6 text-sm font-medium",
            dark ? "border-zinc-700 text-zinc-300" : "border-border text-muted-foreground",
          )}
        >
          {until ? t("activeUntil", { date: until }) : t("currentBadge")}
        </p>
      ) : paidAndOn ? (
        opens ? (
          <p className={cn("mt-7 self-center text-[13px]", dark ? "text-zinc-400" : "text-muted-foreground")}>
            {t("switchOpens", { date: formatBillingDay(opens, locale) })}
          </p>
        ) : null
      ) : (
        <div className="mt-7 flex flex-col items-center gap-2">
          {current?.trial && until ? (
            <p className={cn("text-[13px]", dark ? "text-zinc-400" : "text-muted-foreground")}>
              {t("trialUntil", { date: until })}
            </p>
          ) : null}
          {mayPay && action ? (
            <Button
              className={cn(
                "h-11 rounded-full px-7",
                dark ? "bg-white text-zinc-900 hover:bg-zinc-100" : "bg-muted text-foreground hover:bg-muted/70",
              )}
              loading={busy === plan.public_id}
              disabled={busy !== null}
              onClick={() => onSelect(plan)}
            >
              {action}
            </Button>
          ) : null}
          {mayPay && action && starts ? (
            <p className={cn("text-xs", dark ? "text-zinc-400" : "text-muted-foreground")}>
              {t("startsOn", { date: formatBillingDay(starts, locale) })}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

function Tag({ dot, className, children }: { dot: string; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-xs", className)}>
      <span className={cn("size-1.5 rounded-full", dot)} aria-hidden />
      {children}
    </span>
  );
}
