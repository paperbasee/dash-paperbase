/**
 * The shop's own fraud key (phase 5a, owner 2026-11-17; api fraud-check/key/): the API's answer read
 * carefully, and when the orders list must warn -- the shop's checks fail on its own key.
 */
import { describe, expect, it } from "vitest";

import { ApiHttpError } from "@/lib/api-client";
import { hitOwnKeyMinute, ownKeyRefusal, ownKeyTrouble, parseFraudKey, type FraudKey } from "@/lib/fraud-key";

const ANSWER = {
  mode: "own",
  provider: "bdcourier",
  providers: [{ value: "bdcourier", label: "BD Courier" }],
  has_token: true,
  token_last4: "9876",
  state: "failing",
  failing: { since: "2026-11-24T02:00:00Z", detail: "Invalid API key" },
  working_at: null,
  shares_answers: true,
  included: true,
};

describe("parseFraudKey", () => {
  it("reads every part", () => {
    expect(parseFraudKey(ANSWER)).toEqual<FraudKey>({
      mode: "own",
      provider: "bdcourier",
      providers: [{ value: "bdcourier", label: "BD Courier" }],
      hasToken: true,
      tokenLast4: "9876",
      state: "failing",
      failing: { since: "2026-11-24T02:00:00Z", detail: "Invalid API key" },
      workingAt: null,
      sharesAnswers: true,
      included: true,
    });
  });

  it("reads anything else as Paperbase's check with nothing set", () => {
    const key = parseFraudKey({ mode: "who knows", state: "odd", providers: "x" });
    expect(key.mode).toBe("paperbase");
    expect(key.state).toBe("missing");
    expect(key.providers).toEqual([]);
    expect(key.hasToken).toBe(false);
    expect(key.tokenLast4).toBeNull();
    expect(key.failing).toBeNull();
    expect(key.included).toBe(false);
    expect(parseFraudKey(null).mode).toBe("paperbase");
  });
});

describe("ownKeyTrouble", () => {
  const key = (fields: Partial<FraudKey>) => ({ ...parseFraudKey(ANSWER), ...fields });

  it("warns while the shop's own key fails, or is chosen with none", () => {
    expect(ownKeyTrouble(key({ state: "failing" }))).toBe("failing");
    expect(ownKeyTrouble(key({ state: "missing", hasToken: false }))).toBe("missing");
  });

  it("says nothing on a key that works or is not tried yet, on Paperbase's check, or without the plan", () => {
    expect(ownKeyTrouble(key({ state: "working" }))).toBeNull();
    expect(ownKeyTrouble(key({ state: "untested" }))).toBeNull();
    expect(ownKeyTrouble(key({ mode: "paperbase" }))).toBeNull();
    expect(ownKeyTrouble(key({ included: false }))).toBeNull();
    expect(ownKeyTrouble(undefined)).toBeNull();
  });
});

describe("ownKeyRefusal", () => {
  it("gives the provider's words when it refused the shop's own key", () => {
    expect(ownKeyRefusal({ own_key: true, status: "error", response: { detail: "Invalid API key", status_code: 401 } })).toBe(
      "Invalid API key",
    );
    expect(ownKeyRefusal({ own_key: true, status: "error", response: {} })).toBe("");
  });

  it("quotes them without their own full stop: the sentence around them has one", () => {
    expect(
      ownKeyRefusal({ own_key: true, status: "error", response: { detail: "Invalid Bearer token. Token not found in database." } }),
    ).toBe("Invalid Bearer token. Token not found in database");
    expect(parseFraudKey({ failing: { detail: "Your plan has expired." } }).failing?.detail).toBe("Your plan has expired");
  });

  it("is nothing when the request never got an answer, on Paperbase's key, or for an answer", () => {
    expect(ownKeyRefusal({ own_key: true, status: "error", response: { detail: "Fraud API request failed.", error: "down" } })).toBeNull();
    expect(ownKeyRefusal({ own_key: false, status: "error", response: { detail: "Invalid API key" } })).toBeNull();
    expect(ownKeyRefusal({ own_key: true, status: "success", response: {} })).toBeNull();
    expect(ownKeyRefusal(undefined)).toBeNull();
  });
});

describe("hitOwnKeyMinute", () => {
  it("is the own key's safety limit a minute, not a day used up", () => {
    expect(hitOwnKeyMinute(new ApiHttpError("x", 429, { limit_exceeded: "own_key_minute" }))).toBe(true);
    expect(hitOwnKeyMinute(new ApiHttpError("x", 429, { limit_exceeded: "store_daily" }))).toBe(false);
    expect(hitOwnKeyMinute(new Error("x"))).toBe(false);
  });
});
