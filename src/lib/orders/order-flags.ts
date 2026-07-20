export const ORDER_FLAG_OPTIONS = [
  "no_response",
  "call_later",
  "wrong_number",
  "busy",
  "high_priority",
  "zone_changed",
] as const;

export type OrderFlagValue = (typeof ORDER_FLAG_OPTIONS)[number];

export function formatOrderFlagLabel(flag: string | null | undefined): string {
  const v = (flag || "").trim().toLowerCase();
  if (!v) return "—";
  switch (v) {
    case "no_response":
      return "No Response";
    case "call_later":
      return "Call Later";
    case "wrong_number":
      return "Wrong Number";
    case "busy":
      return "Busy";
    case "high_priority":
      return "High Priority";
    case "zone_changed":
      return "Zone Changed";
    default:
      return v.replace(/_/g, " ");
  }
}

