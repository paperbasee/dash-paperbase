"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { currentShop } from "@/lib/api";
import { heldClaims, passForRequest } from "@/lib/accounts/pass";
import { isSigningOut, logout } from "@/lib/auth";
import { pageAfterSignInEnded } from "@/lib/sign-in-ended";
import { StoreSocketClient, type SocketCredentials } from "@/lib/websocket/socket-client";
import { createInvalidationCoalescer } from "@/lib/websocket/coalesce-query-invalidations";
import { getQueryKeysToInvalidate } from "@/lib/websocket/socket-events";

export interface UseStoreSocketOptions {
  enabled?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onAfterInvalidate?: () => void;
}

export interface UseStoreSocketReturn {
  isConnected: boolean;
  reconnect: () => void;
}

export function useStoreSocket(
  options: UseStoreSocketOptions = {}
): UseStoreSocketReturn {
  const { enabled = true } = options;
  const queryClient = useQueryClient();
  const clientRef = useRef<StoreSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const onConnectRef = useRef(options.onConnect);
  const onDisconnectRef = useRef(options.onDisconnect);
  const onAfterInvalidateRef = useRef(options.onAfterInvalidate);

  useEffect(() => {
    onConnectRef.current = options.onConnect;
    onDisconnectRef.current = options.onDisconnect;
    onAfterInvalidateRef.current = options.onAfterInvalidate;
  }, [options.onConnect, options.onDisconnect, options.onAfterInvalidate]);

  // The sign-in this socket speaks for, from the pass it last connected with: when the API ends it
  // (a role or category change, the owner's Sessions), this tab leaves for the sign-in page at once.
  const socketSidRef = useRef("");

  const connect = useCallback(() => {
    clientRef.current?.connect(async (): Promise<SocketCredentials | null> => {
      const pass = await passForRequest();
      if (!pass) return null;
      socketSidRef.current = heldClaims()?.sid ?? "";
      return { pass, shop: currentShop() };
    });
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsConnected(false);
      return;
    }

    const client = new StoreSocketClient();
    clientRef.current = client;

    client.onConnect(() => {
      setIsConnected(true);
      onConnectRef.current?.();
    });

    client.onDisconnect(() => {
      setIsConnected(false);
      onDisconnectRef.current?.();
    });

    const invalidationCoalescer = createInvalidationCoalescer(queryClient, {
      onFlush: () => onAfterInvalidateRef.current?.(),
    });

    const removeHandler = client.onMessage((socketEvent) => {
      const leaveFor = pageAfterSignInEnded(socketEvent, socketSidRef.current, heldClaims()?.sid ?? null);
      if (leaveFor) {
        client.disconnect();
        if (!isSigningOut()) logout(leaveFor);
        return;
      }
      const queryKeys = getQueryKeysToInvalidate(socketEvent.event);
      if (queryKeys.length > 0) {
        invalidationCoalescer.enqueue(queryKeys);
      }
    });

    connect();

    return () => {
      invalidationCoalescer.dispose();
      removeHandler();
      client.disconnect();
      clientRef.current = null;
      setIsConnected(false);
    };
  }, [enabled, connect, queryClient]);

  return {
    isConnected,
    reconnect: connect,
  };
}
