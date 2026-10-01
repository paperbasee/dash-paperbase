"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useBrandingQuery } from "@/hooks/useBrandingQuery";
import { useCanShowApp } from "@/hooks/useCanShowApp";
import { usePermissions } from "@/context/PermissionsContext";
import { useFeatures } from "@/hooks/useFeatures";
import { useInventoryStatus } from "@/hooks/useInventoryStatus";
import { useNavCounts } from "@/hooks/useNavCounts";

type SidebarDataContextValue = {
  navCounts: ReturnType<typeof useNavCounts>;
  features: ReturnType<typeof useFeatures>;
  inventoryStatus: ReturnType<typeof useInventoryStatus>;
  branding: ReturnType<typeof useBrandingQuery>;
};

const SidebarDataContext = createContext<SidebarDataContextValue | null>(null);

export function SidebarDataProvider({ children }: { children: ReactNode }) {
  const canShowApp = useCanShowApp();
  const { isUnknown } = usePermissions();
  const navCounts = useNavCounts();
  const features = useFeatures();
  // Only for whoever is shown the Inventory page, once that is known: the API refuses the rest.
  const inventoryStatus = useInventoryStatus(!isUnknown && canShowApp("inventory"));
  const branding = useBrandingQuery();

  const value = useMemo(
    () => ({
      navCounts,
      features,
      inventoryStatus,
      branding,
    }),
    [navCounts, features, inventoryStatus, branding]
  );

  return (
    <SidebarDataContext.Provider value={value}>{children}</SidebarDataContext.Provider>
  );
}

export function useSidebarData(): SidebarDataContextValue {
  const ctx = useContext(SidebarDataContext);
  if (!ctx) {
    throw new Error("useSidebarData must be used within SidebarDataProvider");
  }
  return ctx;
}
