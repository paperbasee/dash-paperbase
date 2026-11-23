/**
 * The shop's own fraud key (phase 5a, owner 2026-11-17; guidelines/own-fraud-key-plan.md): one choice,
 * Paperbase's check or the shop's own provider account -- a provider from the list (BD Courier first)
 * and its token. API: fraud-check/key/ (GET orders.view; PUT and DELETE settings.manage, the Admin role
 * and the owner) and fraud-check/key/test/.
 *
 * On its own key there is no fallback: when the key fails, the shop's checks fail until it is fixed or
 * the shop switches back -- so the orders list warns (`ownKeyTrouble`) as well as Settings.
 */

import { isApiHttpError } from "@/lib/api-client";

export type FraudKeyMode = "paperbase" | "own";

/** Its token: none saved, not tried yet, answered last time, refused last time. */
export type FraudKeyState = "missing" | "untested" | "working" | "failing";

export type FraudKeyProvider = { value: string; label: string };

export type FraudKey = {
  mode: FraudKeyMode;
  provider: string;
  providers: FraudKeyProvider[];
  hasToken: boolean;
  /** The token's last four characters, only to whoever may change it; the token itself never leaves the API. */
  tokenLast4: string | null;
  state: FraudKeyState;
  /** Since when, and the provider's own words. */
  failing: { since: string | null; detail: string } | null;
  workingAt: string | null;
  /** Answers from the shop's key go into Paperbase's shared one-day pool (the admin's switch). */
  sharesAnswers: boolean;
  /** The plan has the fraud check (Premium): without it a kept key waits, unused. */
  included: boolean;
};

const STATES: readonly FraudKeyState[] = ["missing", "untested", "working", "failing"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const text = (value: unknown): string | null => (typeof value === "string" && value ? value : null);

/** The provider's words as a quote inside a sentence of ours: without their own closing full stop. */
const quoted = (value: unknown): string | null => text(value)?.trim().replace(/[.।]+$/, "") || null;

/** The API's answer, read carefully: anything unknown reads as Paperbase's check with nothing set. */
export function parseFraudKey(raw: unknown): FraudKey {
  const body = isRecord(raw) ? raw : {};
  const failing = isRecord(body.failing) ? body.failing : null;
  return {
    mode: body.mode === "own" ? "own" : "paperbase",
    provider: text(body.provider) ?? "bdcourier",
    providers: Array.isArray(body.providers)
      ? body.providers.flatMap((row) =>
          isRecord(row) && text(row.value) && text(row.label) ? [{ value: String(row.value), label: String(row.label) }] : [],
        )
      : [],
    hasToken: body.has_token === true,
    tokenLast4: text(body.token_last4),
    state: STATES.includes(body.state as FraudKeyState) ? (body.state as FraudKeyState) : "missing",
    failing: failing ? { since: text(failing.since), detail: quoted(failing.detail) ?? "" } : null,
    workingAt: text(body.working_at),
    sharesAnswers: body.shares_answers === true,
    included: body.included === true,
  };
}

/**
 * Why the shop's checks fail on its own key, for the orders list to warn: it refused last time, or
 * it is chosen with no token. Nothing on Paperbase's check, or while the plan has no fraud check.
 */
export function ownKeyTrouble(key: FraudKey | null | undefined): "failing" | "missing" | null {
  if (!key || key.mode !== "own" || !key.included) return null;
  if (key.state === "failing") return "failing";
  if (key.state === "missing") return "missing";
  return null;
}

/**
 * A check the shop's own key failed because the provider refused it (a bad key, a plan used up or
 * ended): the provider's words ("" when it gave none), else null. Not a check that never got an
 * answer -- the network, the provider's own server -- which carries `error` (the API's providers.ask)
 * and is no key's fault.
 */
export function ownKeyRefusal(
  data: { own_key?: boolean; status?: string; response?: unknown } | null | undefined,
): string | null {
  if (!data?.own_key || data.status !== "error") return null;
  const response = isRecord(data.response) ? data.response : {};
  if ("error" in response) return null;
  return quoted(response.detail) ?? "";
}

/** A refused check (429) held back by the safety limit a minute on the shop's own key: it lifts in a minute. */
export function hitOwnKeyMinute(err: unknown): boolean {
  return isApiHttpError(err) && isRecord(err.data) && err.data.limit_exceeded === "own_key_minute";
}

/** The part of the API client this needs (`@/lib/api`). */
type Client = {
  get: <T>(url: string) => Promise<{ data: T }>;
  put: <T>(url: string, body: unknown) => Promise<{ data: T }>;
  post: <T>(url: string, body?: unknown) => Promise<{ data: T }>;
  delete: <T>(url: string) => Promise<{ data: T }>;
};

const URL = "fraud-check/key/";

export async function fetchFraudKey(client: Client): Promise<FraudKey> {
  return parseFraudKey((await client.get<unknown>(URL)).data);
}

/** Choose; a token left out keeps the saved one. */
export async function saveFraudKey(
  client: Client,
  choice: { mode: FraudKeyMode; provider?: string; token?: string },
): Promise<FraudKey> {
  return parseFraudKey((await client.put<unknown>(URL, choice)).data);
}

/** Forget the token: Paperbase's check again. */
export async function removeFraudKey(client: Client): Promise<FraudKey> {
  return parseFraudKey((await client.delete<unknown>(URL)).data);
}

/** One check of the shop's own number on the saved key (it spends one of the shop's own plan). */
export async function testFraudKey(client: Client): Promise<{ ok: boolean; detail: string; key: FraudKey }> {
  const { data } = await client.post<unknown>(`${URL}test/`);
  const body = isRecord(data) ? data : {};
  return { ok: body.ok === true, detail: text(body.detail) ?? "", key: parseFraudKey(body.key) };
}
