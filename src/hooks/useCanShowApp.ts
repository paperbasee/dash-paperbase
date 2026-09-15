"use client";

import { useCallback } from "react";
import { useEnabledApps } from "@/hooks/useEnabledApps";
import { usePermissions } from "@/context/PermissionsContext";

/** An app shows only if the store enabled it AND the user's role can view it. */
export function useCanShowApp(): (appId: string) => boolean {
  const { isEnabled } = useEnabledApps();
  const { canViewApp } = usePermissions();
  return useCallback(
    (appId: string) => isEnabled(appId) && canViewApp(appId),
    [isEnabled, canViewApp]
  );
}
