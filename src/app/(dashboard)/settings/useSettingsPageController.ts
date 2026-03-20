 "use client";

import { useState, useEffect } from "react";
import { useBranding } from "@/context/BrandingContext";
import { useEnabledApps } from "@/hooks/useEnabledApps";
import { useAutoExpire } from "@/hooks/useAutoExpire";
import { useAccountSettings } from "./useAccountSettings";
import { useStoreSettings } from "./useStoreSettings";
import { useDeleteStore } from "./useDeleteStore";
import type { DynamicFieldsMessage } from "@/components/DynamicFieldsPanel";

const NOTIFICATION_PREFS_KEY = "gadzillabd_notification_prefs";

type NotificationPrefs = {
  orders: boolean;
  carts: boolean;
  wishlist: boolean;
  contacts: boolean;
  emailMeOnOrderReceived: boolean;
  emailCustomerOnOrderConfirmed: boolean;
};

const defaultPrefs: NotificationPrefs = {
  orders: true,
  carts: true,
  wishlist: true,
  contacts: true,
  emailMeOnOrderReceived: true,
  emailCustomerOnOrderConfirmed: true,
};

export default function useSettingsPageController() {
  const { branding, isLoading, refetch } = useBranding();
  const enabledApps = useEnabledApps();

  // ── Focused sub-hooks ──────────────────────────────────────────────────────
  const account = useAccountSettings({ onSaveSuccess: refetch });
  const store = useStoreSettings({ onSaveSuccess: refetch });
  const deleteStore = useDeleteStore(account.ownerEmail, store.storeName);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(NOTIFICATION_PREFS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
      setNotificationPrefs({ ...defaultPrefs, ...parsed });
    } catch {
      // ignore and keep defaults
    }
  }, []);

  function updateNotificationPref(key: keyof NotificationPrefs, value: boolean) {
    setNotificationPrefs((prev) => {
      const next = { ...prev, [key]: value };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(next));
      }
      return next;
    });
  }

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

    // Delete store
    deleteEmailInput: deleteStore.emailInput,
    setDeleteEmailInput: deleteStore.setEmailInput,
    deleteStoreNameInput: deleteStore.storeNameInput,
    setDeleteStoreNameInput: deleteStore.setStoreNameInput,
    deleteConfirmOpen: deleteStore.confirmOpen,
    setDeleteConfirmOpen: deleteStore.setConfirmOpen,
    deletionInProgress: deleteStore.inProgress,
    deleteJobId: deleteStore.jobId,
    deleteStatus: deleteStore.status,
    deleteRequestError: deleteStore.requestError,
    deleteRequestSubmitting: deleteStore.submitting,
    deleteSuccessDisplayed: deleteStore.successDisplayed,
    deletionSteps: deleteStore.steps,
    deleteInputsMatch: deleteStore.inputsMatch,
    handleDeleteConfirmed: deleteStore.handleDeleteConfirmed,
    resetDeleteFlow: deleteStore.resetFlow,
  };
}
