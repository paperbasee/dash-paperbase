"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { getAccessToken } from "@/lib/auth";
import { invalidateMeRoutingCache } from "@/lib/subscription-access";
import api from "@/lib/api";
import { CheckoutSuccessAnimation } from "@/components/checkout/CheckoutSuccessAnimation";
import {
  CheckoutProviderPaymentCard,
  CheckoutProviderPicker,
  type ManualPaymentProvider,
} from "@/components/checkout/CheckoutManualPaymentViews";
import { firstScreen } from "@/lib/checkout/first-screen";
import { numberTextClass } from "@/lib/number-font";
import { PLATFORM_LINKS } from "@/lib/platform-links";

const CHECKOUT_PROVIDER_STORAGE_KEY = "paperbase_checkout_manual_provider_v1";

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

type Screen = "loading" | "selectProvider" | "form" | "submitted" | "error" | "notSetUp";

export default function CheckoutPage() {
  const t = useTranslations("checkoutPage");
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const router = useRouter();

  const [screen, setScreen] = useState<Screen>("loading");
  const [payment, setPayment] = useState<PendingPayment | null>(null);
  const [config, setConfig] = useState<PaymentConfig>({ bkash_number: "", nagad_number: "" });
  const [selectedProvider, setSelectedProvider] = useState<ManualPaymentProvider | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [txnIdError, setTxnIdError] = useState<string | null>(null);
  /** After payment submit: brief profile load before CTA (keeps layout stable). */
  const [successProfileLoading, setSuccessProfileLoading] = useState(false);

  function persistProviderChoice(p: ManualPaymentProvider) {
    try {
      sessionStorage.setItem(CHECKOUT_PROVIDER_STORAGE_KEY, p);
    } catch {
      // ignore
    }
  }

  function handleSelectBkash() {
    persistProviderChoice("bkash");
    setSelectedProvider("bkash");
    setScreen("form");
  }

  function handleSelectNagad() {
    persistProviderChoice("nagad");
    setSelectedProvider("nagad");
    setScreen("form");
  }

  function handleChangeProvider() {
    try {
      sessionStorage.removeItem(CHECKOUT_PROVIDER_STORAGE_KEY);
    } catch {
      // ignore
    }
    setScreen("selectProvider");
  }

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
          router.replace("/");
          return;
        }

        setPayment(pendingRes.data.payment);
        setConfig(configRes.data);

        // If user already submitted a transaction ID, jump to submitted screen.
        if (pendingRes.data.payment.transaction_id) {
          setScreen("submitted");
        } else {
          let picked: string | null = null;
          try {
            picked = sessionStorage.getItem(CHECKOUT_PROVIDER_STORAGE_KEY);
          } catch {
            picked = null;
          }
          const first = firstScreen(configRes.data, picked);
          if (first.screen === "form") setSelectedProvider(first.provider);
          setScreen(first.screen);
        }
      } catch {
        if (!cancelled) setScreen("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (screen !== "submitted") return;

    setSuccessProfileLoading(true);
    let cancelled = false;

    (async () => {
      try {
        invalidateMeRoutingCache();
        await api.get("auth/me/");
      } catch {
        // ignore
      } finally {
        if (!cancelled) setSuccessProfileLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [screen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setTxnIdError(null);

    const trimmedTxn = transactionId.trim();
    if (!trimmedTxn) {
      setTxnIdError(t("transactionIdRequired"));
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

  // --- No bKash or Nagad number to pay to yet (Django admin > Paperbase payment numbers) ---
  if (screen === "notSetUp") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-background to-muted/30 px-4">
        <div className="w-full max-w-sm space-y-3 text-center">
          <h1 className="text-lg font-semibold text-foreground">{t("notSetUpTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("notSetUpLine")}</p>
          <div className="flex flex-col items-center gap-2 pt-3">
            {PLATFORM_LINKS.help ? (
              <Button asChild>
                <a href={PLATFORM_LINKS.help} target="_blank" rel="noopener noreferrer">
                  {t("contactSupport")}
                </a>
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => router.replace("/plans")}>
              {t("backToPlans")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --- Payment successful / under review (no auto-redirect; user picks next step) ---
  if (screen === "submitted") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background via-background to-muted/30 px-4 py-10">
        <div className="w-full max-w-md space-y-8">
          <CheckoutSuccessAnimation className="drop-shadow-sm" />

          <div className="space-y-3 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {t("successTitle")}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("successBody")}</p>
          </div>

          {successProfileLoading ? (
            <div className="flex justify-center py-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <Button className="w-full" onClick={() => router.replace("/")}>
              {t("goToDashboard")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // --- Pick payment provider (both bKash + Nagad configured) ---
  if (screen === "selectProvider" && payment) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-background via-background to-muted/30">
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:py-16">
          <p className="mb-2 max-w-md text-center text-sm font-semibold tracking-wide text-foreground">
            Paperbase
          </p>
          <h1 className="mb-6 max-w-md text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t("title")}
          </h1>
          <CheckoutProviderPicker
            bkashAvailable={Boolean(config.bkash_number?.trim())}
            nagadAvailable={Boolean(config.nagad_number?.trim())}
            onSelectBkash={handleSelectBkash}
            onSelectNagad={handleSelectNagad}
          />
          <Button
            variant="ghost"
            size="sm"
            className="mt-8 text-muted-foreground hover:text-foreground"
            onClick={() => router.push("/plans")}
          >
            {t("backToPlans")}
          </Button>
        </div>
      </div>
    );
  }

  // --- Payment form screen ---
  const bothProvidersConfigured =
    Boolean(config.bkash_number?.trim()) && Boolean(config.nagad_number?.trim());

  if (screen === "form" && payment && selectedProvider) {
    const phoneForProvider =
      selectedProvider === "bkash" ? config.bkash_number : config.nagad_number;

    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 px-4 py-10">
        <div className="mx-auto max-w-lg space-y-6">
          <div className="space-y-2 text-center">
            <p className="text-sm font-semibold tracking-wide text-foreground">Paperbase</p>
            {payment.plan?.billing_cycle === "yearly" && (
              <p className="text-xs leading-relaxed text-muted-foreground">{t("billingYearlyHelp")}</p>
            )}
            {payment.plan?.billing_cycle === "monthly" && (
              <p className="text-xs text-muted-foreground">{t("billingMonthlyHelp")}</p>
            )}
          </div>

          <CheckoutProviderPaymentCard
            provider={selectedProvider}
            payment={{
              public_id: payment.public_id,
              amount: payment.amount,
              currency: payment.currency,
              plan: payment.plan,
            }}
            phoneNumber={phoneForProvider?.trim() ?? ""}
            transactionId={transactionId}
            senderNumber={senderNumber}
            submitting={submitting}
            submitError={submitError}
            txnIdError={txnIdError}
            onTransactionIdChange={(v) => {
              setTransactionId(v);
              setTxnIdError(null);
            }}
            onSenderNumberChange={setSenderNumber}
            onSubmit={handleSubmit}
            onClose={() => router.push("/plans")}
            onChangeProvider={bothProvidersConfigured ? handleChangeProvider : undefined}
            numClass={numClass}
          />
        </div>
      </div>
    );
  }

  // Fallback: still loading payment/provider state
  return spinner;
}
