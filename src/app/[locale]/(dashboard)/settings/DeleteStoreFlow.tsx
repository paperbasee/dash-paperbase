"use client";

import type { Dispatch, SetStateAction } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DELETE_STORE_CONFIRM_PHRASE } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { translateDeletionStep } from "./deletionStepLabels";
import type { DeleteModalStep } from "./useDeleteStore";
import { useAuth } from "@/context/AuthContext";

type DeleteStatus = {
  status: string;
  current_step: string;
  error_message: string | null;
  scheduled_delete_at?: string | null;
} | null;

function formatScheduledAt(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
}

export default function DeleteStoreFlow({
  deleteConfirmOpen,
  onDeleteConfirmOpenChange,
  deleteModalStep,
  deleteConfirmStoreName,
  onDeleteConfirmStoreNameChange,
  deleteConfirmPhrase,
  onDeleteConfirmPhraseChange,
  otpCode,
  onOtpCodeChange,
  handleSendDeleteOtp,
  handleConfirmDeleteOtp,
  onBackToPhraseStep,
  deleteConfirmMatches,
  otpValid,
  deletionInProgress,
  deleteRequestSubmitting,
  deleteSuccessDisplayed,
  deleteStatus,
  deletionSteps,
  deleteRequestError,
  expectedStoreName,
  storeDisplayName,
  onCloseDeletion,
}: {
  deleteConfirmOpen: boolean;
  onDeleteConfirmOpenChange: Dispatch<SetStateAction<boolean>> | ((open: boolean) => void);
  deleteModalStep: DeleteModalStep;
  deleteConfirmStoreName: string;
  onDeleteConfirmStoreNameChange: Dispatch<SetStateAction<string>> | ((value: string) => void);
  deleteConfirmPhrase: string;
  onDeleteConfirmPhraseChange: Dispatch<SetStateAction<string>> | ((value: string) => void);
  otpCode: string;
  onOtpCodeChange: Dispatch<SetStateAction<string>> | ((value: string) => void);
  handleSendDeleteOtp: () => void;
  handleConfirmDeleteOtp: () => void;
  onBackToPhraseStep: () => void;
  deleteConfirmMatches: boolean;
  otpValid: boolean;
  deletionInProgress: boolean;
  deleteRequestSubmitting: boolean;
  deleteSuccessDisplayed: boolean;
  deleteStatus: DeleteStatus;
  deletionSteps: string[];
  deleteRequestError: string | null;
  expectedStoreName: string;
  storeDisplayName: string;
  onCloseDeletion: () => void;
}) {
  const t = useTranslations("settings");
  const { logout } = useAuth();
  function handleDialogOpenChange(next: boolean) {
    if (!next) {
      if (deleteRequestSubmitting) return;
      onDeleteConfirmOpenChange(false);
    } else {
      onDeleteConfirmOpenChange(true);
    }
  }

  function stepDisplay(step: string) {
    return translateDeletionStep(step, (key) => t(key as never));
  }

  const phraseStep = deleteModalStep === "phrase";

  return (
    <>
      <Dialog open={deleteConfirmOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            "gap-0 p-0 sm:rounded-lg",
            "max-sm:max-w-[min(20rem,calc(100vw-1.5rem))] max-sm:rounded-lg",
          )}
          onPointerDownOutside={(e) => {
            if (deleteRequestSubmitting) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (deleteRequestSubmitting) e.preventDefault();
          }}
        >
          <DialogHeader className="gap-1 border-b border-border p-4 sm:gap-1.5 sm:p-6">
            <DialogTitle className="text-sm font-semibold sm:text-base">
              {phraseStep ? t("deleteFlow.dialogTitle") : t("deleteFlow.otpStepTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs leading-snug text-muted-foreground sm:text-sm sm:leading-normal">
              {phraseStep ? t("deleteFlow.dialogDescription") : t("deleteFlow.otpStepDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 p-4 sm:space-y-4 sm:p-6">
            {phraseStep ? (
              <>
                <div className="flex flex-col gap-1.5 sm:gap-2">
                  <label
                    htmlFor="delete-store-confirm-name"
                    className="text-xs leading-snug text-foreground sm:text-sm sm:leading-normal"
                  >
                    {t("deleteFlow.confirmTypeName")}{" "}
                    <span className="break-words font-semibold text-foreground">
                      {expectedStoreName || storeDisplayName}
                    </span>
                  </label>
                  <Input
                    id="delete-store-confirm-name"
                    autoComplete="off"
                    className="h-9 text-sm sm:h-10 sm:text-base"
                    value={deleteConfirmStoreName}
                    onChange={(e) => onDeleteConfirmStoreNameChange(e.target.value)}
                    disabled={deleteRequestSubmitting}
                    placeholder={expectedStoreName || storeDisplayName}
                  />
                </div>

                <div className="flex flex-col gap-1.5 sm:gap-2">
                  <label
                    htmlFor="delete-store-confirm-phrase"
                    className="text-xs leading-snug text-foreground sm:text-sm sm:leading-normal"
                  >
                    {t("deleteFlow.confirmTypePhrase")}{" "}
                    <span className="font-semibold text-foreground">{DELETE_STORE_CONFIRM_PHRASE}</span>
                  </label>
                  <Input
                    id="delete-store-confirm-phrase"
                    autoComplete="off"
                    className="h-9 text-sm sm:h-10 sm:text-base"
                    value={deleteConfirmPhrase}
                    onChange={(e) => onDeleteConfirmPhraseChange(e.target.value)}
                    disabled={deleteRequestSubmitting}
                    placeholder={DELETE_STORE_CONFIRM_PHRASE}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-1.5 sm:gap-2">
                <label
                  htmlFor="delete-store-otp"
                  className="text-xs leading-snug text-foreground sm:text-sm sm:leading-normal"
                >
                  {t("deleteFlow.otpLabel")}
                </label>
                <Input
                  id="delete-store-otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="h-9 text-center font-mono text-base tracking-widest sm:h-10 sm:text-lg"
                  value={otpCode}
                  onChange={(e) => onOtpCodeChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  disabled={deleteRequestSubmitting}
                  placeholder={t("deleteFlow.otpPlaceholder")}
                />
              </div>
            )}

            <div
              className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive sm:gap-3 sm:rounded-lg sm:px-4 sm:py-3 sm:text-sm"
              role="alert"
            >
              <AlertCircle className="size-4 shrink-0 sm:size-5" aria-hidden />
              <p className="leading-snug">
                {phraseStep
                  ? t("deleteFlow.warningUndone", { name: storeDisplayName })
                  : t("deleteFlow.otpWarning")}
              </p>
            </div>

            {deleteRequestError && (
              <p className="text-xs text-destructive sm:text-sm" role="alert">
                {deleteRequestError}
              </p>
            )}
          </div>

          <DialogFooter className="flex flex-row items-center justify-between gap-2 border-t border-border p-4 sm:justify-between sm:gap-3 sm:p-6">
            {phraseStep ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="sm:h-10 sm:px-4 sm:text-sm"
                  onClick={() => onDeleteConfirmOpenChange(false)}
                  disabled={deleteRequestSubmitting}
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="sm:h-10 sm:px-4 sm:text-sm"
                  onClick={handleSendDeleteOtp}
                  disabled={!deleteConfirmMatches || deleteRequestSubmitting}
                >
                  {deleteRequestSubmitting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin sm:size-4" aria-hidden />
                      {t("deleteFlow.sendingCode")}
                    </>
                  ) : (
                    t("deleteFlow.sendCode")
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="sm:h-10 sm:px-4 sm:text-sm"
                  onClick={onBackToPhraseStep}
                  disabled={deleteRequestSubmitting}
                >
                  {t("deleteFlow.backToConfirm")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="sm:h-10 sm:px-4 sm:text-sm"
                  onClick={handleConfirmDeleteOtp}
                  disabled={!otpValid || deleteRequestSubmitting}
                >
                  {deleteRequestSubmitting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin sm:size-4" aria-hidden />
                      {t("deleteFlow.confirming")}
                    </>
                  ) : (
                    t("deleteFlow.confirmDelete")
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {deletionInProgress && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) logout();
          }}
          onTouchStart={(e) => {
            if (e.target === e.currentTarget) logout();
          }}
        >
          <div className="w-full max-w-lg rounded-xl border border-border bg-background p-5 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-foreground sm:text-lg">
                  {deleteSuccessDisplayed
                    ? t("deleteFlow.overlaySuccessTitle")
                    : t("deleteFlow.overlayDeletingTitle")}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {deleteSuccessDisplayed
                    ? t("deleteFlow.overlaySuccessBody")
                    : t("deleteFlow.overlayWaitBodyImproved")}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => logout()}>
                {t("deleteFlow.logout")}
              </Button>
            </div>

            {!deleteSuccessDisplayed && deleteStatus && (
              <div className="mt-6">
                {deleteStatus.current_step.includes("Scheduled") ? (
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <p className="text-sm text-muted-foreground">
                      {t("deleteFlow.scheduledBody")}
                    </p>
                    {deleteStatus.scheduled_delete_at ? (
                      <p className="mt-2 font-numbers text-base font-semibold text-foreground">
                        {formatScheduledAt(deleteStatus.scheduled_delete_at)}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {t("deleteFlow.scheduledHint")}
                    </p>
                  </div>
                ) : (
                  <ol className="space-y-2">
                    {deletionSteps.map((step, idx) => {
                      const currentIdx = deletionSteps.indexOf(deleteStatus!.current_step);
                      const done = currentIdx !== -1 && idx < currentIdx;
                      const active = currentIdx !== -1 && idx === currentIdx;
                      return (
                        <li
                          key={step}
                          className={cn(
                            "flex items-center gap-2 text-sm",
                            active
                              ? "text-destructive"
                              : done
                                ? "text-muted-foreground"
                                : "text-muted-foreground/70",
                          )}
                        >
                          <span
                            className={cn(
                              "inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs",
                              active
                                ? "border-destructive/40 text-destructive"
                                : done
                                  ? "border-border bg-muted text-muted-foreground"
                                  : "border-border text-muted-foreground/70",
                            )}
                          >
                            {done ? "✓" : idx + 1}
                          </span>
                          <span>{stepDisplay(step)}</span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            )}

            {deleteRequestError && (
              <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm text-destructive">{deleteRequestError}</p>
                <div className="mt-4 flex justify-end">
                  <Button type="button" variant="outline" onClick={onCloseDeletion}>
                    {t("close")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
