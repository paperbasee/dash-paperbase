"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { emailNotificationPrefsQueryKey } from "@/lib/query-keys";

export type EmailNotificationPrefsSettings = {
  email_notify_owner_on_order_received: boolean;
  email_customer_on_order_confirmed: boolean;
  storefront_url?: string | null;
  revalidate_secret?: string | null;
};

export async function fetchEmailNotificationPrefs(): Promise<EmailNotificationPrefsSettings> {
  const { data } = await api.get<EmailNotificationPrefsSettings>("store/settings/current/");
  return data;
}

export function useEmailNotificationPrefsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: emailNotificationPrefsQueryKey,
    queryFn: fetchEmailNotificationPrefs,
    enabled: options?.enabled ?? true,
  });
}
