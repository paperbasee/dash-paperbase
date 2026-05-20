"use client";

import { useEffect, useMemo } from "react";
import { useOrderDetailQuery } from "@/hooks/useOrderDetailQuery";
import { notify, normalizeError } from "@/notifications";
import type { Order } from "@/types";

export type UseOrderPreviewResult = {
  order: Order | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

export function useOrderPreview(
  orderPublicId: string | null,
  open: boolean,
): UseOrderPreviewResult {
  const {
    data,
    isLoading,
    isError,
    error: queryError,
    refetch,
  } = useOrderDetailQuery(orderPublicId ?? "", {
    enabled: open && !!orderPublicId,
  });

  useEffect(() => {
    if (!isError || !queryError) return;
    const message = normalizeError(queryError).message;
    notify.error(queryError, { fallbackMessage: message });
  }, [isError, queryError]);

  const order = useMemo(
    () => (open && orderPublicId ? (data ?? null) : null),
    [open, orderPublicId, data],
  );

  const error = useMemo(() => {
    if (!isError || !queryError) return null;
    return normalizeError(queryError).message;
  }, [isError, queryError]);

  return {
    order,
    loading: open && !!orderPublicId && isLoading,
    error,
    refresh: () => {
      void refetch();
    },
  };
}
