import type { Product } from "@/types";

export type ProductSearchRequest = (query: string, signal: AbortSignal) => Promise<Product[]>;

export type ProductSearchHandlers = {
  /** A search for a 2+ character query is pending (called as soon as the user types). */
  onSearching: () => void;
  onResults: (results: Product[]) => void;
  onError: (err: unknown) => void;
  /** The latest search finished (success or failure). */
  onSettled: () => void;
  /** The query dropped under two characters: nothing to search. */
  onCleared: () => void;
};

/** Same pause as the new-order product search (useNewOrder). */
export const PRODUCT_SEARCH_DEBOUNCE_MS = 300;

/**
 * Debounced product search where only the newest query may write results: every keystroke
 * cancels the pending timer and aborts the in-flight request, so a slow older response can never
 * overwrite newer results.
 */
export function createProductSearchScheduler(
  request: ProductSearchRequest,
  handlers: ProductSearchHandlers,
  delayMs: number = PRODUCT_SEARCH_DEBOUNCE_MS,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: AbortController | undefined;

  function cancel() {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    inFlight?.abort();
    inFlight = undefined;
  }

  function search(value: string) {
    cancel();
    const query = value.trim();
    if (query.length < 2) {
      handlers.onCleared();
      return;
    }
    handlers.onSearching();
    timer = setTimeout(() => {
      timer = undefined;
      const controller = new AbortController();
      inFlight = controller;
      request(query, controller.signal).then(
        (results) => {
          if (controller.signal.aborted) return;
          inFlight = undefined;
          handlers.onResults(results);
          handlers.onSettled();
        },
        (err: unknown) => {
          if (controller.signal.aborted) return;
          inFlight = undefined;
          handlers.onError(err);
          handlers.onSettled();
        },
      );
    }, delayMs);
  }

  return { search, cancel };
}
