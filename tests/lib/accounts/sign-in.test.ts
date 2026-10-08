/**
 * Signing in at Accounts (lib/accounts/sign-in): the trip out to `/authorize` with PKCE, and the
 * way back -- the code traded at `/token` for the pass, by this tab only, once.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PENDING_KEY,
  authorizeUrl,
  challengeFor,
  finishSignIn,
  idTokenFits,
  supportVisitUrl,
} from "@/lib/accounts/sign-in";

import { ACCOUNTS, DASHBOARD, aPass, aTab, answer, jwt } from "./browser";

beforeEach(() => {
  aTab();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/** Out to Accounts and back: the query Accounts returns with, for the trip just started. */
async function aTrip(extra = {}) {
  const out = new URL(await authorizeUrl(extra));
  return { out, back: new URLSearchParams({ code: "the-code", state: out.searchParams.get("state")! }) };
}

function accountsGives(body: unknown, status = 200) {
  const fetch = vi.fn(async () => answer(status, body));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const idToken = (nonce: string, claims = {}) => jwt({ iss: ACCOUNTS, aud: "paperbase-dashboard", nonce, ...claims });

describe("the trip out", () => {
  it("is PKCE's S256, as RFC 7636 computes it", async () => {
    expect(await challengeFor("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("asks Accounts for a code for the dashboard, back to its registered address", async () => {
    const { out } = await aTrip();
    expect(`${out.origin}${out.pathname}`).toBe(`${ACCOUNTS}/authorize`);
    const query = Object.fromEntries(out.searchParams);
    expect(query).toMatchObject({
      client_id: "paperbase-dashboard",
      response_type: "code",
      redirect_uri: `${DASHBOARD}/auth/callback`,
      scope: "openid profile email phone",
      code_challenge_method: "S256",
    });
    // The verifier stays in this tab; only its challenge travels.
    const pending = JSON.parse(sessionStorage.getItem(PENDING_KEY)!);
    expect(query.code_challenge).toBe(await challengeFor(pending.verifier));
    expect([query.state, query.nonce]).toEqual([pending.state, pending.nonce]);
    expect(query).not.toHaveProperty("prompt");
  });

  it("carries sign-up, why the last sign-in ended and the dashboard's language", async () => {
    const { out } = await aTrip({ prompt: "create", ended: "access_changed", locale: "bn" });
    expect(out.searchParams.get("prompt")).toBe("create");
    expect(out.searchParams.get("ended")).toBe("access_changed");
    expect(out.searchParams.get("ui_locales")).toBe("bn");
  });

  it("starts a support visit at Accounts with the ticket, then goes on to the same trip", async () => {
    const start = new URL(await supportVisitUrl("tkt_1", "en"));
    expect(`${start.origin}${start.pathname}`).toBe(`${ACCOUNTS}/support/start`);
    expect(start.searchParams.get("ticket")).toBe("tkt_1");
    const next = start.searchParams.get("next")!;
    expect(next.startsWith("/authorize?")).toBe(true);
    expect(new URLSearchParams(next.split("?")[1]).get("state")).toBe(JSON.parse(sessionStorage.getItem(PENDING_KEY)!).state);
  });
});

describe("the way back", () => {
  it("trades the code, with the verifier, for the pass", async () => {
    const { back } = await aTrip({ next: "/orders" });
    const { verifier, nonce } = JSON.parse(sessionStorage.getItem(PENDING_KEY)!);
    const pass = aPass();
    const fetch = accountsGives({ access_token: pass, id_token: idToken(nonce) });
    expect(await finishSignIn(back)).toEqual({ ok: true, pass, next: "/orders" });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${ACCOUNTS}/token`);
    const form = new URLSearchParams(init.body as URLSearchParams);
    expect(Object.fromEntries(form)).toEqual({
      grant_type: "authorization_code",
      code: "the-code",
      redirect_uri: `${DASHBOARD}/auth/callback`,
      client_id: "paperbase-dashboard",
      code_verifier: verifier,
    });
  });

  it("is this tab's trip only, and once", async () => {
    const { back } = await aTrip();
    const { nonce } = JSON.parse(sessionStorage.getItem(PENDING_KEY)!);
    accountsGives({ access_token: aPass(), id_token: idToken(nonce) });
    expect((await finishSignIn(back)).ok).toBe(true);
    expect(await finishSignIn(back)).toEqual({ ok: false, failure: "lost" });
  });

  it("refuses a state that is not this trip's", async () => {
    const { back } = await aTrip();
    back.set("state", "someone-elses");
    const fetch = accountsGives({});
    expect(await finishSignIn(back)).toEqual({ ok: false, failure: "lost" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("says Accounts' refusal as such", async () => {
    const { back } = await aTrip();
    back.delete("code");
    back.set("error", "access_denied");
    expect(await finishSignIn(back)).toEqual({ ok: false, failure: "refused" });

    const second = await aTrip();
    accountsGives({ error: "invalid_grant" }, 400);
    expect(await finishSignIn(second.back)).toEqual({ ok: false, failure: "refused" });
  });

  it("refuses an ID token from another trip", async () => {
    const { back } = await aTrip();
    accountsGives({ access_token: aPass(), id_token: idToken("another-nonce") });
    expect(await finishSignIn(back)).toEqual({ ok: false, failure: "refused" });
  });

  it("tells Accounts away from a refusal", async () => {
    const { back } = await aTrip();
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    expect(await finishSignIn(back)).toEqual({ ok: false, failure: "unreachable" });

    const second = await aTrip();
    accountsGives({}, 502);
    expect(await finishSignIn(second.back)).toEqual({ ok: false, failure: "unreachable" });
  });
});

describe("the ID token", () => {
  it("must be Accounts', for the dashboard, with the trip's nonce", () => {
    expect(idTokenFits(idToken("n"), "n")).toBe(true);
    expect(idTokenFits(idToken("n", { aud: ["paperbase-dashboard", "other"] }), "n")).toBe(true);
    expect(idTokenFits(idToken("n", { iss: "https://evil.example" }), "n")).toBe(false);
    expect(idTokenFits(idToken("n", { aud: "another-client" }), "n")).toBe(false);
    expect(idTokenFits("rubbish", "n")).toBe(false);
    expect(idTokenFits(undefined, "n")).toBe(false);
  });
});
