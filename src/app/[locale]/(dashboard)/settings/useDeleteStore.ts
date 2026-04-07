"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import api from "@/lib/api";
import {
  invalidateMeRoutingCache,
  resolvePostAuthRoute,
} from "@/lib/subscription-access";
import {
  DELETE_STORE_CONFIRM_PHRASE,
  isDeleteStoreModalPhraseConfirmed,
  isDeleteStoreModalStoreNameConfirmed,
} from "@/lib/validation";
import { DELETION_STEPS_API } from "./deletionStepLabels";

const DELETE_REQUEST_MIN_MS = 2500;

export type DeleteModalStep = "phrase" | "otp";

export type DeleteStatus = {
  status: string;
  current_step: string;
  error_message: string | null;
  scheduled_delete_at?: string | null;
} | null;

export function useDeleteStore(ownerEmail: string, storeName: string) {
  const router = useRouter();
  const t = useTranslations("settings");

  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [confirmStoreName, setConfirmStoreName] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [modalStep, setModalStep] = useState<DeleteModalStep>("phrase");
  const [challengePublicId, setChallengePublicId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");

  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<DeleteStatus>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successDisplayed, setSuccessDisplayed] = useState(false);

  const deleteInFlight = useRef(false);

  const phraseMatches = isDeleteStoreModalPhraseConfirmed(confirmPhrase);
  const storeNameMatches = isDeleteStoreModalStoreNameConfirmed(confirmStoreName, storeName);
  const confirmMatches = phraseMatches && storeNameMatches;
  const otpValid = otpCode.trim().length === 6 && /^\d{6}$/.test(otpCode.trim());
  const inProgress = jobId != null;

  const steps = [...DELETION_STEPS_API];

  useEffect(() => {
    if (!confirmOpen) return;
    setConfirmPhrase("");
    setConfirmStoreName("");
    setRequestError(null);
    setModalStep("phrase");
    setChallengePublicId(null);
    setOtpCode("");
  }, [confirmOpen]);

  useEffect(() => {
    if (!jobId) return;

    const currentJobId = jobId;
    let cancelled = false;
    let successHandled = false;
    let intervalId: number | null = null;

    async function fetchStatus() {
      try {
        const { data } = await api.get<{
          status: string;
          current_step: string;
          error_message: string | null;
          scheduled_delete_at?: string | null;
        }>(`store/settings/delete-status/?job_id=${encodeURIComponent(currentJobId)}`);

        if (cancelled) return;
        setStatus({
          ...data,
          scheduled_delete_at: data.scheduled_delete_at ?? null,
        });

        if (data.status === "success" && !successHandled) {
          successHandled = true;
          setSuccessDisplayed(true);
          if (intervalId != null) window.clearInterval(intervalId);
          window.setTimeout(async () => {
            invalidateMeRoutingCache();
            const result = await resolvePostAuthRoute();
            if (result.ok) {
              router.push(result.path);
            } else {
              router.push("/");
            }
          }, 1200);
        }

        if (data.status === "failed") {
          if (intervalId != null) window.clearInterval(intervalId);
          setRequestError(data.error_message || t("deleteFlow.errDeletionFailed"));
        }
      } catch {
        if (cancelled) return;
        setRequestError(t("deleteFlow.errStatusFetch"));
        if (intervalId != null) window.clearInterval(intervalId);
      }
    }

    intervalId = window.setInterval(fetchStatus, 2000);
    fetchStatus();

    return () => {
      cancelled = true;
      if (intervalId != null) window.clearInterval(intervalId);
    };
  }, [jobId, router, t]);

  function extractDetail(err: unknown): string | null {
    if (!err || typeof err !== "object" || !("response" in err)) return null;
    const d = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
    return d ?? null;
  }

  async function handleSendDeleteOtp() {
    const email = ownerEmail.trim();
    const name = storeName.trim();
    if (!email || !name) {
      setRequestError(t("deleteFlow.errStoreLoading"));
      return;
    }

    if (!isDeleteStoreModalStoreNameConfirmed(confirmStoreName, name)) {
      setRequestError(t("deleteFlow.errTypeStoreName"));
      return;
    }

    if (!isDeleteStoreModalPhraseConfirmed(confirmPhrase)) {
      setRequestError(t("deleteFlow.errTypePhrase", { phrase: DELETE_STORE_CONFIRM_PHRASE }));
      return;
    }

    if (deleteInFlight.current || submitting || jobId) {
      return;
    }

    deleteInFlight.current = true;
    setRequestError(null);
    setSubmitting(true);

    const started = performance.now();

    try {
      const { data } = await api.post<{
        challenge_public_id: string;
        expires_at: string;
      }>("store/settings/delete/send-otp/", {
        account_email: email,
        store_name: name,
        confirmation_phrase: confirmPhrase.trim(),
      });

      const elapsed = performance.now() - started;
      if (elapsed < DELETE_REQUEST_MIN_MS) {
        await new Promise((r) => window.setTimeout(r, DELETE_REQUEST_MIN_MS - elapsed));
      }

      setChallengePublicId(data.challenge_public_id);
      setModalStep("otp");
      setOtpCode("");
    } catch (err: unknown) {
      setRequestError(extractDetail(err) || t("deleteFlow.errSendOtp"));
    } finally {
      deleteInFlight.current = false;
      setSubmitting(false);
    }
  }

  async function handleConfirmDeleteOtp() {
    if (!challengePublicId || !otpValid) {
      setRequestError(t("deleteFlow.errOtpInvalid"));
      return;
    }

    if (deleteInFlight.current || submitting || jobId) {
      return;
    }

    deleteInFlight.current = true;
    setRequestError(null);
    setSubmitting(true);
    setSuccessDisplayed(false);

    const started = performance.now();

    try {
      const { data } = await api.post<{
        job_id: string | number;
        access: string;
        refresh: string;
        redirect_route: string;
        scheduled_delete_at?: string | null;
      }>("store/settings/delete/confirm/", {
        challenge_public_id: challengePublicId,
        otp: otpCode.trim(),
      });

      const elapsed = performance.now() - started;
      if (elapsed < DELETE_REQUEST_MIN_MS) {
        await new Promise((r) => window.setTimeout(r, DELETE_REQUEST_MIN_MS - elapsed));
      }

      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);

      setStatus({
        status: "pending",
        current_step: "Scheduled — permanent deletion pending",
        error_message: null,
        scheduled_delete_at: data.scheduled_delete_at ?? null,
      });
      setJobId(String(data.job_id));
      setConfirmOpen(false);
    } catch (err: unknown) {
      setRequestError(extractDetail(err) || t("deleteFlow.errConfirmOtp"));
    } finally {
      deleteInFlight.current = false;
      setSubmitting(false);
    }
  }

  function backToPhraseStep() {
    setModalStep("phrase");
    setChallengePublicId(null);
    setOtpCode("");
    setRequestError(null);
  }

  function resetFlow() {
    setJobId(null);
    setStatus(null);
    setRequestError(null);
    setSuccessDisplayed(false);
    setConfirmPhrase("");
    setConfirmStoreName("");
    setModalStep("phrase");
    setChallengePublicId(null);
    setOtpCode("");
    deleteInFlight.current = false;
  }

  return {
    confirmPhrase,
    setConfirmPhrase,
    confirmStoreName,
    setConfirmStoreName,
    confirmOpen,
    setConfirmOpen,
    modalStep,
    otpCode,
    setOtpCode,
    challengePublicId,
    jobId,
    status,
    requestError,
    submitting,
    successDisplayed,
    inProgress,
    phraseMatches,
    storeNameMatches,
    confirmMatches,
    otpValid,
    steps,
    handleSendDeleteOtp,
    handleConfirmDeleteOtp,
    backToPhraseStep,
    resetFlow,
  };
}
