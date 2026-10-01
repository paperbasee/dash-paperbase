"use client";

import { useCallback } from "react";

import { holdsOwnerPower, type OwnerPower } from "@/config/owner-powers";
import { usePermissions } from "@/context/PermissionsContext";
import { useSupportMode } from "@/hooks/useSupportMode";

/** Whether the person signed in holds one of the owner's powers (config/owner-powers.ts). */
export function useOwnerPower(): (power: OwnerPower) => boolean {
  const { isOwner, isSuperuser, isUnknown } = usePermissions();
  const inSupportMode = useSupportMode();
  return useCallback(
    (power: OwnerPower) => holdsOwnerPower(power, { isOwner, isSuperuser, inSupportMode, isUnknown }),
    [isOwner, isSuperuser, inSupportMode, isUnknown]
  );
}

/**
 * Whether they may also CHANGE it: Paperbase support, signed in as the owner, reads the owner's
 * powers and changes none (the API refuses it too).
 */
export function useMayChangeOwnerPower(): (power: OwnerPower) => boolean {
  const holds = useOwnerPower();
  const inSupportMode = useSupportMode();
  return useCallback((power: OwnerPower) => holds(power) && !inSupportMode, [holds, inSupportMode]);
}
