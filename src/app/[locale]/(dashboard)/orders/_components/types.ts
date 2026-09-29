/** Paperbase's own history for a number: counts across every shop, never which shop. */
export type PhoneHistory = {
  delivered: number;
  returned: number;
  wrong_number_shops: number;
};

export type FraudCheckApiOk = {
  cached?: boolean;
  status?: string;
  log_id?: number | null;
  response?: unknown;
  history?: PhoneHistory | null;
};

export type FraudCheckState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; data: FraudCheckApiOk }
  | { kind: "error"; message: string; status?: number };

