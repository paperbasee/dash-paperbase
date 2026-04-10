"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { logout, getAccessToken } from "@/lib/auth";
import api from "@/lib/api";

interface Plan {
  public_id: string;
  name: string;
  price: string;
  billing_cycle: "monthly" | "yearly";
  features: {
    limits?: Record<string, number>;
    features?: Record<string, boolean>;
  };
  is_default: boolean;
}

type PageState = "loading" | "ready" | "error";
type BillingCycle = "monthly" | "yearly";

export default function PlansPage() {
  const t = useTranslations("plansPage");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    api
      .get<Plan[]>("billing/plans/")
      .then(({ data }) => {
        setPlans(data);
        setPageState("ready");
      })
      .catch(() => setPageState("error"));
  }, [router]);

  async function handleSelectPlan(plan: Plan) {
    setSelectingId(plan.public_id);
    setSelectError(null);
    try {
      await api.post("billing/payment/initiate/", {
        plan_public_id: plan.public_id,
      });
      router.push("/checkout");
    } catch (err: unknown) {
      let msg = t("initiateError");
      if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response
      ) {
        const data = (err.response as { data?: unknown }).data;
        if (typeof data === "string") msg = data;
        else if (
          data &&
          typeof data === "object" &&
          "non_field_errors" in data &&
          Array.isArray((data as Record<string, unknown>).non_field_errors)
        ) {
          msg = ((data as Record<string, unknown[]>).non_field_errors as string[])[0] ?? msg;
        } else if (
          data &&
          typeof data === "object" &&
          "detail" in data &&
          typeof (data as Record<string, unknown>).detail === "string"
        ) {
          msg = (data as Record<string, string>).detail;
        }
      }
      setSelectError(msg);
      setSelectingId(null);
    }
  }

  function formatPriceMonthlyEquivalent(plan: Plan) {
    const price = parseFloat(plan.price);
    return `${t("currency")} ${price.toLocaleString()}`;
  }

  function formatYearlyTotal(monthlyEquivalentPrice: string) {
    const m = parseFloat(monthlyEquivalentPrice);
    const total = m * 12;
    return `${t("currency")} ${total.toLocaleString()}`;
  }

  const grouped = plans.reduce<Record<string, Partial<Record<BillingCycle, Plan>>>>(
    (acc, p) => {
      acc[p.name] = acc[p.name] ?? {};
      acc[p.name][p.billing_cycle] = p;
      return acc;
    },
    {}
  );
  const planGroups = Object.entries(grouped).map(([name, cycles]) => ({
    name,
    monthly: cycles.monthly ?? null,
    yearly: cycles.yearly ?? null,
  }));
  const hasAnyYearly = plans.some((p) => p.billing_cycle === "yearly");

  const spinner = (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background px-4 py-12 text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-semibold tracking-wide text-foreground/70">Paperbase</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">{t("title")}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
            {t("subtitle")}
          </p>
        </div>

        {/* Error loading */}
        {pageState === "error" && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
            {t("errorLoad")}
          </div>
        )}

        {/* Loading */}
        {pageState === "loading" && spinner}

        {/* Plans grid */}
        {pageState === "ready" && plans.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">{t("empty")}</p>
        )}

        {pageState === "ready" && plans.length > 0 && (
          <>
            {selectError && (
              <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-200">
                {selectError}
              </div>
            )}

            <div className="mb-6 flex w-full justify-center">
              <div className="inline-flex rounded-full border border-border bg-card p-1 shadow-sm">
                <button
                  type="button"
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    billingCycle === "monthly"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setBillingCycle("monthly")}
                >
                  {t("monthly")}
                </button>
                <button
                  type="button"
                  disabled={!hasAnyYearly}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    billingCycle === "yearly"
                      ? "bg-primary text-primary-foreground"
                      : hasAnyYearly
                        ? "text-muted-foreground hover:text-foreground"
                        : "cursor-not-allowed text-muted-foreground/50"
                  }`}
                  onClick={() => {
                    if (!hasAnyYearly) return;
                    setBillingCycle("yearly");
                  }}
                >
                  {t("yearly")}
                </button>
              </div>
            </div>

            <div className="mx-auto grid w-full max-w-5xl justify-center justify-items-center gap-6 [grid-template-columns:repeat(auto-fit,minmax(18rem,20rem))]">
              {planGroups.map((g) => {
                const selected = (billingCycle === "yearly" ? g.yearly : g.monthly) ?? g.monthly ?? g.yearly;
                if (!selected) return null;

                const featureEntries = Object.entries(selected.features?.features ?? {}).filter(
                  ([, v]) => v === true
                );
                const limitEntries = Object.entries(selected.features?.limits ?? {});
                const isSelecting = selectingId === selected.public_id;
                const showYearly = billingCycle === "yearly" && !!g.yearly;

                return (
                  <div
                    key={`${g.name}-${selected.public_id}`}
                    className={`flex w-full flex-col rounded-2xl bg-card p-6 text-card-foreground shadow-sm ring-1 ring-border ${
                      selected.is_default ? "ring-2 ring-primary/50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-semibold">{selected.name}</h2>
                      {selected.is_default && (
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                          Best offer
                        </span>
                      )}
                    </div>

                    <div className="mt-5 flex items-end gap-2">
                      <p className="text-4xl font-semibold tracking-tight">
                        {formatPriceMonthlyEquivalent(selected)}
                      </p>
                      <p className="pb-1 text-sm text-muted-foreground">{t("perMonth")}</p>
                    </div>

                    {showYearly ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {`Billed yearly (${formatYearlyTotal(selected.price)} total)`}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {t("billingCycleLabel")}: {t("monthly")}
                      </p>
                    )}

                    {/* Features & limits */}
                    <div className="mt-6 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("featuresLabel")}
                      </p>
                      <ul className="mt-3 space-y-2">
                        {featureEntries.slice(0, 5).map(([key]) => (
                          <li key={key} className="flex items-start gap-2 text-sm">
                            <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background">
                              <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                            </span>
                            <span className="min-w-0 leading-snug">{key.replace(/_/g, " ")}</span>
                          </li>
                        ))}
                        {limitEntries.slice(0, 3).map(([key, val]) => (
                          <li key={key} className="flex items-start gap-2 text-sm">
                            <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background">
                              <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                            </span>
                            <span className="min-w-0 leading-snug text-muted-foreground">
                              {key.replace(/_/g, " ")}:{" "}
                              <span className="font-medium text-foreground">{val}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* CTA */}
                    <div className="mt-6">
                      <LoadingButton
                        className="w-full rounded-2xl"
                        isLoading={isSelecting}
                        loadingText={t("initiating")}
                        disabled={selectingId !== null}
                        onClick={() => handleSelectPlan(selected)}
                      >
                        {t("selectPlan")}
                      </LoadingButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Sign-out link */}
        <div className="mt-10 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => logout()}
          >
            {tCommon("signOut")}
          </Button>
        </div>
      </div>
    </div>
  );
}
