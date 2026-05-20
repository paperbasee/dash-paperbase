import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createInvalidationCoalescer } from "@/lib/websocket/coalesce-query-invalidations";

describe("createInvalidationCoalescer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("coalesces multiple enqueues into one flush with deduped keys", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const onFlush = vi.fn();

    const coalescer = createInvalidationCoalescer(queryClient, {
      windowMs: 300,
      onFlush,
    });

    coalescer.enqueue([["nav-counts"]]);
    coalescer.enqueue([["nav-counts"], ["analytics", "overview"]]);
    coalescer.enqueue([["inventory-status"]]);

    expect(invalidate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(invalidate).toHaveBeenCalledTimes(3);
    expect(onFlush).toHaveBeenCalledTimes(1);
  });

  it("flushes pending keys on dispose", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    const coalescer = createInvalidationCoalescer(queryClient, { windowMs: 300 });

    coalescer.enqueue([["nav-counts"]]);
    coalescer.dispose();

    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["nav-counts"] });
  });

  it("ignores empty query key lists", () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    const coalescer = createInvalidationCoalescer(queryClient, { windowMs: 300 });

    coalescer.enqueue([]);
    vi.advanceTimersByTime(300);

    expect(invalidate).not.toHaveBeenCalled();
  });
});
