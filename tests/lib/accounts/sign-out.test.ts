/**
 * Signing out (lib/auth): Accounts ends the browser's sign-in before the tab leaves -- else the
 * sign-in page would find it on and sign the person straight back in -- the other tabs are told,
 * and the tab, already leaving, is not sent anywhere else by its sign-in's end coming back.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ACCOUNTS, aTab, answer } from "./browser";

vi.mock("@/components/QueryProvider", () => ({ queryClient: { clear: vi.fn() } }));
vi.mock("@/lib/queryPersister", () => ({ idbPersister: { removeClient: vi.fn() } }));

let posted: unknown[];

beforeEach(() => {
  vi.resetModules();
  posted = [];
  vi.stubGlobal(
    "BroadcastChannel",
    class {
      postMessage(message: unknown) {
        posted.push(message);
      }
      close() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function aTabThatLeaves() {
  const tab = aTab({ signedIn: true });
  const replace = vi.fn();
  (window as unknown as { location: Record<string, unknown> }).location.replace = replace;
  return { ...tab, replace };
}

describe("signing out", () => {
  it("ends the sign-in at Accounts first, then tells the other tabs and leaves", async () => {
    const tab = aTabThatLeaves();
    let release!: (value: Response) => void;
    const fetch = vi.fn(() => new Promise<Response>((resolve) => (release = resolve)));
    vi.stubGlobal("fetch", fetch);
    const { isSigningOut, signOut, THIS_TAB } = await import("@/lib/auth");

    const done = signOut();
    expect(isSigningOut()).toBe(true);
    expect(tab.replace).not.toHaveBeenCalled(); // waiting for Accounts
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${ACCOUNTS}/passes/sign-out`);
    expect(init).toMatchObject({ method: "POST", credentials: "include" });

    release(answer(200, { signed_out: true }));
    await done;
    expect(posted).toEqual([{ kind: "signed_out", from: THIS_TAB }]);
    expect(tab.replace).toHaveBeenCalledWith("/login");
    expect(tab.cookies.value).toBe(""); // the proxy's hint goes with it
  });

  it("ends a support visit on Accounts' own page", async () => {
    const tab = aTabThatLeaves();
    vi.stubGlobal("fetch", vi.fn(async () => answer(200, { signed_out: true })));
    const { endSupportVisit } = await import("@/lib/auth");
    await endSupportVisit();
    expect(tab.replace).toHaveBeenCalledWith(`${ACCOUNTS}/support/ended`);
  });

  it("leaves even when Accounts does not answer", async () => {
    const tab = aTabThatLeaves();
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    const { signOut } = await import("@/lib/auth");
    await signOut();
    expect(tab.replace).toHaveBeenCalledWith("/login");
  });
});
