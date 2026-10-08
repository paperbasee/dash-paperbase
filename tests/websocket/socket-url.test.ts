/**
 * The live socket's address (lib/websocket/socket-client): the pass as `token` -- a browser cannot
 * set headers on a socket -- and the shop the dashboard works in as `store`, since passes carry
 * none (api engine/core/ws_jwt.py).
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildSocketUrl } from "@/lib/websocket/socket-client";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the socket's address", () => {
  it("carries the pass and names the shop", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.paperbase.me/api/v1");
    const url = new URL(buildSocketUrl({ pass: "a.b.c", shop: "str_1" }));
    expect(`${url.origin}${url.pathname}`).toBe("wss://api.paperbase.me/ws/v1/store/events/");
    expect(Object.fromEntries(url.searchParams)).toEqual({ token: "a.b.c", store: "str_1" });
  });

  it("names no shop when none is chosen (an owner's is their own)", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000/api/v1");
    const url = new URL(buildSocketUrl({ pass: "a.b.c", shop: null }));
    expect(url.protocol).toBe("ws:");
    expect(url.searchParams.has("store")).toBe(false);
  });
});
