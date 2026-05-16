"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/api";
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
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchOrder = useCallback(async () => {
    if (!orderPublicId) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Order>(`admin/orders/${orderPublicId}/`);
      if (requestId !== requestIdRef.current) return;
      setOrder(res.data);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setOrder(null);
      const message = normalizeError(err).message;
      setError(message);
      notify.error(err, { fallbackMessage: message });
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [orderPublicId]);

  useEffect(() => {
    if (!open || !orderPublicId) {
      return;
    }
    void fetchOrder();
  }, [open, orderPublicId, fetchOrder]);

  useEffect(() => {
    if (!open) {
      requestIdRef.current += 1;
      setOrder(null);
      setError(null);
      setLoading(false);
    }
  }, [open]);

  return { order, loading, error, refresh: fetchOrder };
}
