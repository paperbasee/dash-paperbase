"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import api from "@/lib/api";
import { resolvePostAuthRoute } from "@/lib/subscription-access";
import {
  DELETE_STORE_CONFIRM_PHRASE,
  isDeleteStoreModalPhraseConfirmed,
  isDeleteStoreModalStoreNameConfirmed,
} from "@/lib/validation";

const DELETE_REQUEST_MIN_MS = 2500;

export type DeleteStatus = {
  status: string;
  current_step: string;
  error_message: string | null;
} | null;

export function useDeleteStore(ownerEmail: string, storeName: string) {
  const router = useRouter();

  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [confirmStoreName, setConfirmStoreName] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<DeleteStatus>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successDisplayed, setSuccessDisplayed] = useState(false);

  const deleteInFlight = useRef(false);

  const phraseMatches = isDeleteStoreModalPhraseConfirmed(confirmPhrase);
  const storeNameMatches = isDeleteStoreModalStoreNameConfirmed(confirmStoreName, storeName);
  const confirmMatches = phraseMatches && storeNameMatches;
  const inProgress = jobId != null;

  const steps = [
    "Removing orders...",
    "Clearing customer data...",
    "Deleting products...",
    "Deleting analytics...",
    "Finalizing...",
  ];

  useEffect(() => {
    if (!confirmOpen) return;
    setConfirmPhrase("");
    setConfirmStoreName("");
    setRequestError(null);
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
        }>(`stores/settings/delete-status/?job_id=${encodeURIComponent(currentJobId)}`);

        if (cancelled) return;
        setStatus(data);

        if (data.status === "success" && !successHandled) {
          successHandled = true;
          setSuccessDisplayed(true);
          if (intervalId != null) window.clearInterval(intervalId);
          window.setTimeout(async () => {
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
          setRequestError(data.error_message || "Store deletion failed.");
        }
      } catch {
        if (cancelled) return;
        setRequestError("Failed to fetch deletion status.");
        if (intervalId != null) window.clearInterval(intervalId);
      }
    }

    intervalId = window.setInterval(fetchStatus, 2000);
    fetchStatus();

    return () => {
      cancelled = true;
      if (intervalId != null) window.clearInterval(intervalId);
    };
  }, [jobId, router]);

  async function handleDeleteConfirmed() {
    const email = ownerEmail.trim();
    const name = storeName.trim();
    if (!email || !name) {
      setRequestError("Store information is still loading. Please wait and try again.");
      return;
    }

    if (!isDeleteStoreModalStoreNameConfirmed(confirmStoreName, name)) {
      setRequestError("Type your store name exactly as shown above to confirm.");
      return;
    }

    if (!isDeleteStoreModalPhraseConfirmed(confirmPhrase)) {
      setRequestError(`Type "${DELETE_STORE_CONFIRM_PHRASE}" exactly to confirm.`);
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
      }>("stores/settings/delete/", {
        account_email: email,
        store_name: name,
      });

      const elapsed = performance.now() - started;
      if (elapsed < DELETE_REQUEST_MIN_MS) {
        await new Promise((r) => window.setTimeout(r, DELETE_REQUEST_MIN_MS - elapsed));
      }

      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);

      setStatus({
        status: "pending",
        current_step: "Removing orders...",
        error_message: null,
      });
      setJobId(String(data.job_id));
      setConfirmOpen(false);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? null
          : null;
      setRequestError(msg || "Failed to start store deletion.");
    } finally {
      deleteInFlight.current = false;
      setSubmitting(false);
    }
  }

  function resetFlow() {
    setJobId(null);
    setStatus(null);
    setRequestError(null);
    setSuccessDisplayed(false);
    setConfirmPhrase("");
    setConfirmStoreName("");
    deleteInFlight.current = false;
  }

  return {
    confirmPhrase,
    setConfirmPhrase,
    confirmStoreName,
    setConfirmStoreName,
    confirmOpen,
    setConfirmOpen,
    jobId,
    status,
    requestError,
    submitting,
    successDisplayed,
    inProgress,
    phraseMatches,
    storeNameMatches,
    confirmMatches,
    steps,
    handleDeleteConfirmed,
    resetFlow,
  };
}
