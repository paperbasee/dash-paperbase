import api from "@/lib/api";

export interface SystemNotification {
  public_id: string;
  title: string;
  message: string;
  cta_text?: string | null;
  cta_url?: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePayload(data: unknown): SystemNotification | null {
  if (data == null) return null;
  if (!isRecord(data)) return null;
  const public_id = data.public_id;
  const title = data.title;
  const message = data.message;
  if (typeof public_id !== "string" || !public_id.trim()) return null;
  if (typeof title !== "string") return null;
  if (typeof message !== "string") return null;
  const cta_text = data.cta_text;
  const cta_url = data.cta_url;
  return {
    public_id,
    title,
    message,
    cta_text: typeof cta_text === "string" ? cta_text : cta_text == null ? null : String(cta_text),
    cta_url: typeof cta_url === "string" ? cta_url : cta_url == null ? null : String(cta_url),
  };
}

/**
 * GET system-notifications/active/ — returns one notification or null.
 * Throws on transport/HTTP errors (use try/catch in hooks).
 * Returns null for empty response or rejected payload shape.
 */
export async function getActiveSystemNotification(): Promise<SystemNotification | null> {
  const { data } = await api.get<unknown>("system-notifications/active/");
  return parsePayload(data);
}

export interface DismissSystemNotificationResult {
  public_id: string;
  dismiss_count: number;
  hidden: boolean;
}

/**
 * POST system-notifications/<public_id>/dismiss/ — records a daily dismiss for the current user.
 */
export async function dismissSystemNotification(
  publicId: string
): Promise<DismissSystemNotificationResult> {
  const { data } = await api.post<unknown>(
    `system-notifications/${encodeURIComponent(publicId)}/dismiss/`
  );
  if (!isRecord(data)) {
    throw new Error("Invalid dismiss response");
  }
  const public_id = data.public_id;
  const dismiss_count = data.dismiss_count;
  const hidden = data.hidden;
  if (typeof public_id !== "string" || typeof dismiss_count !== "number" || typeof hidden !== "boolean") {
    throw new Error("Invalid dismiss response shape");
  }
  return { public_id, dismiss_count, hidden };
}
