"use client";

import { useAuth } from "@/context/AuthContext";

/** Whether Paperbase support is in this dashboard ("Sign in as this shop"), rather than the owner. */
export function useSupportMode(): boolean {
  const { meProfile } = useAuth();
  return Boolean(meProfile?.support_session);
}
