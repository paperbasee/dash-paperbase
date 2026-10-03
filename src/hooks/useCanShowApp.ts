"use client";

import { useCallback } from "react";
import { planIncludesApp } from "@/config/apps";
import { useEnabledApps } from "@/hooks/useEnabledApps";
import { useFeatures } from "@/hooks/useFeatures";
import { usePermissions } from "@/context/PermissionsContext";

/** An app shows only if the store enabled it, its plan includes it, AND the user's role can view it. */
export function useCanShowApp(): (appId: string) => boolean {
  const { isEnabled } = useEnabledApps();
  const { features } = useFeatures();
  const { canViewApp } = usePermissions();
  return useCallback(
    (appId: string) => isEnabled(appId) && planIncludesApp(appId, features) && canViewApp(appId),
    [isEnabled, features, canViewApp]
  );
}
