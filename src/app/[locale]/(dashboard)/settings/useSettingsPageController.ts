"use client";

import { useState, useEffect, useCallback } from "react";
import { useEnabledApps } from "@/hooks/useEnabledApps";
import { useFeatures } from "@/hooks/useFeatures";
import { useAutoExpire } from "@/hooks/useAutoExpire";
import { useBrandingProfileSWR } from "@/hooks/useBrandingProfileSWR";
import api from "@/lib/api";
import { useAccountSettings } from "./useAccountSettings";
import { useStoreSettings } from "./useStoreSettings";
import type { DynamicFieldsMessage } from "@/components/DynamicFieldsPanel";

const NOTIFICATION_PREFS_KEY = "paperbase_notification_prefs";
const LEGACY_NOTIFICATION_PREFS_KEY = "akkho_notification_prefs";

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
  const { data: branding, isLoading: isBrandingLoading, isValidating: isBrandingValidating } =
    useBrandingProfileSWR();
  const enabledApps = useEnabledApps();
  const { hasFeature, loading: orderEmailFeatureLoading } = useFeatures();
  const orderEmailNotificationsEnabled = hasFeature("order_email_notifications");

  const account = useAccountSettings();
  const store = useStoreSettings();

  useEffect(() => {
    if (!branding) return;
    account.setOwnerName(branding.owner_name ?? "");
    account.setOwnerEmail(branding.owner_email ?? "");
    store.syncFromBranding(branding);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branding]);

  const [dynamicFieldsMessage, setDynamicFieldsMessage] =
    useState<DynamicFieldsMessage>(null);
  useAutoExpire(dynamicFieldsMessage, setDynamicFieldsMessage);

  const [notificationPrefs, setNotificationPrefs] =
    useState<NotificationPrefs>(defaultPrefs);
  const [emailPrefsSaving, setEmailPrefsSaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (
        window.localStorage.getItem(NOTIFICATION_PREFS_KEY) == null &&
        window.localStorage.getItem(LEGACY_NOTIFICATION_PREFS_KEY) != null
      ) {
        window.localStorage.setItem(
          NOTIFICATION_PREFS_KEY,
          window.localStorage.getItem(LEGACY_NOTIFICATION_PREFS_KEY) ?? "",
        );
        window.localStorage.removeItem(LEGACY_NOTIFICATION_PREFS_KEY);
      }
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
    if (isBrandingLoading || isBrandingValidating || !branding) return;
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
  }, [isBrandingLoading, isBrandingValidating, branding]);

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

  const isLoading = isBrandingLoading && !branding;

  return {
    isLoading,
    enabledApps,

    ownerName: account.ownerName,
    setOwnerName: account.setOwnerName,
    ownerEmail: account.ownerEmail,
    accountSaving: account.saving,
    accountMessage: account.message,
    handleAccountSubmit: account.handleSubmit,

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

    dynamicFieldsMessage,
    setDynamicFieldsMessage,

    notificationPrefs,
    updateNotificationPref,
    orderEmailNotificationsEnabled,
    orderEmailFeatureLoading,
    emailPrefsSaving,
  };
}
