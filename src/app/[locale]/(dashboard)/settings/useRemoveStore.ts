"use client";

import { useState, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import api from "@/lib/api";
import {
  invalidateMeRoutingCache,
  resolvePostAuthRoute,
} from "@/lib/subscription-access";

export function useRemoveStore() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  async function removeStore(storeName: string, confirmationPhrase: string): Promise<boolean> {
    if (inFlight.current || submitting) return false;
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await api.post<{
        access: string;
        refresh: string;
        redirect_route: string;
      }>("store/remove/", {
        store_name: storeName,
        confirmation_phrase: confirmationPhrase,
      });
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      invalidateMeRoutingCache();
      const result = await resolvePostAuthRoute();
      router.push(result.ok ? result.path : "/");
      return true;
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? null
          : null;
      setError(msg || "Could not remove store.");
      return false;
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  function clearError() {
    setError(null);
  }

  return { removeStore, submitting, error, setError, clearError };
}
