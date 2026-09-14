import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createInvalidationCoalescer } from "@/lib/websocket/coalesce-query-invalidations";
import { getQueryKeysToInvalidate, SOCKET_EVENTS } from "@/lib/websocket/socket-events";
import {
  orderEditorVariantsQueryKey,
  variantsListQueryKey,
} from "@/lib/query-keys";

/** Feed one socket event through the same path useStoreSocket uses. */
function receive(queryClient: QueryClient, event: string) {
  const coalescer = createInvalidationCoalescer(queryClient, { windowMs: 300 });
  coalescer.enqueue(getQueryKeysToInvalidate(event));
  vi.advanceTimersByTime(300);
  coalescer.dispose();
}

describe("socket events and the order editors' stock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([SOCKET_EVENTS.ORDER_CREATED, SOCKET_EVENTS.ORDER_UPDATED, SOCKET_EVENTS.PRODUCT_UPDATED])(
    "%s marks every cached order-editor variants entry stale",
    (event) => {
      const queryClient = new QueryClient();
      const editorKeys = ["p1", "p2", "p3"].map((id) => orderEditorVariantsQueryKey(id));
      for (const key of editorKeys) queryClient.setQueryData(key, []);
      const variantsPage = variantsListQueryKey("p1");
      queryClient.setQueryData(variantsPage, []);

      receive(queryClient, event);

      for (const key of editorKeys) {
        expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
      }
      // The Variants page caches are not the editors' and stay as they were.
      expect(queryClient.getQueryState(variantsPage)?.isInvalidated).toBe(false);
    },
  );

  it("keeps the existing invalidations for those events", () => {
    expect(getQueryKeysToInvalidate(SOCKET_EVENTS.ORDER_CREATED)).toEqual(
      expect.arrayContaining([["orders", "list"], ["nav-counts"], ["analytics", "overview"]]),
    );
    expect(getQueryKeysToInvalidate(SOCKET_EVENTS.ORDER_UPDATED)).toEqual(
      expect.arrayContaining([
        ["orders", "list"],
        ["nav-counts"],
        ["analytics", "overview"],
        ["inventory", "counts"],
        ["inventory", "list"],
      ]),
    );
    expect(getQueryKeysToInvalidate(SOCKET_EVENTS.PRODUCT_UPDATED)).toEqual(
      expect.arrayContaining([["products", "list"], ["nav-counts"], ["inventory", "counts"]]),
    );
    expect(getQueryKeysToInvalidate("unknown.event")).toEqual([]);
  });
});
