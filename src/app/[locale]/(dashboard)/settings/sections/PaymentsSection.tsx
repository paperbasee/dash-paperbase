"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Loader2, Mail, TriangleAlert } from "lucide-react";

import { SupportReadOnly } from "@/components/support/SupportReadOnly";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { isApiHttpError } from "@/lib/api-client";
import {
  WALLETS,
  changedWallets,
  parsePaymentNumbers,
  type Wallet,
} from "@/lib/payment-numbers";
import { paymentNumbersQueryKey } from "@/lib/query-keys";
import { notify } from "@/notifications";

import {
  SettingsSectionBody,
  settingsInvertedButtonClassName,
  settingsSectionSurfaceClassName,
} from "../SettingsSectionBody";

/** Each wallet's own colour, as a small mark beside its name. */
const WALLET_DOT: Record<Wallet, string> = {
  bkash: "bg-[#E2136E]",
  nagad: "bg-[#F6921E]",
};

const EMPTY: Record<Wallet, string> = { bkash: "", nagad: "" };

/**
 * Settings > Payments (owner, 2026-10-02; lib/payment-numbers.ts): the bKash and Nagad numbers
 * shoppers send a prepaid order's money to. The owner's alone -- the tab is hidden from every team
 * member (config/owner-powers.ts), and the API refuses them too. Clearing a number stops that
 * wallet being offered; every change is emailed to the owner.
 */
export default function PaymentsSection({ hidden }: { hidden: boolean }) {
  const t = useTranslations("settings.payments");
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: paymentNumbersQueryKey,
    queryFn: async () => parsePaymentNumbers((await api.get<unknown>("store/payment-numbers/")).data),
    enabled: !hidden,
  });

  const saved = query.data?.numbers ?? EMPTY;
  const [typed, setTyped] = useState<Record<Wallet, string>>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Wallet, string>>>({});
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  // What is on the server is what the fields start from, and come back to after a save.
  useEffect(() => {
    if (query.data) setTyped(query.data.numbers);
  }, [query.data]);

  if (hidden) return null;

  const changes = changedWallets(saved, typed);
  const unchanged = Object.keys(changes).length === 0;
  const noNumber = WALLETS.every((wallet) => !saved[wallet]);
  const prepaid = query.data?.prepaidProducts ?? 0;

  async function handleSave() {
    setSaving(true);
    setErrors({});
    setFailed(false);
    try {
      const { data } = await api.patch<unknown>("store/payment-numbers/", changes);
      queryClient.setQueryData(paymentNumbersQueryKey, parsePaymentNumbers(data));
      notify.success({ key: "settings.payments.saved" });
    } catch (err) {
      const body = isApiHttpError(err) && typeof err.data === "object" && err.data ? err.data : null;
      const fieldErrors: Partial<Record<Wallet, string>> = {};
      for (const wallet of WALLETS) {
        if (body && wallet in body) fieldErrors[wallet] = t("invalid");
      }
      if (Object.keys(fieldErrors).length) setErrors(fieldErrors);
      else setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      id="panel-payments"
      role="tabpanel"
      aria-labelledby="tab-payments"
      className={settingsSectionSurfaceClassName}
    >
      {query.isLoading ? null : (
        <SettingsSectionBody>
          <div className="w-full space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-medium text-foreground">{t("heading")}</h2>
              <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>

            {noNumber && prepaid > 0 ? (
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-ui border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-sm text-amber-900 dark:text-amber-200"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                <p>{t("noneWarning", { count: prepaid })}</p>
              </div>
            ) : null}

            <SupportReadOnly>
              <form
                className="space-y-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!unchanged && !saving) void handleSave();
                }}
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  {WALLETS.map((wallet) => (
                    <div key={wallet} className="form-field">
                      <label htmlFor={`payment-${wallet}`} className="field-label inline-flex items-center gap-2">
                        <span aria-hidden className={`size-2 rounded-full ${WALLET_DOT[wallet]}`} />
                        {t(wallet)}
                      </label>
                      <Input
                        id={`payment-${wallet}`}
                        inputMode="tel"
                        autoComplete="off"
                        value={typed[wallet]}
                        onChange={(e) => {
                          const value = e.target.value;
                          setTyped((current) => ({ ...current, [wallet]: value }));
                          setErrors((current) => ({ ...current, [wallet]: undefined }));
                        }}
                        placeholder={t("placeholder")}
                        aria-invalid={errors[wallet] ? true : undefined}
                        className="tabular-nums"
                      />
                      <p className={errors[wallet] ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                        {errors[wallet] ?? (saved[wallet] ? t("hintOffered") : t("hintNotOffered"))}
                      </p>
                    </div>
                  ))}
                </div>

                {failed ? <p className="text-sm text-destructive">{t("failed")}</p> : null}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="size-3.5" aria-hidden />
                    {t("emailNote")}
                  </p>
                  <Button
                    type="submit"
                    variant="outline"
                    className={`${settingsInvertedButtonClassName} gap-2`}
                    disabled={saving || unchanged}
                  >
                    {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
                    {t("save")}
                  </Button>
                </div>
              </form>
            </SupportReadOnly>
          </div>
        </SettingsSectionBody>
      )}
    </section>
  );
}
