"use client";

import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { canUserDeleteProducts } from "@/lib/product-delete-permission";

/**
 * Mirrors admin API rules for destructive actions (products, orders, trash):
 * store OWNER/ADMIN or platform superuser.
 */
export function useAdminDeleteCapabilities() {
  const { meProfile, meProfileStatus, meProfileFetching } = useAuth();

  const loading =
    meProfileStatus === "loading" ||
    meProfileStatus === "idle" ||
    meProfileFetching;

  const canDelete = useMemo(
    () => (meProfile ? canUserDeleteProducts(meProfile) : false),
    [meProfile],
  );

  const isSuperuser = Boolean(meProfile?.is_superuser);

  return { canDelete, isSuperuser, loading };
}
