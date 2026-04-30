"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import api from "@/lib/api";
import type { Branding } from "@/types";
import { emptySocialLinks } from "@/lib/storeSocialLinks";

interface BrandingState {
  branding: Branding | null;
  /** Client mount complete (separate from network). */
  isHydrated: boolean;
  /** Branding request in flight. */
  isFetching: boolean;
  /** Alias of `isFetching` for existing callers. */
  isLoading: boolean;
  refetch: () => Promise<void>;
  /** Resolved currency symbol for prices (from branding or default). */
  currencySymbol: string;
}

const defaultBranding: Branding = {
  public_id: "",
  logo_url: null,
  admin_name: "Paperbase",
  owner_name: "",
  owner_email: "",
  currency_symbol: "৳",
  store_type: "",
  contact_email: "",
  phone: "",
  address: "",
  language: "en",
  social_links: emptySocialLinks(),
};

const BrandingContext = createContext<BrandingState | undefined>(undefined);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const fetchBranding = useCallback(async () => {
    setIsFetching(true);
    try {
      const { data } = await api.get<Branding>("admin/branding/");
      setBranding(data);
    } catch {
      setBranding(defaultBranding);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    fetchBranding();
  }, [isHydrated, fetchBranding]);

  const currencySymbol = branding?.currency_symbol ?? defaultBranding.currency_symbol;

  return (
    <BrandingContext.Provider
      value={{
        branding,
        isHydrated,
        isFetching,
        isLoading: isFetching,
        refetch: fetchBranding,
        currencySymbol,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("useBranding must be used within BrandingProvider");
  return ctx;
}

export { defaultBranding };
