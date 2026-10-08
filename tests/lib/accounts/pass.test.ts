/**
 * The entry pass (lib/accounts/pass): held in this tab's memory, renewed at Accounts a little
 * before it runs out, dropped when the sign-in is over, and followed when the browser's sign-in
 * becomes another one.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ACCOUNTS, aPass, aTab, answer } from "./browser";

type PassModule = typeof import("@/lib/accounts/pass");

/** The module afresh: its pass lives in module memory, as in a tab. */
async function freshTab(signedIn = false): Promise<PassModule & ReturnType<typeof aTab>> {
  vi.resetModules();
  const tab = aTab({ signedIn });
  return { ...(await import("@/lib/accounts/pass")), ...tab };
}

function accountsRenews(...answers: Array<Response | Error>) {
  const fetch = vi.fn(async () => {
    const next = answers.shift();
    if (next instanceof Error) throw next;
    return next!;
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("reading a pass", () => {
  it("names the person, the sign-in, when it runs out and whether support is acting", async () => {
    const { readPass } = await freshTab();
    const claims = readPass(aPass({ sub: "usr_1", sid: "ses_1", act: { sub: "usr_staff" } }));
    expect(claims).toMatchObject({ sub: "usr_1", sid: "ses_1", support: true });
    expect(readPass(aPass())?.support).toBe(false);
    expect(readPass("rubbish")).toBeNull();
    expect(readPass(null)).toBeNull();
  });
});

describe("renewing", () => {
  it("asks Accounts with the browser's cookie, and holds the fresh pass", async () => {
    const tab = await freshTab(true);
    const pass = aPass();
    const fetch = accountsRenews(answer(200, { access_token: pass, expires_in: 600 }));
    expect(await tab.renewPass()).toEqual({ kind: "renewed", pass });
    expect(tab.heldPass()).toBe(pass);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${ACCOUNTS}/passes/renew`);
    expect(init).toMatchObject({ method: "POST", credentials: "include" });
    // The proxy's hint that this browser is signed in.
    expect(tab.cookies.value).toBe("auth_session=1");
  });

  it("renews by itself a minute before the pass runs out", async () => {
    const tab = await freshTab(true);
    const fetch = accountsRenews(answer(200, { access_token: aPass() }));
    tab.holdPass(aPass({ seconds: 600 }));
    vi.advanceTimersByTime(538_000);
    expect(fetch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3_000);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("one request at a time, however many ask", async () => {
    const tab = await freshTab(true);
    const fetch = accountsRenews(answer(200, { access_token: aPass() }));
    await Promise.all([tab.renewPass(), tab.renewPass(), tab.renewPass()]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("a sign-in that is over drops the pass and tells the tab to leave", async () => {
    const tab = await freshTab(true);
    tab.holdPass(aPass());
    const leave = vi.fn();
    tab.onSignedOut(leave);
    accountsRenews(answer(401, { error: "signed_out" }));
    expect(await tab.renewPass()).toEqual({ kind: "signed_out" });
    expect(tab.heldPass()).toBeNull();
    expect(leave).toHaveBeenCalledTimes(1);
  });

  it("a tab that never held a pass has no sign-in to leave", async () => {
    const tab = await freshTab(true);
    const leave = vi.fn();
    tab.onSignedOut(leave);
    accountsRenews(answer(401, { error: "signed_out" }));
    expect(await tab.renewPass()).toEqual({ kind: "signed_out" });
    expect(leave).not.toHaveBeenCalled();
  });

  it("Accounts away keeps the pass held, which may still work", async () => {
    const tab = await freshTab(true);
    const pass = aPass();
    tab.holdPass(pass);
    accountsRenews(new TypeError("Failed to fetch"));
    expect(await tab.renewPass()).toEqual({ kind: "unreachable" });
    expect(tab.heldPass()).toBe(pass);
  });

  it("a renewal for another sign-in reloads the tab into it", async () => {
    const tab = await freshTab(true);
    tab.holdPass(aPass({ sid: "ses_own" }));
    accountsRenews(answer(200, { access_token: aPass({ sid: "ses_support", act: { sub: "usr_staff" } }) }));
    await tab.renewPass();
    expect(tab.reload).toHaveBeenCalledTimes(1);
  });
});

describe("the pass for a request", () => {
  it("is the one held while it has time left", async () => {
    const tab = await freshTab(true);
    const pass = aPass();
    tab.holdPass(pass);
    const fetch = accountsRenews();
    expect(await tab.passForRequest()).toBe(pass);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("is a fresh one when it is about to run out", async () => {
    const tab = await freshTab(true);
    tab.holdPass(aPass({ seconds: 30 }));
    const fresh = aPass();
    accountsRenews(answer(200, { access_token: fresh }));
    expect(await tab.passForRequest()).toBe(fresh);
  });

  it("is asked of Accounts as a page opens in a signed-in browser", async () => {
    const tab = await freshTab(true);
    const fresh = aPass();
    accountsRenews(answer(200, { access_token: fresh }));
    expect(await tab.passForRequest()).toBe(fresh);
  });

  it("is none in a browser that is not signed in, without asking Accounts", async () => {
    const tab = await freshTab(false);
    const fetch = accountsRenews();
    expect(await tab.passForRequest()).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("is the one held, still in date, while Accounts is away", async () => {
    const tab = await freshTab(true);
    const pass = aPass({ seconds: 30 });
    tab.holdPass(pass);
    accountsRenews(new TypeError("Failed to fetch"));
    expect(await tab.passForRequest()).toBe(pass);
  });
});
