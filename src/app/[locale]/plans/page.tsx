"use client";

import { Fragment, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Minus } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { getAccessToken } from "@/lib/auth";
import api from "@/lib/api";
import { toLocaleDigits } from "@/lib/locale-digits";
import { ensureMeProfile } from "@/lib/me-profile-store";
import { numberTextClass } from "@/lib/number-font";
import { cn } from "@/lib/utils";
import { markPlansVisited } from "@/lib/plans-onboarding";
import {
  cellOf,
  comparison,
  groupPlans,
  planOn,
  yearlySaving,
  type BillingCycle,
  type Plan,
  type PlanGroup,
} from "@/lib/plans-compare";
import type { MeForRouting } from "@/lib/subscription-access";
import { SupportReadOnly } from "@/components/support/SupportReadOnly";

type PageState = "loading" | "ready" | "error";

/** The shop's plan now: a paid or trial plan in force. A lapsed or unpaid one is not "current". */
function currentPlanOf(me: MeForRouting | null): { id: string; trial: boolean } | null {
  const sub = me?.subscription;
  if (!sub?.plan_public_id) return null;
  if (sub.subscription_status !== "ACTIVE" && sub.subscription_status !== "GRACE") return null;
  return { id: sub.plan_public_id, trial: Boolean(sub.is_trial) };
}

/**
 * Plans, the way Shopify shows them (owner, 2026-10-02): a card per plan with the shop's own
 * marked, a monthly / yearly switch, then every plan's features side by side (#compare, where
 * "Compare plans" on a locked analytics section lands). Paying is the owner's alone; a team
 * member reads the same page without the buttons.
 */
