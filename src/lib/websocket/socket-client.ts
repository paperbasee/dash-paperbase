export interface SocketEvent {
  event: string;
  payload: Record<string, unknown>;
}

function resolveWsBase(): string {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (wsUrl) {
    return wsUrl.replace(/\/$/, "");
  }
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (apiUrl) {
    try {
      return new URL(apiUrl).origin.replace(/^http/, "ws");
    } catch {
      return apiUrl.replace(/^https:\/\//, "wss://").replace(/^http:\/\//, "ws://").replace(/\/$/, "");
    }
  }
  return "ws://localhost:8000";
}

/**
 * What the socket signs in with: the pass (a browser cannot set headers on a socket) and the shop
 * the dashboard works in -- passes carry no shop (api engine/core/ws_jwt.py).
 */
export interface SocketCredentials {
  pass: string;
  shop: string | null;
}

export function buildSocketUrl({ pass, shop }: SocketCredentials): string {
  const query = new URLSearchParams({ token: pass });
  if (shop) query.set("store", shop);
  return `${resolveWsBase()}/ws/v1/store/events/?${query.toString()}`;
}

function reconnectDelayMs(attempt: number): number {
  if (attempt <= 0) return 1000;
  if (attempt === 1) return 2000;
  if (attempt === 2) return 4000;
  if (attempt === 3) return 8000;
  return 15000;
}

export class StoreSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private isIntentionallyClosed = false;
  private readonly messageHandlers = new Set<(event: SocketEvent) => void>();
  private onConnectHandler: (() => void) | null = null;
  private onDisconnectHandler: (() => void) | null = null;
  /** Where each (re)connection gets a current pass: one lasts only ten minutes. */
  private credentials: (() => Promise<SocketCredentials | null>) | null = null;

  connect(credentials: () => Promise<SocketCredentials | null>): void {
    this.credentials = credentials;
    this.isIntentionallyClosed = false;
    void this.open();
  }

  private async open(): Promise<void> {
    const signIn = await this.credentials?.();
    if (!signIn || this.isIntentionallyClosed) return;

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }

    const ws = new WebSocket(buildSocketUrl(signIn));
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.startPing();
      this.onConnectHandler?.();
    };

    ws.onmessage = (messageEvent) => {
      this.clearPongTimer();

      try {
        const parsed: unknown = JSON.parse(String(messageEvent.data));
        if (
          parsed &&
          typeof parsed === "object" &&
          "event" in parsed &&
          typeof (parsed as { event: unknown }).event === "string"
        ) {
          const record = parsed as { event: string; payload?: unknown };
          const payload =
            record.payload && typeof record.payload === "object" && !Array.isArray(record.payload)
              ? (record.payload as Record<string, unknown>)
              : {};
          const socketEvent: SocketEvent = { event: record.event, payload };
          this.messageHandlers.forEach((handler) => handler(socketEvent));
        }
      } catch {
        // Ignore non-JSON or malformed messages (e.g. pong frames).
      }
    };

    ws.onerror = () => {
      // Browser fires onerror before onclose; reconnect is handled in onclose.
    };

    ws.onclose = () => {
      this.stopPing();
      this.onDisconnectHandler?.();
      if (!this.isIntentionallyClosed && this.credentials) {
        this.scheduleReconnect();
      }
    };
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.credentials = null;
    this.stopPing();
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }
    const delay = reconnectDelayMs(this.reconnectAttempts);
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isIntentionallyClosed) {
        void this.open();
      }
    }, delay);
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
        this.clearPongTimer();
        this.pongTimer = setTimeout(() => {
          this.ws?.close();
        }, 5000);
      }
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    this.clearPongTimer();
  }

  private clearPongTimer(): void {
    if (this.pongTimer !== null) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  onMessage(handler: (event: SocketEvent) => void): () => void {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  onConnect(handler: () => void): void {
    this.onConnectHandler = handler;
  }

  onDisconnect(handler: () => void): void {
    this.onDisconnectHandler = handler;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
