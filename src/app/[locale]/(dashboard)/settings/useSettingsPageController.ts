"use client";

import { useState, useEffect, useCallback } from "react";
import { useEnabledApps } from "@/hooks/useEnabledApps";
import { useFeatures } from "@/hooks/useFeatures";
import { useAutoExpire } from "@/hooks/useAutoExpire";
import { useBrandingQuery } from "@/hooks/useBrandingQuery";
import api from "@/lib/api";
import { useAccountSettings } from "./useAccountSettings";
import { useStoreSettings } from "./useStoreSettings";
import type { DynamicFieldsMessage } from "@/components/DynamicFieldsPanel";

export type EmailNotificationPrefs = {
  emailMeOnOrderReceived: boolean;
  emailCustomerOnOrderConfirmed: boolean;
};

const defaultPrefs: EmailNotificationPrefs = {
  emailMeOnOrderReceived: false,
  emailCustomerOnOrderConfirmed: false,
};

export default function useSettingsPageController() {
  const {
    data: branding,
    isLoading: isBrandingLoading,
    isFetching: isBrandingValidating,
  } = useBrandingQuery();
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
    useState<EmailNotificationPrefs>(defaultPrefs);
  const [emailPrefsSaving, setEmailPrefsSaving] = useState(false);

  useEffect(() => {
    if (isBrandingLoading || isBrandingValidating || !branding) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<{
          email_notify_owner_on_order_received: boolean;
          email_customer_on_order_confirmed: boolean;
          storefront_url?: string | null;
          revalidate_secret?: string | null;
        }>("store/settings/current/");
        if (cancelled) return;
        setNotificationPrefs((prev) => ({
          ...prev,
          emailMeOnOrderReceived: data.email_notify_owner_on_order_received,
          emailCustomerOnOrderConfirmed: data.email_customer_on_order_confirmed,
        }));
        store.syncStoreIntegrationFromSettings(data);
      } catch {
        // keep email defaults from state
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isBrandingLoading, isBrandingValidating, branding]);

  const updateEmailNotificationPref = useCallback(
    async (key: keyof EmailNotificationPrefs, value: boolean) => {
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

  function updateNotificationPref(key: keyof EmailNotificationPrefs, value: boolean) {
    void updateEmailNotificationPref(key, value);
  }

  const isLoading = isBrandingLoading && !branding;

  return {
    isLoading,
    branding,
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
    language: store.language,
    setLanguage: store.setLanguage,
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
    languageSaving: store.languageSaving,
    languageMessage: store.languageMessage,
    persistLanguage: store.persistLanguage,

    storefrontUrl: store.storefrontUrl,
    setStorefrontUrl: store.setStorefrontUrl,
    revalidateSecret: store.revalidateSecret,
    setRevalidateSecret: store.setRevalidateSecret,

    dynamicFieldsMessage,
    setDynamicFieldsMessage,

    notificationPrefs,
    updateNotificationPref,
    orderEmailNotificationsEnabled,
    orderEmailFeatureLoading,
    emailPrefsSaving,
  };
}
