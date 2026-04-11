"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import api from "@/lib/api";
import {
  invalidateMeRoutingCache,
  resolvePostAuthRoute,
} from "@/lib/subscription-access";
import { useRouter } from "@/i18n/navigation";
import type { RecoverableStore } from "@/hooks/useRecoverableStores";

export default function RecoverStorePanel({
  stores,
  onRecovered,
  showHeader = true,
}: {
  stores: RecoverableStore[];
  onRecovered: () => void;
  showHeader?: boolean;
}) {
  const t = useTranslations("settings");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<RecoverableStore | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [singleChannel, setSingleChannel] = useState(false);
  const [ownerCode, setOwnerCode] = useState("");
  const [contactCode, setContactCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sendSubmitting, setSendSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetDialogState() {
    setTarget(null);
    setChallengeId(null);
    setSingleChannel(false);
    setOwnerCode("");
    setContactCode("");
    setError(null);
  }

  function handleDialogOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetDialogState();
  }

  function openFor(store: RecoverableStore) {
    setChallengeId(null);
    setSingleChannel(false);
    setOwnerCode("");
    setContactCode("");
    setError(null);
    setTarget(store);
    setOpen(true);
  }

  async function sendCodes() {
    if (!target) return;
    setSendSubmitting(true);
    setError(null);
    try {
      const purpose =
        target.status === "inactive"
          ? "restore_inactive"
          : "restore_pending_delete";
      const { data } = await api.post<{
        challenge_public_id: string;
        single_channel: boolean;
      }>("store/restore/send-codes/", {
        store_public_id: target.public_id,
        purpose,
      });
      setChallengeId(data.challenge_public_id);
      setSingleChannel(data.single_channel);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? null
          : null;
      setError(msg || t("recover.errSend"));
    } finally {
      setSendSubmitting(false);
    }
  }

  async function verify() {
    if (!target || !challengeId) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await api.post<{
        access: string;
        refresh: string;
        redirect_route: string;
        complete?: boolean;
      }>("store/restore/verify/", {
        store_public_id: target.public_id,
        challenge_public_id: challengeId,
        owner_code: ownerCode.trim(),
        contact_code: contactCode.trim(),
      });
      if (data.complete === false) {
        setError(t("recover.needBothCodes"));
        setSubmitting(false);
        return;
      }
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      invalidateMeRoutingCache();
      const result = await resolvePostAuthRoute();
      router.push(result.ok ? result.path : data.redirect_route || "/");
      setOpen(false);
      resetDialogState();
      onRecovered();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? null
          : null;
      setError(msg || t("recover.errVerify"));
    } finally {
      setSubmitting(false);
    }
  }

  if (stores.length === 0) return null;

  const canVerify =
    ownerCode.trim().length >= 6 && (singleChannel || contactCode.trim().length >= 6);

  return (
    <>
      <div className="overflow-hidden rounded-card border border-border bg-background shadow-xs">
        {showHeader ? (
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <h3 className="text-base font-semibold text-foreground">{t("recover.heading")}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t("recover.subtitle")}</p>
          </div>
        ) : null}
        <ul className="divide-y divide-border">
          {stores.map((s) => (
            <li
              key={s.public_id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{s.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {s.status === "pending_delete"
                    ? t("recover.statusPendingDelete")
                    : t("recover.statusInactive")}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 rounded-ui border-border"
                onClick={() => openFor(s)}
              >
                {t("recover.restore")}
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          showCloseButton={!sendSubmitting && !submitting}
          className="gap-0 overflow-hidden rounded-card border-border p-0 shadow-xl max-sm:max-h-[min(90dvh,calc(100vh-1.5rem))] w-full max-sm:max-w-[min(20rem,calc(100vw-1.5rem))] sm:max-w-sm"
        >
          <DialogHeader className="space-y-1 border-b border-border px-4 pb-3 pt-4 text-left sm:space-y-1.5 sm:px-5 sm:pb-4 sm:pt-5">
            <DialogTitle className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
              {t("recover.dialogTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs leading-snug text-muted-foreground sm:text-sm sm:leading-relaxed">
              {target ? t("recover.dialogIntro", { name: target.name }) : null}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 px-4 pb-4 pt-3 sm:space-y-5 sm:px-5 sm:pb-5 sm:pt-4">
            {target && !challengeId && (
              <div className="space-y-2 sm:space-y-4">
                {error ? (
                  <div className="rounded-ui border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                ) : null}
                <LoadingButton
                  type="button"
                  className="h-9 w-full rounded-ui text-sm font-medium sm:h-10 sm:text-base"
                  isLoading={sendSubmitting}
                  loadingText={t("recover.sending")}
                  onClick={() => void sendCodes()}
                >
                  {t("recover.sendCodes")}
                </LoadingButton>
              </div>
            )}

            {challengeId ? (
              <div className="space-y-2.5 sm:space-y-4">
                <div className="flex flex-col gap-1.5 sm:gap-2">
                  <label htmlFor="recover-owner-otp" className="text-xs font-medium text-foreground sm:text-sm">
                    {t("recover.ownerCode")}
                  </label>
                  <Input
                    id="recover-owner-otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    size="lg"
                    value={ownerCode}
                    onChange={(e) => setOwnerCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    placeholder="000000"
                    className="text-center font-mono text-base tracking-[0.25em] tabular-nums placeholder:tracking-[0.25em] sm:text-lg"
                  />
                </div>
                {!singleChannel && (
                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    <label htmlFor="recover-contact-otp" className="text-xs font-medium text-foreground sm:text-sm">
                      {t("recover.contactCode")}
                    </label>
                    <Input
                      id="recover-contact-otp"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      size="lg"
                      value={contactCode}
                      onChange={(e) => setContactCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      placeholder="000000"
                      className="text-center font-mono text-base tracking-[0.25em] tabular-nums placeholder:tracking-[0.25em] sm:text-lg"
                    />
                  </div>
                )}
                {error ? (
                  <div className="rounded-ui border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {challengeId ? (
            <DialogFooter className="border-t border-border px-4 py-3 sm:justify-stretch sm:px-5 sm:py-4">
              <LoadingButton
                type="button"
                className="h-9 w-full rounded-ui text-sm font-medium sm:h-10 sm:text-base"
                isLoading={submitting}
                loadingText={t("recover.verifying")}
                disabled={!canVerify}
                onClick={() => void verify()}
              >
                {t("recover.verify")}
              </LoadingButton>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
