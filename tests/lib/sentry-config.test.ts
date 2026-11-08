/**
 * Which Sentry environment an event is filed under. Production is the only one
 * since the staging server was removed (2026-09-14): every real host is
 * production, and only a developer's own machine is development.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { baseOptions, resolveEnvironment } from "@/sentry-config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveEnvironment", () => {
  it("files the live dashboard under production", () => {
    expect(resolveEnvironment("dash.paperbase.me")).toBe("production");
  });

  it("files any other real host under production too: there is no staging any more", () => {
    expect(resolveEnvironment("staging.paperbase.me")).toBe("production");
    expect(resolveEnvironment("stg.example.com")).toBe("production");
  });

  it("files a developer's own machine under development", () => {
    expect(resolveEnvironment("localhost")).toBe("development");
    expect(resolveEnvironment("dash.localhost")).toBe("development");
    expect(resolveEnvironment("127.0.0.1")).toBe("development");
  });

  it("reads production when there is no host (the server side)", () => {
    expect(resolveEnvironment()).toBe("production");
  });

  it("lets an explicit setting win", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_ENVIRONMENT", "production");
    expect(resolveEnvironment("localhost")).toBe("production");
  });
});

/**
 * Sentry 11 collects everything it can unless told otherwise (its `dataCollection`
 * replaced `sendDefaultPii`). The dashboard carries merchant data, so it keeps what
 * Sentry 10 sent with `sendDefaultPii: false`: no people, cookies, bodies or local values.
 */
describe("baseOptions", () => {
  const options = baseOptions("dash.paperbase.me");

  it("sends no person, cookie, request body or local variable", () => {
    expect(options?.dataCollection).toMatchObject({
      userInfo: false,
      cookies: false,
      httpBodies: [],
      stackFrameVariables: false,
      databaseQueryData: false,
    });
  });

  it("drops the headers and query values that name a person's address", () => {
    const deny = { deny: expect.arrayContaining(["forwarded", "-ip", "remote-", "via", "-user"]) };
    expect(options?.dataCollection?.httpHeaders).toEqual({ request: deny, response: deny });
    expect(options?.dataCollection?.urlQueryParams).toEqual(deny);
  });

  it("reports errors only, grouped as before", () => {
    expect(options).toMatchObject({ tracesSampleRate: 0, attachStacktrace: false });
  });
});
