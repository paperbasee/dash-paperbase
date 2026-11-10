"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/page/PageHeader";
import { planIncludesApp } from "@/config/apps";
import { useFeatures } from "@/hooks/useFeatures";
import { useRouter } from "@/i18n/navigation";
import api from "@/lib/api";
import { numberTextClass } from "@/lib/number-font";

import type { FraudCheckApiOk } from "../_components/types";
import { ColourGuide } from "./_components/ColourGuide";
import { CourierBars } from "./_components/CourierBars";
import { MerchantReports } from "./_components/MerchantReports";
import { PaperbaseHistory } from "./_components/PaperbaseHistory";
import { PhoneLookup } from "./_components/PhoneLookup";
import { VerdictBand } from "./_components/VerdictBand";
import { checkPhone, checkProblem, readReport, shownPhone, type CheckProblem } from "./_lib/report";

type Lookup =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "failed"; problem: CheckProblem }
  | {
      kind: "ready";
      /** The number as it was checked. */
      phone: string;
      data: FraudCheckApiOk;
      /** A Check again is under way; `data` stays shown until it answers. */
      refreshing: boolean;
      /** Why the last Check again got no new answer (`data` is the one from before). */
      refreshProblem: CheckProblem | null;
    };

/**
 * Fraud check (owner, 2026-11-10): any phone number, not only an order's -- the same check the
 * order list runs (`POST fraud-check/`, its plan and limits), on a page of its own design; the
 * order list's pop-up is its own and stays as it is. The answer comes first (the verdict band),
 * then each courier, other merchants' reports and Paperbase's own history.
 *
 * Premium only, as every fraud check is: a plan without it never sees the page -- the address
 * sends them to the plans, which say why. Checking follows orders.edit (config/permissions.ts).
 */
export default function FraudCheckPage() {
  const t = useTranslations("fraudCheckPage");
  const tCheck = useTranslations("fraudCheck");
  const tNav = useTranslations("nav");
  const tHints = useTranslations("pageHints");
  const numberClass = numberTextClass(useLocale());
  const router = useRouter();
  const { features, loading } = useFeatures();
  // Known not to be on the plan -- not merely unloaded or failed to load, which keeps the page.
  const notOnPlan = !planIncludesApp("fraud_check", features);

  const [phone, setPhone] = useState("");
  const [lookup, setLookup] = useState<Lookup>({ kind: "idle" });
  // Only the latest check may answer: a slower one for the number typed before is dropped.
  const latest = useRef(0);

  useEffect(() => {
    // Replaced, so Back does not return to an address that only sends them on again.
    if (notOnPlan) router.replace("/plans?from=fraud-check");
  }, [notOnPlan, router]);

  async function check(number: string, fresh: boolean) {
    const id = ++latest.current;
    setLookup((prev) =>
      fresh && prev.kind === "ready" ? { ...prev, refreshing: true, refreshProblem: null } : { kind: "checking" },
    );
    try {
      const data = await checkPhone(api, number, fresh);
      if (id !== latest.current) return;
      setLookup((prev) =>
        // A Check again the provider failed keeps the answer it had, as an order's report does.
        fresh && prev.kind === "ready" && prev.data.status === "success" && data.status !== "success"
          ? { ...prev, refreshing: false, refreshProblem: "errorFailed" }
          : { kind: "ready", phone: number, data, refreshing: false, refreshProblem: null },
      );
    } catch (err) {
      if (id !== latest.current) return;
      const problem = checkProblem(err);
      setLookup((prev) =>
        fresh && prev.kind === "ready" ? { ...prev, refreshing: false, refreshProblem: problem } : { kind: "failed", problem },
      );
    }
  }

  if (loading || notOnPlan) return null;

  let body: ReactNode;
  if (lookup.kind === "idle" || lookup.kind === "failed") {
    body = <ColourGuide />;
  } else if (lookup.kind === "checking") {
    body = (
      <div className="flex min-h-[184px] items-center justify-center rounded-card border border-card-border bg-card" aria-busy>
        <Loader2 className="size-7 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  } else {
    const { data } = lookup;
    // Couriers and reports are the provider's to give: when it did not answer, only Paperbase's own.
    const answered = data.status === "success";
    const report = readReport(data.response);
    body = (
      <>
        {!answered ? <Notice>{t("providerDown")}</Notice> : null}
        {lookup.refreshProblem ? (
          <Notice>{tCheck(lookup.refreshProblem === "errorLimit" ? "checkAgainLimit" : "checkAgainFailed")}</Notice>
        ) : null}
        {data.risk ? (
          <VerdictBand
            risk={data.risk}
            phone={shownPhone(lookup.phone)}
            summary={answered ? report.summary : null}
            checkedAt={data.checked_at ?? null}
            onCheckAgain={() => void check(lookup.phone, true)}
            checkingAgain={lookup.refreshing}
            numberClass={numberClass}
          />
        ) : null}
        <div className="grid items-start gap-5 @min-[56rem]:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          {answered ? <CourierBars couriers={report.couriers} numberClass={numberClass} /> : null}
          <div className="flex min-w-0 flex-col gap-5">
            {answered ? <MerchantReports reports={report.reports} /> : null}
            {data.history ? <PaperbaseHistory history={data.history} numberClass={numberClass} /> : null}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={tNav("fraud_check")} hint={tHints("fraudCheck")} />
      <div className="@container flex flex-col gap-5">
        <PhoneLookup
          phone={phone}
          onPhoneChange={setPhone}
          onCheck={() => void check(phone.trim(), false)}
          checking={lookup.kind === "checking"}
          problem={lookup.kind === "failed" ? t(lookup.problem) : null}
          numberClass={numberClass}
        />
        <div className="flex flex-col gap-5" aria-live="polite">
          {body}
        </div>
      </div>
    </div>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-card border border-amber-600/30 bg-amber-500/[0.08] px-3 py-2.5 text-sm text-amber-900 dark:text-amber-100">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="min-w-0">{children}</p>
    </div>
  );
}
