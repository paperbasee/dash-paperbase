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
    // Bringing something back and deleting it for good are separate (owner, 2026-10-02):
    // Managers restore, only Admins delete forever.
    canRestoreTrash: has("trash.restore"),
    canPurgeTrash: has("trash.purge"),
    isSuperuser,
    loading,
  };
}
