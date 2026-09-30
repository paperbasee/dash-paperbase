/** Paperbase's own history for a number: counts across every shop, never which shop. */
export type PhoneHistory = {
  delivered: number;
  returned: number;
  wrong_number_shops: number;
};

/** An order's fraud colour (engine/apps/fraud_check/risk.py). */
export type FraudRiskLevel = "safe" | "caution" | "new" | "risky";

/** The colour a fraud check came to, and what it was decided on. */
export type FraudRisk = {
  level: FraudRiskLevel;
  success_ratio: number | null;
  total_parcels: number;
};

export type FraudCheckApiOk = {
  cached?: boolean;
  status?: string;
  log_id?: number | null;
  response?: unknown;
  history?: PhoneHistory | null;
  /** None when nothing could be said (the provider failed and Paperbase knows no parcels). */
  risk?: FraudRisk | null;
};

export type FraudCheckState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; data: FraudCheckApiOk }
  | { kind: "error"; message: string; status?: number };

