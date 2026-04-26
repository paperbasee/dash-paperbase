"use client";

import useSWR from "swr";
import api from "@/lib/api";
import type { Branding } from "@/types";

export const STORE_PROFILE_SWR_PREFIX = "store-profile:";
export const BRANDING_PROFILE_SWR_KEY = `${STORE_PROFILE_SWR_PREFIX}admin/branding/`;
const BRANDING_PROFILE_ENDPOINT = "admin/branding/";

async function fetchBrandingProfile(): Promise<Branding> {
  const { data } = await api.get<Branding>(BRANDING_PROFILE_ENDPOINT);
  return data;
}

export function useBrandingProfileSWR() {
  return useSWR<Branding>(BRANDING_PROFILE_SWR_KEY, fetchBrandingProfile, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 60_000,
  });
}
