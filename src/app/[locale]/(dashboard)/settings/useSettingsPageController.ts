"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useBranding } from "@/context/BrandingContext";
import { useEnabledApps } from "@/hooks/useEnabledApps";
import { useFeatures } from "@/hooks/useFeatures";
import { useAutoExpire } from "@/hooks/useAutoExpire";
import api from "@/lib/api";
import { useAccountSettings } from "./useAccountSettings";
import { useStoreSettings } from "./useStoreSettings";
import { useDeleteStore } from "./useDeleteStore";
import { useRemoveStore } from "./useRemoveStore";
import type { DynamicFieldsMessage } from "@/components/DynamicFieldsPanel";

const NOTIFICATION_PREFS_KEY = "akkho_notification_prefs";

type NotificationPrefs = {
  orders: boolean;
  supportTickets: boolean;
  emailMeOnOrderReceived: boolean;
  emailCustomerOnOrderConfirmed: boolean;
};

const defaultPrefs: NotificationPrefs = {
  orders: true,
  supportTickets: true,
  emailMeOnOrderReceived: false,
  emailCustomerOnOrderConfirmed: false,
};

export default function useSettingsPageController() {
  const t = useTranslations("settings");
  const { branding, isHydrated, isFetching, refetch } = useBranding();
  const enabledApps = useEnabledApps();
  const { hasFeature, loading: orderEmailFeatureLoading } = useFeatures();
  const orderEmailNotificationsEnabled = hasFeature("order_email_notifications");

  // ── Focused sub-hooks ──────────────────────────────────────────────────────
  const account = useAccountSettings({ onSaveSuccess: refetch });
  const store = useStoreSettings({ onSaveSuccess: refetch });

  const deletePayloadEmail =
    branding?.owner_email?.trim() || account.ownerEmail.trim();
  const deletePayloadStoreName =
    branding?.admin_name?.trim() || store.storeName.trim();
  const deleteStoreDisplayName = deletePayloadStoreName || t("deleteFlow.fallbackStoreName");
  const deleteStoreReady = Boolean(deletePayloadEmail && deletePayloadStoreName);

  const deleteStore = useDeleteStore(deletePayloadEmail, deletePayloadStoreName);
  const removeStoreHook = useRemoveStore();

  // ── Sync branding into local state once loaded ─────────────────────────────
  useEffect(() => {
    if (!branding) return;
    account.setOwnerName(branding.owner_name ?? "");
    account.setOwnerEmail(branding.owner_email ?? "");
    store.syncFromBranding(branding);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branding]);

  // ── Dynamic fields ─────────────────────────────────────────────────────────
  const [dynamicFieldsMessage, setDynamicFieldsMessage] =
    useState<DynamicFieldsMessage>(null);
  useAutoExpire(dynamicFieldsMessage, setDynamicFieldsMessage);

  // ── Notification preferences ───────────────────────────────────────────────
  const [notificationPrefs, setNotificationPrefs] =
    useState<NotificationPrefs>(defaultPrefs);
  const [emailPrefsSaving, setEmailPrefsSaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(NOTIFICATION_PREFS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
      setNotificationPrefs((prev) => ({
        ...prev,
        orders: parsed.orders ?? prev.orders,
        supportTickets: parsed.supportTickets ?? prev.supportTickets,
      }));
    } catch {
      // ignore and keep defaults
    }
  }, []);

  useEffect(() => {
    if (!isHydrated || isFetching || !branding) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<{
          email_notify_owner_on_order_received: boolean;
          email_customer_on_order_confirmed: boolean;
        }>("store/settings/current/");
        if (cancelled) return;
        setNotificationPrefs((prev) => ({
          ...prev,
          emailMeOnOrderReceived: data.email_notify_owner_on_order_received,
          emailCustomerOnOrderConfirmed: data.email_customer_on_order_confirmed,
        }));
      } catch {
        // keep email defaults from state
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isHydrated, isFetching, branding]);

  const updateEmailNotificationPref = useCallback(
    async (key: "emailMeOnOrderReceived" | "emailCustomerOnOrderConfirmed", value: boolean) => {
      if (!orderEmailNotificationsEnabled) return;
      const patchKey =
        key === "emailMeOnOrderReceived"
          ? "email_notify_owner_on_order_received"
          : "email_customer_on_order_confirmed";
      setEmailPrefsSaving(true);
      try {
        await api.patch("store/settings/current/", { [patchKey]: value });
        setNotificationPrefs((prev) => ({ ...prev, [key]: value }));
      } catch {
        // keep previous values
      } finally {
        setEmailPrefsSaving(false);
      }
    },
    [orderEmailNotificationsEnabled],
  );

  function updateNotificationPref(key: keyof NotificationPrefs, value: boolean) {
    if (key === "emailMeOnOrderReceived" || key === "emailCustomerOnOrderConfirmed") {
      void updateEmailNotificationPref(key, value);
      return;
    }
    setNotificationPrefs((prev) => {
      const next = { ...prev, [key]: value };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          NOTIFICATION_PREFS_KEY,
          JSON.stringify({
            orders: next.orders,
            supportTickets: next.supportTickets,
          }),
        );
      }
      return next;
    });
  }

  const isLoading = !isHydrated || branding === null;

  // ── Compose & return ───────────────────────────────────────────────────────
  return {
    isLoading,
    enabledApps,

    // Account
    ownerName: account.ownerName,
    setOwnerName: account.setOwnerName,
    ownerEmail: account.ownerEmail,
    accountSaving: account.saving,
    accountMessage: account.message,
    handleAccountSubmit: account.handleSubmit,

    // Store
    storeName: store.storeName,
    setStoreName: store.setStoreName,
    storeType: store.storeType,
    setStoreType: store.setStoreType,
    contactEmail: store.contactEmail,
    setContactEmail: store.setContactEmail,
    phone: store.phone,
    setPhone: store.setPhone,
    address: store.address,
    setAddress: store.setAddress,
    socialLinks: store.socialLinks,
    setSocialLink: store.setSocialLink,
    previewUrl: store.previewUrl,
    currentLogoUrl: store.currentLogoUrl,
    clearLogo: store.clearLogo,
    setClearLogo: store.setClearLogo,
    logoFile: store.logoFile,
    setLogoFile: store.setLogoFile,
    fileInputRef: store.fileInputRef,
    storeSaving: store.saving,
    storeMessage: store.message,
    handleStoreSubmit: store.handleSubmit,

    // Dynamic fields
    dynamicFieldsMessage,
    setDynamicFieldsMessage,

    // Notifications
    notificationPrefs,
    updateNotificationPref,
    orderEmailNotificationsEnabled,
    orderEmailFeatureLoading,
    emailPrefsSaving,

    // Delete store
    deleteConfirmPhrase: deleteStore.confirmPhrase,
    setDeleteConfirmPhrase: deleteStore.setConfirmPhrase,
    deleteConfirmStoreName: deleteStore.confirmStoreName,
    setDeleteConfirmStoreName: deleteStore.setConfirmStoreName,
    deleteConfirmOpen: deleteStore.confirmOpen,
    setDeleteConfirmOpen: deleteStore.setConfirmOpen,
    deleteModalStep: deleteStore.modalStep,
    deleteOtpCode: deleteStore.otpCode,
    setDeleteOtpCode: deleteStore.setOtpCode,
    deletionInProgress: deleteStore.inProgress,
    deleteJobId: deleteStore.jobId,
    deleteStatus: deleteStore.status,
    deleteRequestError: deleteStore.requestError,
    deleteRequestSubmitting: deleteStore.submitting,
    deleteSuccessDisplayed: deleteStore.successDisplayed,
    deletionSteps: deleteStore.steps,
    deleteConfirmMatches: deleteStore.confirmMatches,
    deleteOtpValid: deleteStore.otpValid,
    /** Exact store name from branding (matches API `store_name` and modal typing field). */
    deleteExpectedStoreName: deletePayloadStoreName,
    deleteStoreDisplayName,
    deleteStoreReady,
    handleSendDeleteOtp: deleteStore.handleSendDeleteOtp,
    handleConfirmDeleteOtp: deleteStore.handleConfirmDeleteOtp,
    backToDeletePhraseStep: deleteStore.backToPhraseStep,
    resetDeleteFlow: deleteStore.resetFlow,

    removeStoreSubmitting: removeStoreHook.submitting,
    removeStoreError: removeStoreHook.error,
    clearRemoveStoreError: removeStoreHook.clearError,
    removeStore: removeStoreHook.removeStore,
  };
}
