/**
 * Just enough of a browser for lib/accounts in the tests (they run in Node): a tab's storage, its
 * address, its cookie hint and Accounts answering `fetch`. Each test stubs what it uses afresh.
 */
import { vi } from "vitest";

export const DASHBOARD = "https://dash.paperbase.me";
export const ACCOUNTS = "https://accounts.paperbase.me";

export function storage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, String(value)),
  };
}

/** A tab of the dashboard: its storage, address and cookies; `reload` is a spy. */
export function aTab({ signedIn = false }: { signedIn?: boolean } = {}) {
  const reload = vi.fn();
  const cookies = { value: signedIn ? "auth_session=1" : "" };
  vi.stubEnv("NEXT_PUBLIC_ACCOUNTS_URL", ACCOUNTS);
  vi.stubGlobal("sessionStorage", storage());
  vi.stubGlobal("localStorage", storage());
  vi.stubGlobal("window", { location: { origin: DASHBOARD, reload } });
  vi.stubGlobal("document", {
    get cookie() {
      return cookies.value;
    },
    set cookie(line: string) {
      const [pair] = line.split(";");
      cookies.value = pair.endsWith("=") ? "" : pair;
    },
  });
  return { reload, cookies };
}

/** A JWT-shaped value with these claims (unsigned: the page only reads them). */
export function jwt(claims: Record<string, unknown>): string {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "RS256", typ: "at+jwt" })}.${part(claims)}.signature`;
}

/** An entry pass for sign-in `sid` of `sub`, running out `seconds` from now. */
export function aPass({ sub = "usr_00000000000000000001", sid = "ses_00000000000000000001", seconds = 600, act }: {
  sub?: string;
  sid?: string;
  seconds?: number;
  act?: Record<string, unknown>;
} = {}): string {
  return jwt({ sub, sid, exp: Math.floor(Date.now() / 1000) + seconds, ...(act ? { act } : {}) });
}

/** A response as `fetch` gives it. */
export function answer(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
