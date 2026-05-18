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

function buildSocketUrl(token: string): string {
  const base = resolveWsBase();
  const encoded = encodeURIComponent(token);
  return `${base}/ws/v1/store/events/?token=${encoded}`;
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
  private lastToken: string | null = null;

  connect(token: string): void {
    this.lastToken = token;
    this.isIntentionallyClosed = false;

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }

    const url = buildSocketUrl(token);
    const ws = new WebSocket(url);
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
      if (!this.isIntentionallyClosed && this.lastToken) {
        this.scheduleReconnect(this.lastToken);
      }
    };
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.lastToken = null;
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

  private scheduleReconnect(token: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }
    const delay = reconnectDelayMs(this.reconnectAttempts);
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isIntentionallyClosed) {
        this.connect(token);
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
