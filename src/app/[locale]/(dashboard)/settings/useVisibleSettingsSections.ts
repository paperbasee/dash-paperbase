"use client";

import { useMemo } from "react";
import { usePermissions } from "@/context/PermissionsContext";
import { useCanShowApp } from "@/hooks/useCanShowApp";
import {
  SECTIONS,
  isSectionVisible,
  type SettingsSectionNavItem,
} from "./settingsSections";

/** Settings sections this user can open; shared by the page, its mobile nav and the sidebar. */
export function useVisibleSettingsSections(): SettingsSectionNavItem[] {
  const { has, isOwner, isSuperuser } = usePermissions();
  const canShowApp = useCanShowApp();
  return useMemo(
    () =>
      SECTIONS.filter((row) =>
        isSectionVisible(row.id, { has, isOwner, isSuperuser, canShowApp })
      ),
    [has, isOwner, isSuperuser, canShowApp]
  );
}
