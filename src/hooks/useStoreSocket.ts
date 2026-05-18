"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "@/lib/auth";
import { StoreSocketClient } from "@/lib/websocket/socket-client";
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

  const connect = useCallback(() => {
    const token = getAccessToken();
    if (!token || !clientRef.current) return;
    clientRef.current.connect(token);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsConnected(false);
      return;
    }

    const token = getAccessToken();
    if (!token) {
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

    const removeHandler = client.onMessage((socketEvent) => {
      const queryKeys = getQueryKeysToInvalidate(socketEvent.event);
      if (queryKeys.length > 0) {
        queryKeys.forEach((queryKey) => {
          void queryClient.invalidateQueries({ queryKey });
        });
        onAfterInvalidateRef.current?.();
      }
    });

    connect();

    return () => {
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
