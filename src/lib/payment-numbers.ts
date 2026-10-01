/**
 * Settings > Payments (owner, 2026-10-02): the numbers a shop's shoppers send a prepaid order's
 * money to -- one for bKash, one for Nagad -- set by the owner alone (config/owner-powers.ts
 * "payments"; API: PATCH store/payment-numbers/). An empty one means that wallet isn't offered.
 */

export const WALLETS = ["bkash", "nagad"] as const;

export type Wallet = (typeof WALLETS)[number];

export type PaymentNumbers = {
  numbers: Record<Wallet, string>;
  /** Products a shopper must pay for before delivery: warned about when no number is set. */
  prepaidProducts: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** The API's answer, read carefully: a missing wallet is an empty one. */
export function parsePaymentNumbers(raw: unknown): PaymentNumbers {
  const body = isRecord(raw) ? raw : {};
  const numbers = isRecord(body.numbers) ? body.numbers : {};
  return {
    numbers: {
      bkash: typeof numbers.bkash === "string" ? numbers.bkash : "",
      nagad: typeof numbers.nagad === "string" ? numbers.nagad : "",
    },
    prepaidProducts: typeof body.prepaid_products === "number" ? body.prepaid_products : 0,
  };
}

/** The wallets whose typed number differs from the saved one: what a save sends. */
export function changedWallets(
  saved: Record<Wallet, string>,
  typed: Record<Wallet, string>
): Partial<Record<Wallet, string>> {
  const changes: Partial<Record<Wallet, string>> = {};
  for (const wallet of WALLETS) {
    if (typed[wallet].trim() !== saved[wallet]) changes[wallet] = typed[wallet].trim();
  }
  return changes;
}
