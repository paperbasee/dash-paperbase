"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Copy, Wallet } from "lucide-react";
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
}

interface PendingPayment {
  public_id: string;
  amount: string;
  currency: string;
  status: string;
  provider: string;
  plan: Plan | null;
  transaction_id: string | null;
}

interface PaymentConfig {
  bkash_number: string;
  nagad_number: string;
}

type Screen = "loading" | "form" | "submitted" | "error";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label={copied ? "Copied" : "Copy number"}
    >
      <Copy className="h-3 w-3" aria-hidden />
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function CheckoutPage() {
  const t = useTranslations("checkoutPage");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [screen, setScreen] = useState<Screen>("loading");
  const [payment, setPayment] = useState<PendingPayment | null>(null);
  const [config, setConfig] = useState<PaymentConfig>({ bkash_number: "", nagad_number: "" });
  const [transactionId, setTransactionId] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [txnIdError, setTxnIdError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const [pendingRes, configRes] = await Promise.all([
          api.get<{ pending: boolean; payment: PendingPayment | null }>(
            "billing/payment/pending/"
          ),
          api.get<PaymentConfig>("billing/payment/config/"),
        ]);

        if (cancelled) return;

        if (!pendingRes.data.pending || !pendingRes.data.payment) {
          router.replace("/plans");
          return;
        }

        setPayment(pendingRes.data.payment);
        setConfig(configRes.data);

        // If user already submitted a transaction ID, jump to submitted screen.
        if (pendingRes.data.payment.transaction_id) {
          setScreen("submitted");
        } else {
          setScreen("form");
        }
      } catch {
        if (!cancelled) setScreen("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setTxnIdError(null);

    const trimmedTxn = transactionId.trim();
    if (!trimmedTxn) {
      setTxnIdError(t("transactionIdLabel") + " is required.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("billing/payment/submit/", {
        transaction_id: trimmedTxn,
        sender_number: senderNumber.trim(),
      });
      setScreen("submitted");
    } catch (err: unknown) {
      let msg = t("submitError");
      if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response
      ) {
        const data = (err.response as { data?: unknown }).data;
        if (
          data &&
          typeof data === "object" &&
          "transaction_id" in data &&
          Array.isArray((data as Record<string, unknown>).transaction_id)
        ) {
          setTxnIdError(((data as Record<string, string[]>).transaction_id)[0] ?? msg);
          setSubmitting(false);
          return;
        }
        if (typeof data === "string") msg = data;
        else if (
          data &&
          typeof data === "object" &&
          "detail" in data &&
          typeof (data as Record<string, unknown>).detail === "string"
        ) {
          msg = (data as Record<string, string>).detail;
        }
      }
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const spinner = (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-background to-muted/30">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  if (screen === "loading") return spinner;

  if (screen === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-background to-muted/30 px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <p className="text-sm text-destructive">{t("noPendingPayment")}</p>
          <Button variant="outline" onClick={() => router.replace("/plans")}>
            {t("backToPlans")}
          </Button>
        </div>
      </div>
    );
  }

  // --- Submitted / pending review screen ---
  if (screen === "submitted") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background via-background to-muted/30 px-4 py-10">
        <div className="w-full max-w-md space-y-6">
          <div className="rounded-xl border border-border bg-card px-6 py-8 shadow-sm">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-7 w-7 text-primary" aria-hidden />
              </div>
              <h1 className="text-xl font-semibold text-foreground">{t("submittedTitle")}</h1>
              <p className="text-sm leading-relaxed text-muted-foreground">{t("submittedBody")}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => logout()}
            >
              {t("signOut")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --- Payment form screen ---
  const hasNumbers = config.bkash_number || config.nagad_number;
  const monthlyEq =
    payment?.plan?.billing_cycle === "yearly" && payment?.plan?.price
      ? parseFloat(payment.plan.price)
      : null;
  const yearlyTotal =
    monthlyEq !== null ? `${payment?.currency ?? "BDT"} ${(monthlyEq * 12).toLocaleString()}` : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 px-4 py-10">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <p className="mb-1 text-sm font-semibold tracking-wide text-foreground/70">Paperbase</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t("title")}
          </h1>
        </div>

        {/* Plan summary */}
        {payment?.plan && (
          <div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
            <dl className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground shrink-0">{t("planLabel")}</dt>
                <dd className="font-medium text-foreground text-right">{payment.plan.name}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground shrink-0">{t("billingPeriodLabel")}</dt>
                <dd className="text-right">
                  <span
                    className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
                      payment.plan.billing_cycle === "monthly"
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {payment.plan.billing_cycle === "monthly"
                      ? t("billingMonthly")
                      : t("billingYearly")}
                  </span>
                </dd>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground border-t border-border pt-3">
                {payment.plan.billing_cycle === "monthly"
                  ? t("billingMonthlyHelp")
                  : t("billingYearlyHelp")}
              </p>
              {payment.plan.billing_cycle === "yearly" && monthlyEq !== null && yearlyTotal && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {`${payment.currency} ${monthlyEq.toLocaleString()}/month billed yearly (${yearlyTotal} total)`}
                </p>
              )}
              <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
                <dt className="text-muted-foreground">{t("amountLabel")}</dt>
                <dd className="text-lg font-bold tabular-nums text-foreground">
                  {payment.currency} {parseFloat(payment.amount).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {/* Manual mobile wallet — not card checkout */}
        <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-4 shadow-sm dark:border-amber-400/30 dark:bg-amber-500/5">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-200">
              <Wallet className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <h2 className="text-sm font-semibold text-foreground">{t("payMethodCalloutTitle")}</h2>
              <p className="text-sm leading-relaxed text-foreground/90">{t("payMethodCalloutBody")}</p>
            </div>
          </div>
        </div>

        {/* Payment instructions */}
        <div className="rounded-2xl border border-border bg-card px-5 py-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">{t("instructionsTitle")}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{t("instructionsBody")}</p>

          {!hasNumbers && (
            <p className="text-sm text-muted-foreground italic">{t("noNumbersNote")}</p>
          )}

          {config.bkash_number && (
            <div className="mb-3 flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("bkashLabel")}
                </p>
                <p className="mt-0.5 font-mono text-base font-semibold text-foreground">
                  {config.bkash_number}
                </p>
              </div>
              <CopyButton value={config.bkash_number} />
            </div>
          )}

          {config.nagad_number && (
            <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("nagadLabel")}
                </p>
                <p className="mt-0.5 font-mono text-base font-semibold text-foreground">
                  {config.nagad_number}
                </p>
              </div>
              <CopyButton value={config.nagad_number} />
            </div>
          )}
        </div>

        {/* Transaction form */}
        <div className="rounded-2xl border border-border bg-card px-5 py-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-foreground">{t("formTitle")}</h2>

          {submitError && (
            <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="transaction_id"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                {t("transactionIdLabel")}
                <span className="ml-1 text-destructive" aria-hidden>*</span>
              </label>
              <input
                id="transaction_id"
                type="text"
                required
                autoComplete="off"
                value={transactionId}
                onChange={(e) => {
                  setTransactionId(e.target.value);
                  setTxnIdError(null);
                }}
                placeholder={t("transactionIdPlaceholder")}
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  txnIdError ? "border-destructive" : "border-input"
                }`}
              />
              {txnIdError && (
                <p className="mt-1 text-xs text-destructive">{txnIdError}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="sender_number"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                {t("senderNumberLabel")}
              </label>
              <input
                id="sender_number"
                type="tel"
                autoComplete="tel"
                value={senderNumber}
                onChange={(e) => setSenderNumber(e.target.value)}
                placeholder={t("senderNumberPlaceholder")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <LoadingButton
              type="submit"
              className="w-full"
              isLoading={submitting}
              loadingText={t("submitting")}
            >
              {t("submit")}
            </LoadingButton>
          </form>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col gap-2 pb-6 sm:flex-row sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => router.push("/plans")}
          >
            {t("backToPlans")}
          </Button>
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
