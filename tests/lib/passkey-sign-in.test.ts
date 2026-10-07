/**
 * Passkey sign-in from the email box's suggestions (owner, 2026-10-07), and new passkeys left
 * unnamed so the list names them after where they are saved.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
vi.mock("@/lib/api-client", () => ({ apiClient: { post: (...a: unknown[]) => post(...a) } }));
vi.mock("@/lib/auth-session-cookie", () => ({ setAuthSessionCookie: vi.fn(), clearAuthSessionCookie: vi.fn() }));

const fromAutofill = vi.fn();
const fromPrompt = vi.fn();
const create = vi.fn();
vi.mock("@/lib/passkeys", () => ({
  getPasskeyAssertionFromAutofill: (...a: unknown[]) => fromAutofill(...a),
  getPasskeyAssertion: (...a: unknown[]) => fromPrompt(...a),
  createPasskey: (...a: unknown[]) => create(...a),
}));

import { enrollPasskey, passkeyAutofillLogin } from "@/lib/auth";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
});

beforeEach(() => {
  post.mockReset();
  fromAutofill.mockReset();
  store.clear();
});

describe("signing in from the email box", () => {
  it("asks for any of this device's passkeys, waits for the pick, then signs in", async () => {
    const order: string[] = [];
    post.mockImplementation(async (url: string, body: unknown) => {
      order.push(url.endsWith("/begin/") ? "begin" : "finish");
      return url.endsWith("/begin/")
        ? { challenge_id: "ch_1", options: { challenge: "abc" } }
        : { access: "acc", refresh: "ref", active_store_public_id: null, body };
    });
    fromAutofill.mockImplementation(async () => {
      order.push("picked");
      return { id: "cred" };
    });

    const tokens = await passkeyAutofillLogin(() => order.push("told"));

    expect(post.mock.calls[0][1]).toEqual({}); // no email: the device lists every account it has
    expect(fromAutofill).toHaveBeenCalledWith({ challenge: "abc" });
    expect(post.mock.calls[1][1]).toEqual({ challenge_id: "ch_1", response: { id: "cred" } });
    expect(order).toEqual(["begin", "picked", "told", "finish"]);
    expect(tokens.access).toBe("acc");
    expect(store.get("access_token")).toBe("acc");
  });

  it("is never told of a pick when the wait ended without one", async () => {
    post.mockResolvedValue({ challenge_id: "ch_1", options: {} });
    fromAutofill.mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }));
    const told = vi.fn();
    await expect(passkeyAutofillLogin(told)).rejects.toThrow("aborted");
    expect(told).not.toHaveBeenCalled();
    expect(post).toHaveBeenCalledTimes(1);
  });
});

describe("a new passkey", () => {
  it("is not named after a guess at the device", async () => {
    post.mockImplementation(async (url: string) =>
      url.endsWith("/begin/") ? { challenge_id: "r1", options: {} } : { credential: { public_id: "pk_1" } }
    );
    create.mockResolvedValue({ id: "new" });
    store.set("access_token", "acc");
    await enrollPasskey({});
    expect((post.mock.calls[1][1] as { name: string }).name).toBe("");
  });
});

describe("the sign-in page", () => {
  it("runs the quiet request, pauses it for its button, and marks the email box for it", () => {
    const src = readFileSync(path.join(__dirname, "../../src/app/[locale]/(auth)/login/page.tsx"), "utf8");
    expect(src).toContain("usePasskeyAutofill({");
    expect(src).toContain("active: supportsPasskeys && !linkSent");
    expect(src).toContain("autofill.pause();");
    expect(src).toContain("if (!signedIn) autofill.resume();");
    // The device offers passkeys only in a box marked for them.
    expect(src).toContain('autoComplete="username webauthn"');
  });
});
