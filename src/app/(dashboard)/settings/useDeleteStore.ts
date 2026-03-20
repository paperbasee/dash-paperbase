"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { validateDeleteStoreConfirmation } from "@/lib/validation";

export type DeleteStatus = {
  status: string;
  current_step: string;
  error_message: string | null;
} | null;

export function useDeleteStore(ownerEmail: string, storeName: string) {
  const router = useRouter();

  const [emailInput, setEmailInput] = useState("");
  const [storeNameInput, setStoreNameInput] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [jobId, setJobId] = useState<string | null>(null);
  const [redirectRoute, setRedirectRoute] = useState<string | null>(null);
  const [status, setStatus] = useState<DeleteStatus>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successDisplayed, setSuccessDisplayed] = useState(false);

  const inputsMatch =
    validateDeleteStoreConfirmation({
      emailInput,
      storeNameInput,
      ownerEmail,
      storeName,
    }).success;
  const inProgress = jobId != null;

  const steps = [
    "Removing orders...",
    "Clearing customer data...",
    "Deleting products...",
    "Deleting analytics...",
    "Finalizing...",
  ];

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
          const route = redirectRoute || "/onboarding";
          window.setTimeout(() => router.push(route), 1200);
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
  }, [jobId, redirectRoute, router]);

  async function handleDeleteConfirmed() {
    const confirmation = validateDeleteStoreConfirmation({
      emailInput,
      storeNameInput,
      ownerEmail,
      storeName,
    });
    if (!confirmation.success || submitting || jobId) {
      if (!confirmation.success) {
        setRequestError(confirmation.error);
      }
      return;
    }

    setRequestError(null);
    setSubmitting(true);
    setSuccessDisplayed(false);

    try {
      const { data } = await api.post<{
        job_id: string | number;
        access: string;
        refresh: string;
        redirect_route: string;
      }>("stores/settings/delete/", {
        account_email: emailInput,
        store_name: storeNameInput,
      });

      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);

      setRedirectRoute(data.redirect_route);
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
          ? (err as { response?: { data?: { detail?: string } } }).response
              ?.data?.detail ?? null
          : null;
      setRequestError(msg || "Failed to start store deletion.");
      setConfirmOpen(false);
      setJobId(null);
    } finally {
      setSubmitting(false);
    }
  }

  function resetFlow() {
    setJobId(null);
    setStatus(null);
    setRequestError(null);
    setSuccessDisplayed(false);
  }

  return {
    emailInput,
    setEmailInput,
    storeNameInput,
    setStoreNameInput,
    confirmOpen,
    setConfirmOpen,
    jobId,
    status,
    requestError,
    submitting,
    successDisplayed,
    inProgress,
    inputsMatch,
    steps,
    handleDeleteConfirmed,
    resetFlow,
  };
}
