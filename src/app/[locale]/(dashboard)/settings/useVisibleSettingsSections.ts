"use client";

import { useMemo } from "react";
import { usePermissions } from "@/context/PermissionsContext";
import { useCanShowApp } from "@/hooks/useCanShowApp";
import { useSupportMode } from "@/hooks/useSupportMode";
import {
  SECTIONS,
  isSectionVisible,
  type SettingsSectionNavItem,
} from "./settingsSections";

/** Settings sections this user can open; shared by the page, its mobile nav and the sidebar. */
export function useVisibleSettingsSections(): SettingsSectionNavItem[] {
  const { has, isOwner, isSuperuser } = usePermissions();
  const canShowApp = useCanShowApp();
  const inSupportMode = useSupportMode();
  return useMemo(
    () =>
      SECTIONS.filter((row) =>
        isSectionVisible(row.id, { has, isOwner, isSuperuser, canShowApp, inSupportMode })
      ),
    [has, isOwner, isSuperuser, canShowApp, inSupportMode]
  );
}
