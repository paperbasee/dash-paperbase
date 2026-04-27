"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Check, Copy, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";
import { useEnterNavigation } from "@/hooks/useEnterNavigation";

export type ManualPaymentProvider = "bkash" | "nagad";

const BKASH_LOGO = "/assets/payment-provider/BKash-bKash2-Logo.wine.svg";
const NAGAD_LOGO = "/assets/payment-provider/Nagad-Logo.wine.svg";

interface Plan {
  name: string;
  price: string;
  billing_cycle: "monthly" | "yearly";
}

interface PaymentSummary {
  public_id: string;
  amount: string;
  currency: string;
  plan: Plan | null;
}

function CopyNumberButton({ value, copiedLabel, copyLabel }: { value: string; copiedLabel: string; copyLabel: string }) {
  const [copied, setCopied] = useState(false);

  async function copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    }
  }

  async function handleCopy() {
    const ok = await copyToClipboard(value);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md border border-solid p-2.5 shadow-sm transition-all duration-200 ease-out",
        "active:scale-95",
        "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        copied
          ? "border-emerald-600 bg-emerald-500/15 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-300"
          : "border-amber-500/80 bg-background text-foreground dark:border-amber-500/70"
      )}
      aria-label={copied ? copiedLabel : copyLabel}
      aria-pressed={copied}
    >
      <span className="flex h-5 w-5 items-center justify-center">
        {copied ? (
          <Check
            key="copied"
            className="h-4 w-4 animate-in zoom-in-95 duration-200 text-emerald-600 dark:text-emerald-300"
            strokeWidth={2.5}
            aria-hidden
          />
        ) : (
          <Copy key="copy" className="h-4 w-4" aria-hidden />
        )}
      </span>
    </button>
  );
}

function BrandDivider({ provider }: { provider: ManualPaymentProvider }) {
  return (
    <div
      className={cn(
        "h-px w-full",
        provider === "bkash"
          ? "bg-[#E91E8C]/80 dark:bg-[#E91E8C]/60"
          : "bg-[#ED1C24]/90 dark:bg-[#ED1C24]/70"
      )}
    />
  );
}

