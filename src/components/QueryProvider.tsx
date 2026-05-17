"use client";

import { useState, type ReactNode } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { idbPersister } from "@/lib/queryPersister";

const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: FIFTEEN_DAYS_MS,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 2,
    },
  },
});

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => queryClient);

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister: idbPersister,
        maxAge: FIFTEEN_DAYS_MS,
        buster: process.env.NEXT_PUBLIC_BUILD_ID,
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
