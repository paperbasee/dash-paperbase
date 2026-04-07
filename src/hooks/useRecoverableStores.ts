"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

export type RecoverableStore = {
  public_id: string;
  name: string;
  status: string;
  delete_at: string | null;
  removed_at: string | null;
  delete_requested_at: string | null;
};

export function useRecoverableStores() {
  const [stores, setStores] = useState<RecoverableStore[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const { data } = await api.get<RecoverableStore[]>("store/recoverable/");
      setStores(Array.isArray(data) ? data : []);
    } catch {
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { stores, loading, refetch };
}
