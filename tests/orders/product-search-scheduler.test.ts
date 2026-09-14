import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProductSearchScheduler } from "@/lib/orders/product-search-scheduler";
import type { Product } from "@/types";

const product = (name: string) => ({ public_id: name, name }) as Product;

function setup() {
  const requests: Array<{
    query: string;
    signal: AbortSignal;
    resolve: (results: Product[]) => void;
    reject: (err: unknown) => void;
  }> = [];
  const request = vi.fn(
    (query: string, signal: AbortSignal) =>
      new Promise<Product[]>((resolve, reject) => {
        requests.push({ query, signal, resolve, reject });
      }),
  );
  const state = { results: [] as Product[], searching: false, errors: 0, cleared: 0 };
  const scheduler = createProductSearchScheduler(request, {
    onSearching: () => {
      state.searching = true;
    },
    onResults: (results) => {
      state.results = results;
    },
    onError: () => {
      state.errors += 1;
      state.results = [];
    },
    onSettled: () => {
      state.searching = false;
    },
    onCleared: () => {
      state.cleared += 1;
      state.results = [];
    },
  });
  return { request, requests, state, scheduler };
}

/** Type `text` one character at a time, 80ms apart (a normal typing speed). */
function typeText(scheduler: { search: (v: string) => void }, text: string) {
  for (let i = 1; i <= text.length; i++) {
    scheduler.search(text.slice(0, i));
    vi.advanceTimersByTime(80);
  }
}

describe("order edit product search", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends one search per pause in typing, not one per keystroke", () => {
    const short = setup();
    typeText(short.scheduler, "cott");
    vi.advanceTimersByTime(1000);

    const long = setup();
    typeText(long.scheduler, "cotton t-shirt ");
    vi.advanceTimersByTime(1000);

    expect(short.request).toHaveBeenCalledTimes(1);
    expect(long.request.mock.calls.length).toBe(short.request.mock.calls.length);
    expect(long.request).toHaveBeenLastCalledWith("cotton t-shirt", expect.any(AbortSignal));
  });

  it("drops a slower, older response instead of overwriting newer results", async () => {
    const { requests, state, scheduler } = setup();
    scheduler.search("ab");
    vi.advanceTimersByTime(1000);
    scheduler.search("abc");
    vi.advanceTimersByTime(1000);
    expect(requests).toHaveLength(2);

    requests[1].resolve([product("newer")]);
    await vi.runAllTimersAsync();
    requests[0].resolve([product("older")]);
    await vi.runAllTimersAsync();

    expect(state.results.map((p) => p.name)).toEqual(["newer"]);
    expect(state.searching).toBe(false);
    expect(state.errors).toBe(0);
  });

  it("clears without searching for queries under two characters", () => {
    const { request, state, scheduler } = setup();
    scheduler.search("a");
    vi.advanceTimersByTime(1000);
    expect(request).not.toHaveBeenCalled();
    expect(state.cleared).toBe(1);
  });
});