export function CheckoutProviderPicker({
  bkashAvailable,
  nagadAvailable,
  onSelectBkash,
  onSelectNagad,
}: {
  bkashAvailable: boolean;
  nagadAvailable: boolean;
  onSelectBkash: () => void;
  onSelectNagad: () => void;
}) {
  const t = useTranslations("checkoutPage");

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-border bg-card p-10 shadow-sm">
      <div className="space-y-2 text-left">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {t("selectPaymentTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("selectPaymentSubtitle")}</p>
      </div>

      <div className="mt-8 space-y-8">
        {bkashAvailable && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("payViaBkash")}</p>
            <button
              type="button"
              onClick={onSelectBkash}
              className={cn(
                "flex h-24 w-full items-center justify-center rounded-xl border border-border bg-card",
                "transition-colors hover:border-primary/40 hover:bg-muted/40",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              <Image
                src={BKASH_LOGO}
                alt=""
                width={260}
                height={72}
                draggable={false}
                className="h-[64px] w-auto max-w-[min(94%,320px)] select-none object-contain object-center [-webkit-user-drag:none] dark:brightness-110"
              />
            </button>
          </div>
        )}

        {nagadAvailable && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("payViaNagad")}</p>
            <button
              type="button"
              onClick={onSelectNagad}
              className={cn(
                "flex h-24 w-full items-center justify-center rounded-xl border border-border bg-card",
                "transition-colors hover:border-primary/40 hover:bg-muted/40",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              <Image
                src={NAGAD_LOGO}
                alt=""
                width={280}
                height={80}
                draggable={false}
                className="h-[68px] w-auto max-w-[min(94%,320px)] select-none object-contain object-center [-webkit-user-drag:none] dark:brightness-110"
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function CheckoutProviderPaymentCard({
  provider,
  payment,
  phoneNumber,
  transactionId,
  senderNumber,
  submitting,
  submitError,
  txnIdError,
  onTransactionIdChange,
  onSenderNumberChange,
  onSubmit,
  onClose,
  onChangeProvider,
  numClass,
}: {
  provider: ManualPaymentProvider;
  payment: PaymentSummary;
  phoneNumber: string;
  transactionId: string;
  senderNumber: string;
  submitting: boolean;
  submitError: string | null;
  txnIdError: string | null;
  onTransactionIdChange: (v: string) => void;
  onSenderNumberChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  onChangeProvider?: () => void;
  numClass: string;
}) {
  const t = useTranslations("checkoutPage");
  const canConfirm = transactionId.trim().length > 0;
  const formRef = useRef<HTMLFormElement>(null);
  const { handleKeyDown } = useEnterNavigation(() => formRef.current?.requestSubmit());

  const brandPanel =
    provider === "bkash"
      ? "bg-[#C91E54] dark:bg-[#a01845]"
      : "bg-[#ED1C24] dark:bg-[#c4181e]";

  const instructionBody =
    provider === "bkash" ? t("sendMoneyBodyBkash") : t("sendMoneyBodyNagad");

  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-md">
      {/* Brand header — match picker logo scale; compact padding limits vertical growth */}
      <div className="bg-card px-4 pt-3 pb-1.5">
        <div className="flex items-center justify-center">
          <Image
            src={provider === "bkash" ? BKASH_LOGO : NAGAD_LOGO}
            alt=""
            width={provider === "bkash" ? 280 : 300}
            height={84}
            draggable={false}
            className={cn(
              "w-auto max-w-[min(100%,340px)] select-none object-contain object-center [-webkit-user-drag:none]",
              provider === "bkash" ? "h-[64px]" : "h-[68px]",
              "dark:brightness-110"
            )}
          />
        </div>
        <div className="mt-2.5">
          <BrandDivider provider={provider} />
        </div>
      </div>

      {/* Order row */}
      <div className="flex items-start gap-3 border-b border-amber-400/35 bg-card px-4 py-4 dark:border-amber-500/25">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted">
          <ShoppingCart className="h-5 w-5 text-muted-foreground" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{t("merchantName")}</p>
          {payment.plan && (
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
              {t("orderPlanLine", {
                planName: payment.plan.name,
                period:
                  payment.plan.billing_cycle === "monthly"
                    ? t("planPeriodMonth")
                    : t("planPeriodYear"),
              })}
            </p>
          )}
        </div>
        <p className={cn("shrink-0 text-base font-bold text-foreground", numClass)}>
          ৳{parseFloat(payment.amount).toLocaleString()}
        </p>
      </div>

      <form ref={formRef} onSubmit={onSubmit} noValidate>
        {/* Instructions */}
        <div className="border-b border-border bg-amber-50/90 px-4 py-4 dark:bg-amber-950/25">
          <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
            {t("sendMoneyTitle")}
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-foreground/85 dark:text-foreground/80">
            {instructionBody}
          </p>
          {phoneNumber ? (
            <div className="mt-4 flex items-stretch gap-2 rounded-lg border-2 border-amber-400/80 bg-background px-3 py-3 dark:border-amber-500/50">
              <p
                className={cn(
                  "min-w-0 flex-1 self-center text-[1.65rem] font-bold leading-tight tracking-tight text-foreground sm:text-[2rem] sm:leading-none",
                  numClass
                )}
              >
                {phoneNumber}
              </p>
              <CopyNumberButton
                value={phoneNumber}
                copiedLabel={t("copied")}
                copyLabel={t("copyNumber")}
              />
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground italic">{t("noNumbersNote")}</p>
          )}
        </div>

        {/* Form — brand panel */}
        <div className={cn(brandPanel, "px-4 py-5")}>
          {submitError && (
            <div className="mb-4 rounded-md border border-white/25 bg-black/10 px-3 py-2 text-center text-xs text-white">
              {submitError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="transaction_id"
                className="mb-2 block text-left text-xs font-bold uppercase tracking-wide text-white"
              >
                {t("transactionIdLabel")}
              </label>
              <input
                id="transaction_id"
                type="text"
                required
                autoComplete="off"
                value={transactionId}
                onChange={(e) => onTransactionIdChange(e.target.value)}
                placeholder={t("transactionIdPlaceholder")}
                className={cn(
                  "w-full rounded-lg border-0 bg-background px-3 py-2.5 text-left text-sm text-foreground shadow-inner placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/50",
                  numClass,
                  txnIdError && "ring-2 ring-amber-200"
                )}
                onKeyDown={handleKeyDown}
              />
              {txnIdError && (
                <p className="mt-1.5 text-left text-xs text-amber-100">{txnIdError}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="sender_number"
                className="mb-2 block text-left text-xs font-bold uppercase tracking-wide text-white"
              >
                {t("phoneNumberFieldLabel")}
              </label>
              <input
                id="sender_number"
                type="tel"
                autoComplete="tel"
                value={senderNumber}
                onChange={(e) => onSenderNumberChange(e.target.value)}
                placeholder={t("phoneNumberPlaceholder")}
                className={cn(
                  "w-full rounded-lg border-0 bg-background px-3 py-2.5 text-left text-sm text-foreground shadow-inner placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/50",
                  numClass
                )}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          <p className="mt-4 text-center text-[11px] leading-snug text-white/90">
            {t.rich("termsNotice", {
              b: (chunks) => <strong className="font-semibold text-white">{chunks}</strong>,
            })}
          </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-px bg-zinc-700 dark:bg-zinc-900">
          <button
            type="button"
            onClick={onClose}
            className="bg-zinc-600 py-3.5 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-zinc-500 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            {t("close")}
          </button>
          <LoadingButton
            type="submit"
            isLoading={submitting}
            loadingText={t("submitting")}
            disabled={!canConfirm}
            className={cn(
              "h-auto min-h-0 rounded-none py-3.5 text-sm font-bold uppercase tracking-wide",
              canConfirm
                ? "bg-zinc-500 text-white hover:bg-zinc-400 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                : "cursor-not-allowed bg-zinc-600/80 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
            )}
          >
            {t("confirm")}
          </LoadingButton>
        </div>
      </form>

      {onChangeProvider && (
        <div className="border-t border-border bg-muted/30 px-4 py-3 text-center">
          <button
            type="button"
            onClick={onChangeProvider}
            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {t("changePaymentMethod")}
          </button>
        </div>
      )}
    </div>
  );
}
