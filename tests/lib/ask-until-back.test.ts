/**
 * The waiting page's asking (owner, 2026-10-09: "Try now ... Checking again in 12 seconds"): at
 * once, then every 15 seconds counted down; Try now asks at once; offline, the count waits.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { askUntilBack, healthSaysUp } from "@/lib/ask-until-back";

function start(answer: () => boolean, online = () => true) {
  const seen = { asks: 0, back: 0, counts: [] as number[], checking: [] as boolean[] };
  const asking = askUntilBack({
    answers: async () => {
      seen.asks += 1;
      return answer();
    },
    everyS: 15,
    online,
    onBack: () => (seen.back += 1),
    onCount: (s) => seen.counts.push(s),
    onChecking: (c) => seen.checking.push(c),
  });
  return { seen, asking };
}

describe("askUntilBack", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("asks at once, then counts 15 seconds down and asks again", async () => {
    const { seen, asking } = start(() => false);
    await vi.advanceTimersByTimeAsync(0);
    expect(seen.asks).toBe(1);
    expect(seen.counts).toEqual([15]);
    expect(seen.checking).toEqual([true, false]);

    await vi.advanceTimersByTimeAsync(14_000);
    expect(seen.counts.at(-1)).toBe(1);
    expect(seen.asks).toBe(1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(seen.asks).toBe(2);
    expect(seen.counts.at(-1)).toBe(15);
    asking.stop();
  });

  it("Try now asks at once and starts the count again, but never two asks at a time", async () => {
    let reply: (v: boolean) => void = () => {};
    const seen = { asks: 0, counts: [] as number[] };
    const asking = askUntilBack({
      answers: () => {
        seen.asks += 1;
        return new Promise<boolean>((resolve) => (reply = resolve));
      },
      everyS: 15,
      online: () => true,
      onBack: () => {},
      onCount: (s) => seen.counts.push(s),
      onChecking: () => {},
    });
    // The first ask is still out: Try now does not send a second.
    asking.now();
    expect(seen.asks).toBe(1);
    reply(false);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(seen.counts.at(-1)).toBe(10);

    asking.now();
    expect(seen.asks).toBe(2);
    reply(false);
    await vi.advanceTimersByTimeAsync(0);
    expect(seen.counts.at(-1)).toBe(15);
    asking.stop();
  });

  it("once it answers, the page leaves and nothing more is asked", async () => {
    const { seen, asking } = start(() => true);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(seen.back).toBe(1);
    expect(seen.asks).toBe(1);
    asking.stop();
  });

  it("offline, the count stands still and nothing is asked", async () => {
    let online = false;
    const { seen, asking } = start(() => false, () => online);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(seen.asks).toBe(1);
    expect(seen.counts).toEqual([15]);

    online = true;
    await vi.advanceTimersByTimeAsync(2_000);
    expect(seen.counts.at(-1)).toBe(13);
    asking.stop();
  });

  it("stops: no ask, no count after the page goes", async () => {
    const { seen, asking } = start(() => false);
    await vi.advanceTimersByTimeAsync(0);
    asking.stop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(seen.asks).toBe(1);
    expect(seen.counts).toEqual([15]);
  });
});

describe("healthSaysUp", () => {
  afterEach(() => vi.unstubAllGlobals());

  const answer = (status: number, body: string) =>
    vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status, headers: { "Content-Type": "application/json" } })));

  it("is up only on the part's own ok, read in full", async () => {
    answer(200, '{"status": "ok"}');
    expect(await healthSaysUp("https://accounts.example.test/health", new AbortController().signal)).toBe(true);
  });

  it("is not up on the proxy's own error page while the part restarts", async () => {
    // Switch night (2026-10-09): asked without reading, Traefik's 502 counted as "back" and the
    // waiting page reloaded the dashboard again and again. Unreadable (no CORS header), the
    // browser refuses it: fetch throws.
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    expect(await healthSaysUp("https://accounts.example.test/health", new AbortController().signal)).toBe(false);
  });

  it("is not up on the part's own 503, nor on anything that is not its ok", async () => {
    answer(503, '{"status": "error", "detail": "database unavailable"}');
    expect(await healthSaysUp("https://accounts.example.test/health", new AbortController().signal)).toBe(false);
    answer(200, "<html>Bad Gateway</html>");
    expect(await healthSaysUp("https://accounts.example.test/health", new AbortController().signal)).toBe(false);
  });

  it("asks as an ordinary page would, never blind", async () => {
    answer(200, '{"status": "ok"}');
    await healthSaysUp("https://accounts.example.test/health", new AbortController().signal);
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(init?.mode).not.toBe("no-cors");
  });
});
