"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useBrandingQuery } from "@/hooks/useBrandingQuery";
import { useEnabledApps } from "@/hooks/useEnabledApps";
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
  const { isEnabled } = useEnabledApps();
  const navCounts = useNavCounts();
  const features = useFeatures();
  const inventoryStatus = useInventoryStatus(isEnabled("inventory"));
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
