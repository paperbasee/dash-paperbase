"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";

import api from "@/lib/api";
import { myPermissionsQueryKey } from "@/lib/query-keys";
import { APP_VIEW_PERMISSION } from "@/config/permissions";

export interface MyPermissionsResponse {
  store_public_id: string;
  is_owner: boolean;
  is_superuser: boolean;
  role: { public_id: string; name: string; slug: string } | null;
  permissions: string[];
}

export interface PermissionsContextValue {
  permissions: Set<string>;
  isOwner: boolean;
  isSuperuser: boolean;
  role: MyPermissionsResponse["role"];
  loading: boolean;
  /** True while the set is still unknown; callers should avoid hiding UI yet. */
  isUnknown: boolean;
  has: (key: string | null | undefined) => boolean;
  canViewApp: (appId: string) => boolean;
}

const PermissionsContext = createContext<PermissionsContextValue | undefined>(
  undefined
);

const PERMISSIONS_STALE_MS = 5 * 60 * 1000;

async function fetchMyPermissions(): Promise<MyPermissionsResponse> {
  const { data } = await api.get<MyPermissionsResponse>(
    "admin/me/permissions/"
  );
  return data;
}

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const query = useQuery({
    queryKey: myPermissionsQueryKey,
    queryFn: fetchMyPermissions,
    staleTime: PERMISSIONS_STALE_MS,
    retry: false,
  });

  const data = query.data;
  const permissions = useMemo(
    () => new Set(data?.permissions ?? []),
    [data?.permissions]
  );
  const isOwner = data?.is_owner ?? false;
  const isSuperuser = data?.is_superuser ?? false;
  // Owners/superusers hold everything; the server already returns the full set,
  // but treat the flags as an all-access shortcut so UI never mis-hides for them.
  const allAccess = isOwner || isSuperuser;
  // Until we have a definitive answer, don't hide anything (avoid a flash of an
  // empty sidebar on first paint or a transient fetch failure). The server
  // re-checks every request, so being permissive here never grants real access.
  const unknown = query.isLoading || query.isError;

  const has = useCallback(
    (key: string | null | undefined): boolean => {
      if (!key) return true;
      if (allAccess || unknown) return true;
      return permissions.has(key);
    },
    [allAccess, unknown, permissions]
  );

  const canViewApp = useCallback(
    (appId: string): boolean => {
      if (allAccess || unknown) return true;
      const key = APP_VIEW_PERMISSION[appId];
      if (!key) return true; // not permission-gated
      return permissions.has(key);
    },
    [allAccess, unknown, permissions]
  );

  const value = useMemo<PermissionsContextValue>(
    () => ({
      permissions,
      isOwner,
      isSuperuser,
      role: data?.role ?? null,
      loading: query.isLoading,
      // Until we have a definitive answer, don't hide anything (avoid a flash
      // of missing nav for owners on first paint).
      isUnknown: query.isLoading || query.isError,
      has,
      canViewApp,
    }),
    [
      permissions,
      isOwner,
      isSuperuser,
      data?.role,
      query.isLoading,
      query.isError,
      has,
      canViewApp,
    ]
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error("usePermissions must be used within PermissionsProvider");
  }
  return ctx;
}
