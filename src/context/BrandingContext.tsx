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

interface BrandingState {
  branding: Branding | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
  /** Resolved currency symbol for prices (from branding or default). */
  currencySymbol: string;
}

const defaultBranding: Branding = {
  public_id: "",
  logo_url: null,
  admin_name: "Core",
  owner_name: "",
  owner_email: "",
  currency_symbol: "৳",
  store_type: "",
  contact_email: "",
  phone: "",
  address: "",
};

const BrandingContext = createContext<BrandingState | undefined>(undefined);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBranding = useCallback(async () => {
    try {
      const { data } = await api.get<Branding>("admin/branding/");
      setBranding(data);
    } catch {
      setBranding(defaultBranding);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  const currencySymbol = branding?.currency_symbol ?? defaultBranding.currency_symbol;

  return (
    <BrandingContext.Provider value={{ branding, isLoading, refetch: fetchBranding, currencySymbol }}>
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
