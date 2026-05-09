type IdleCallback = (deadline: { timeRemaining: () => number; didTimeout: boolean }) => void;

export function runWhenIdle(fn: () => void, timeoutMs = 800) {
  if (typeof window === "undefined") return;
  const ric = window.requestIdleCallback as ((cb: IdleCallback, opts?: { timeout: number }) => number) | undefined;
  if (typeof ric === "function") {
    ric(
      () => {
        fn();
      },
      { timeout: timeoutMs }
    );
    return;
  }
  window.setTimeout(fn, 0);
}

