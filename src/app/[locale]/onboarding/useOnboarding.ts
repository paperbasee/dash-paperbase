"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { verifyTwoFactorChallenge } from "@/lib/auth";
import { OPTIONAL_APP_IDS } from "@/config/apps";
import { parseValidation, storeCreateSchema } from "@/lib/validation";
import { clearPendingVerificationEmail } from "@/lib/verification-state";

const STORAGE_KEY = "core_enabled_apps";

export interface StoreFormData {
  name: string;
  store_type: string;
  owner_first_name: string;
  owner_last_name: string;
  owner_email: string;
  phone: string;
  contact_email: string;
  address: string;
}

type StoreFormErrors = Partial<Record<keyof StoreFormData, string>>;

interface MeResponse {
  active_store_public_id: string | null;
  email?: string;
  first_name?: string;
  last_name?: string;
  stores: { public_id: string; name: string; domain: string | null; role: string }[];
}

export function useOnboarding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAddMode = searchParams.get("add") === "1";
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<StoreFormErrors>({});

  const [formData, setFormData] = useState<StoreFormData>({
    name: "",
    store_type: "",
    owner_first_name: "",
    owner_last_name: "",
    owner_email: "",
    phone: "",
    contact_email: "",
    address: "",
  });

  const [selectedApps, setSelectedApps] = useState<Set<string>>(
    () => new Set(OPTIONAL_APP_IDS)
  );

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    async function checkStore() {
      try {
        const { data } = await api.get<MeResponse>("auth/me/");
        const hasStores = (data.stores?.length ?? 0) > 0;
        if (data.active_store_public_id && hasStores && !isAddMode) {
          router.replace("/");
          return;
        }
        setFormData((prev) => ({
          ...prev,
          owner_email: data.email || prev.owner_email,
          owner_first_name: prev.owner_first_name || data.first_name || "",
          owner_last_name: prev.owner_last_name || data.last_name || "",
        }));
        setChecking(false);
      } catch {
        setChecking(false);
      }
    }
    checkStore();
  }, [isAuthenticated, authLoading, router, isAddMode]);

  function updateField<K extends keyof StoreFormData>(
    key: K,
    value: StoreFormData[K]
  ) {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function toggleApp(appId: string) {
    setSelectedApps((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      return next;
    });
  }

  function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault();
    const validation = parseValidation(storeCreateSchema, formData);
    if (!validation.success) {
      const nextFieldErrors: StoreFormErrors = {};
      for (const key of Object.keys(validation.errors) as Array<keyof StoreFormData>) {
        if (validation.errors[key]) {
          nextFieldErrors[key] = validation.errors[key];
        }
      }
      setFieldErrors(nextFieldErrors);
      setError(
        validation.errors.name ??
          validation.errors.store_type ??
          validation.errors.owner_first_name ??
          validation.errors.owner_last_name ??
          validation.errors.owner_email ??
          "Please correct the highlighted fields."
      );
      return;
    }
    setFieldErrors({});
    setError("");
    setStep(2);
  }

  async function handleStep2Submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const modules_enabled: Record<string, boolean> = {};
      for (const id of OPTIONAL_APP_IDS) {
        modules_enabled[id] = selectedApps.has(id);
      }
      const { data: store } = await api.post("stores/", {
        name: formData.name.trim(),
        store_type: formData.store_type.trim() || undefined,
        owner_first_name: formData.owner_first_name.trim(),
        owner_last_name: formData.owner_last_name.trim(),
        owner_email: formData.owner_email.trim(),
        contact_email: formData.contact_email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        modules_enabled,
      });

      const { data: switchData } = await api.post<{
        access: string;
        refresh: string;
        active_store_public_id?: string;
        ["2fa_required"]?: boolean;
        challenge_public_id?: string;
      }>("auth/switch-store/", { store_public_id: store.public_id });

      if ("2fa_required" in switchData && switchData["2fa_required"] && switchData.challenge_public_id) {
        const otpCode = window.prompt("Enter your 2FA code to activate this store:");
        if (!otpCode) {
          setError("2FA code is required to switch stores.");
          return;
        }
        await verifyTwoFactorChallenge(switchData.challenge_public_id, otpCode);
      } else {
        localStorage.setItem("access_token", switchData.access);
        localStorage.setItem("refresh_token", switchData.refresh);
      }
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          [...selectedApps].filter((id) =>
            OPTIONAL_APP_IDS.includes(id as (typeof OPTIONAL_APP_IDS)[number])
          )
        )
      );

      clearPendingVerificationEmail();
      router.push("/");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response
              ?.data?.detail
          : null;
      setError(msg || "Failed to create store. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return {
    isAddMode,
    isReady: !authLoading && !checking,
    step,
    loading,
    error,
    fieldErrors,
    formData,
    selectedApps,
    updateField,
    toggleApp,
    handleStep1Submit,
    handleStep2Submit,
    goBack: () => setStep(1),
  };
}
