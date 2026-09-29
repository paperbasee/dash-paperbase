/**
 * Setup's "Where do you sell now?" (owner, 2026-09-29): any of the places, or "just starting"
 * alone. The API keeps the same keys (`stores.setup.SELLS_ON`) and adds a setup-guide step for
 * each place; these are the order setup offers them in.
 */
export const SELLS_ON = ["facebook", "instagram", "tiktok", "in_person", "starting"] as const;

export type SellsOn = (typeof SELLS_ON)[number];

/** A tap on one answer: on or off; "just starting" clears the rest, and anything else clears it. */
export function toggleSellsOn(current: readonly SellsOn[], key: SellsOn): SellsOn[] {
  if (current.includes(key)) return current.filter((one) => one !== key);
  const next: SellsOn[] = key === "starting" ? [key] : [...current.filter((one) => one !== "starting"), key];
  return SELLS_ON.filter((one) => next.includes(one));
}

/** An answer read back from the API or a draft: known keys only, in setup's order. */
export function readSellsOn(value: unknown): SellsOn[] {
  if (!Array.isArray(value)) return [];
  return SELLS_ON.filter((one) => value.includes(one));
}

/** Two answers are the same when they pick the same places. */
export function sameSellsOn(a: readonly SellsOn[], b: readonly SellsOn[]): boolean {
  return a.length === b.length && a.every((one) => b.includes(one));
}
