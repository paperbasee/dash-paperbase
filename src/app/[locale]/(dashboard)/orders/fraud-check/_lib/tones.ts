import type { FraudRiskLevel } from "../../_components/types";

/**
 * Each verdict's colour on this page (engine/apps/fraud_check/risk.py: green, yellow, red; a new
 * number is yellow too). Text is a shade that reads on white and on the dark theme.
 */
export const LEVEL_TEXT: Record<FraudRiskLevel, string> = {
  safe: "text-emerald-700 dark:text-emerald-300",
  caution: "text-amber-700 dark:text-amber-300",
  new: "text-amber-700 dark:text-amber-300",
  risky: "text-red-700 dark:text-red-300",
};

/** The ring, drawn in `currentColor`. */
export const LEVEL_RING: Record<FraudRiskLevel, string> = {
  safe: "text-emerald-500",
  caution: "text-amber-500",
  new: "text-amber-500",
  risky: "text-red-500",
};

/** The verdict band: a wash of the colour inside a line of it. */
export const LEVEL_BAND: Record<FraudRiskLevel, string> = {
  safe: "border-emerald-600/30 bg-emerald-500/[0.07]",
  caution: "border-amber-600/30 bg-amber-500/[0.08]",
  new: "border-amber-600/30 bg-amber-500/[0.08]",
  risky: "border-red-600/30 bg-red-500/[0.07]",
};

/** The rule above the band's parcel counts. */
export const LEVEL_RULE: Record<FraudRiskLevel, string> = {
  safe: "border-emerald-600/20",
  caution: "border-amber-600/25",
  new: "border-amber-600/25",
  risky: "border-red-600/20",
};

/** Delivered and cancelled counts, wherever they show. */
export const DELIVERED_TEXT = LEVEL_TEXT.safe;
export const CANCELLED_TEXT = LEVEL_TEXT.risky;
