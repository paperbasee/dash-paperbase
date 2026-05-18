"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { featuresQueryKey } from "@/lib/query-keys";

interface FeaturesResponse {
  features: Record<string, boolean>;
  limits: Record<string, number>;
}

const FEATURES_STALE_MS = 5 * 60 * 1000;

export async function fetchFeatures(): Promise<FeaturesResponse> {
  const { data } = await api.get<FeaturesResponse>("auth/features/");
  return {
    features: data.features ?? {},
    limits: data.limits ?? {},
  };
}

export function useFeatures() {
  const query = useQuery({
    queryKey: featuresQueryKey,
    queryFn: fetchFeatures,
    staleTime: FEATURES_STALE_MS,
  });

  const features = query.data?.features ?? null;
  const limits = query.data?.limits ?? null;

  const hasFeature = useCallback(
    (key: string): boolean => {
      if (!features) return false;
      return features[key] === true;
    },
    [features]
  );

  return {
    features,
    limits,
    loading: query.isLoading,
    hasFeature,
  };
}
