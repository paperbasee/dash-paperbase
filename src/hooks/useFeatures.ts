"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

interface FeaturesResponse {
  features: Record<string, boolean>;
  limits: Record<string, number>;
}

interface FeaturesState {
  features: Record<string, boolean> | null;
  limits: Record<string, number> | null;
  loading: boolean;
}

export function useFeatures() {
  const [state, setState] = useState<FeaturesState>({
    features: null,
    limits: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      try {
        const { data } = await api.get<FeaturesResponse>("auth/features/");
        if (cancelled) return;
        setState({
          features: data.features ?? {},
          limits: data.limits ?? {},
          loading: false,
        });
      } catch {
        if (!cancelled) {
          setState({ features: {}, limits: {}, loading: false });
        }
      }
    }

    fetch();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasFeature = useCallback(
    (key: string): boolean => {
      if (!state.features) return false;
      return state.features[key] === true;
    },
    [state.features],
  );

  return {
    ...state,
    hasFeature,
  };
}
