"use client";

import {
  fetchStoreSettingsCurrent,
  useStoreSettingsCurrentQuery,
  type StoreSettingsCurrent,
} from "@/hooks/useStoreSettingsCurrentQuery";

export type EmailNotificationPrefsSettings = Pick<
  StoreSettingsCurrent,
  | "email_notify_owner_on_order_received"
  | "email_customer_on_order_confirmed"
  | "storefront_url"
  | "revalidate_secret"
>;

export async function fetchEmailNotificationPrefs(): Promise<EmailNotificationPrefsSettings> {
  return fetchStoreSettingsCurrent();
}

export function useEmailNotificationPrefsQuery(options?: { enabled?: boolean }) {
  return useStoreSettingsCurrentQuery(options);
}