export default function PlansPage() {
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const t = useTranslations("plansPage");
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [me, setMe] = useState<MeForRouting | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    markPlansVisited();
    Promise.all([
      api.get<Plan[]>("billing/plans/"),
      ensureMeProfile().catch(() => null),
    ])
      .then(([{ data }, profile]) => {
        setPlans(data);
        setMe(profile);
        const current = data.find((plan) => plan.public_id === currentPlanOf(profile)?.id);
        if (current) setCycle(current.billing_cycle);
        setPageState("ready");
      })
      .catch(() => setPageState("error"));
  }, [router]);

  // "Compare plans" opens this page at the comparison, which is drawn only once the plans are in.
  useEffect(() => {
    if (pageState === "ready" && window.location.hash === "#compare") {
      document.getElementById("compare")?.scrollIntoView({ block: "start" });
    }
  }, [pageState]);

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
  const saving = yearlySaving(groups);
  const hasYearly = groups.some((group) => group.yearly);
  const current = currentPlanOf(me);
  const currentGroup = groups.find(
    (group) => group.monthly?.public_id === current?.id || group.yearly?.public_id === current?.id,
  );
  // A team member reads the plans; paying is the owner's (api: owner power "billing").
  const mayPay = !me?.is_moderator;
  const digits = (text: string) => toLocaleDigits(text, locale);
  const taka = (value: number) => `৳${digits(new Intl.NumberFormat("en-US").format(Math.round(value)))}`;

  const shown = groups.map((group) => planOn(group, cycle));
  const rows = comparison(shown);

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground sm:py-14">
      <div className="mx-auto flex max-w-5xl flex-col">
        <header className="mb-8 text-center sm:mb-10">
          <p className="mb-2 text-sm font-semibold tracking-wide text-foreground/70">Paperbase</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">{t("title")}</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            {currentGroup
              ? `${t(!mayPay ? "shopOnLine" : current?.trial ? "trialLine" : "currentLine", { plan: currentGroup.name })} ${t("paidBy")}`
              : t("subtitle")}
          </p>
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

            {hasYearly ? (
              <div className="mb-6 flex justify-center">
                <div role="group" className="inline-flex rounded-ui border border-border bg-card p-1 shadow-xs">
                  {(["monthly", "yearly"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={cycle === option}
                      onClick={() => setCycle(option)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-ui px-4 py-2 text-sm font-medium transition-colors",
                        cycle === option ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t(option)}
                      {option === "yearly" && saving ? (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-semibold",
                            cycle === "yearly"
                              ? "bg-primary-foreground/15 text-primary-foreground"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                          )}
                        >
                          {t(saving.low === saving.high ? "save" : "saveUpTo", { percent: digits(String(saving.high)) })}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mx-auto grid w-full gap-4 sm:gap-6 [grid-template-columns:repeat(auto-fit,minmax(16rem,1fr))]">
              {groups.map((group) => (
                <PlanCard
                  key={group.name}
                  group={group}
                  plan={planOn(group, cycle)!}
                  isCurrent={group === currentGroup}
                  currentId={current?.id ?? null}
                  isTrial={Boolean(current?.trial)}
                  mayPay={mayPay}
                  busy={selectingId}
                  onSelect={select}
                  taka={taka}
                  numClass={numClass}
                />
              ))}
            </div>
            {!mayPay ? <p className="mt-4 text-center text-sm text-muted-foreground">{t("ownerOnly")}</p> : null}
          </SupportReadOnly>
        )}

        {pageState === "ready" && rows.length > 0 && (
          <section id="compare" aria-labelledby="compare-title" className="mt-12 scroll-mt-6 sm:mt-16">
            <h2 id="compare-title" className="mb-4 text-xl font-semibold tracking-tight sm:text-2xl">
              {t("compareTitle")}
            </h2>
            <div className="overflow-hidden rounded-card border border-border bg-card">
              <table className="w-full table-fixed border-collapse text-sm">
                <colgroup>
                  <col />
                  {groups.map((group) => (
                    <col key={group.name} className="w-24 sm:w-40" />
                  ))}
                </colgroup>
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground sm:px-5">
                      <span className="sr-only">{t("feature")}</span>
                    </th>
                    {groups.map((group) => (
                      <th
                        key={group.name}
                        scope="col"
                        className={cn("px-2 py-3 text-center font-semibold", group === currentGroup && "bg-muted/60")}
                      >
                        {group.name}
                        {group === currentGroup ? (
                          <span className="block text-xs font-normal text-muted-foreground">
                            {t(current?.trial ? "trialBadge" : "currentBadge")}
                          </span>
                        ) : null}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((block) => (
                    <Fragment key={block.id}>
                      <tr className="border-b border-border bg-muted/40">
                        <th
                          scope="colgroup"
                          colSpan={groups.length + 1}
                          className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:px-5"
                        >
                          {t(`groups.${block.id}`)}
                        </th>
                      </tr>
                      {block.rows.map((row) => (
                        <tr key={row.id} className="border-b border-border last:border-b-0">
                          <th scope="row" className="px-4 py-3 text-left font-normal text-foreground sm:px-5">
                            {t(`rows.${row.id}`)}
                          </th>
                          {groups.map((group, i) => (
                            <td
                              key={group.name}
                              className={cn("px-2 py-3 text-center", group === currentGroup && "bg-muted/60")}
                            >
                              <Cell
                                value={cellOf(shown[i], row)}
                                included={t("included")}
                                notIncluded={t("notIncluded")}
                                digits={digits}
                                numClass={numClass}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <div className="mt-10 text-center">
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

function PlanCard({
  group,
  plan,
  isCurrent,
  currentId,
  isTrial,
  mayPay,
  busy,
  onSelect,
  taka,
  numClass,
}: {
  group: PlanGroup;
  plan: Plan;
  isCurrent: boolean;
  currentId: string | null;
  isTrial: boolean;
  mayPay: boolean;
  busy: string | null;
  onSelect: (plan: Plan) => void;
  taka: (value: number) => string;
  numClass: string;
}) {
  const t = useTranslations("plansPage");
  const monthly = Number(plan.price);
  const badge = isCurrent ? t(isTrial ? "trialBadge" : "currentBadge") : plan.is_default ? t("recommended") : null;
  // Paying is by hand, each period: the plan the shop pays for now is renewed here, its other
  // cycle switched to. A trial's plan is chosen like any other.
  const action =
    isCurrent && !isTrial
      ? plan.public_id === currentId
        ? t("renew", { plan: group.name })
        : t(plan.billing_cycle === "yearly" ? "switchToYearly" : "switchToMonthly")
      : t("select", { plan: group.name });

  return (
    <div
      className={cn(
        "flex flex-col rounded-dialog bg-card p-5 text-card-foreground shadow-sm ring-1 ring-border sm:p-6",
        isCurrent ? "ring-2 ring-foreground/70" : plan.is_default && "ring-2 ring-primary/50",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{group.name}</h2>
        {badge ? (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              isCurrent ? "bg-foreground text-background" : "bg-primary/10 text-primary",
            )}
          >
            {badge}
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex items-baseline gap-1.5">
        <p className={cn("text-4xl font-semibold tracking-tight", numClass)}>{taka(monthly)}</p>
        <p className="text-sm text-muted-foreground">{t("perMonth")}</p>
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {plan.billing_cycle === "yearly" ? t("billedYearly", { total: taka(monthly * 12) }) : t("billedMonthly")}
      </p>

      {mayPay ? (
        <Button
          className="mt-6 w-full"
          variant={isCurrent ? "outline" : "default"}
          loading={busy === plan.public_id}
          disabled={busy !== null}
          onClick={() => onSelect(plan)}
        >
          {action}
        </Button>
      ) : null}
    </div>
  );
}

function Cell({
  value,
  included,
  notIncluded,
  digits,
  numClass,
}: {
  value: boolean | number | null;
  included: string;
  notIncluded: string;
  digits: (text: string) => string;
  numClass: string;
}) {
  if (typeof value === "number") {
    return <span className={cn("font-medium", numClass)}>{digits(new Intl.NumberFormat("en-US").format(value))}</span>;
  }
  return value ? (
    <Check className="mx-auto size-4 text-foreground" strokeWidth={2.5} aria-label={included} role="img" />
  ) : (
    <Minus className="mx-auto size-4 text-muted-foreground/60" aria-label={notIncluded} role="img" />
  );
}
