export const ORDER_FLAG_OPTIONS = [
  "no_response",
  "call_later",
  "wrong_number",
  "busy",
  "high_priority",
  "zone_changed",
] as const;

export type OrderFlagValue = (typeof ORDER_FLAG_OPTIONS)[number];

const FLAG_I18N_KEYS: Record<OrderFlagValue, string> = {
  no_response: "orderFlagNoResponse",
  call_later: "orderFlagCallLater",
  wrong_number: "orderFlagWrongNumber",
  busy: "orderFlagBusy",
  high_priority: "orderFlagHighPriority",
  zone_changed: "orderFlagZoneChanged",
};

/** A flag in the page's words (`pages` messages); "—" for none. */
export function formatOrderFlagLabel(flag: string | null | undefined, t: (key: string) => string): string {
  const v = (flag || "").trim().toLowerCase();
  if (!v) return "—";
  const key = FLAG_I18N_KEYS[v as OrderFlagValue];
  return key ? t(key) : v.replace(/_/g, " ");
}

