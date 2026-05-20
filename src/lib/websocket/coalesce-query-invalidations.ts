import type { QueryClient } from "@tanstack/react-query";

const DEFAULT_WINDOW_MS = 300;

export type InvalidationCoalescer = {
  enqueue: (queryKeys: string[][]) => void;
  dispose: () => void;
};

export function createInvalidationCoalescer(
  queryClient: QueryClient,
  options?: {
    windowMs?: number;
    onFlush?: () => void;
  }
): InvalidationCoalescer {
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;
  const onFlush = options?.onFlush;

  const pendingKeys = new Set<string>();
  let eventCount = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    timer = null;
    if (pendingKeys.size === 0) {
      eventCount = 0;
      return;
    }

    const events = eventCount;
    const uniqueKeys = pendingKeys.size;

    for (const serialized of pendingKeys) {
      const queryKey = JSON.parse(serialized) as string[];
      void queryClient.invalidateQueries({ queryKey });
    }

    pendingKeys.clear();
    eventCount = 0;

    if (process.env.NODE_ENV === "development") {
      console.debug("[ws-invalidate]", { events, uniqueKeys });
    }

    onFlush?.();
  };

  const scheduleFlush = () => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(flush, windowMs);
  };

  return {
    enqueue(queryKeys: string[][]) {
      if (queryKeys.length === 0) return;
      eventCount += 1;
      for (const queryKey of queryKeys) {
        pendingKeys.add(JSON.stringify(queryKey));
      }
      scheduleFlush();
    },
    dispose() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      if (pendingKeys.size > 0) {
        flush();
      }
    },
  };
}
