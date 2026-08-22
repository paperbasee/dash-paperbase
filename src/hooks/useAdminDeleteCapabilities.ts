"use client";

import { usePermissions } from "@/context/PermissionsContext";

/**
 * Destructive-action capabilities, driven by RBAC permissions (not the legacy
 * role enum). Owners and superusers hold everything via usePermissions().has.
 */
export function useAdminDeleteCapabilities() {
  const { has, isSuperuser, loading } = usePermissions();

  return {
    canDeleteProducts: has("products.delete"),
    canViewTrash: has("trash.view"),
    canManageTrash: has("trash.manage"),
    isSuperuser,
    loading,
  };
}
