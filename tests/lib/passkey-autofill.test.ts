/**
 * The sign-in page's quiet passkey request (owner, 2026-10-07): offered in the email box while the
 * page is open, started over before its challenge expires, quiet unless a picked passkey fails,
 * and never a loop.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createPasskeyAutofill,
  PASSKEY_AUTOFILL_REFRESH_MS,
  PASSKEY_AUTOFILL_RETRY_MS,
  type PasskeyAutofillHandlers,
} from "@/lib/passkey-autofill";

const named = (name: string) => Object.assign(new Error(name), { name });

/** A sign-in the test ends: `pick()` then `succeed()` / `fail(err)`, or `fail(err)` without a pick. */
function deferredSignIn() {
  const calls: { onPicked: () => void; resolve: () => void; reject: (e: unknown) => void }[] = [];
  const signIn = vi.fn(
    (onPicked: () => void) =>
      new Promise<void>((resolve, reject) => {
        calls.push({ onPicked, resolve, reject });
      })
  );
  return { signIn, calls, last: () => calls[calls.length - 1] };
}

function setup(available = true) {
  const s = deferredSignIn();
  const handlers: PasskeyAutofillHandlers = {
    available: vi.fn(async () => available),
    signIn: s.signIn,
    onSignedIn: vi.fn(),
    onError: vi.fn(),
  };
  const autofill = createPasskeyAutofill(() => handlers);
  return { ...s, handlers, autofill };
}

const flush = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("the quiet passkey request", () => {
  it("waits for a pick and signs in", async () => {
    const { autofill, signIn, last, handlers } = setup();
    void autofill.start();
    await flush();
    expect(signIn).toHaveBeenCalledTimes(1);
    last().onPicked();
    last().resolve();
    await flush();
    expect(handlers.onSignedIn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(PASSKEY_AUTOFILL_REFRESH_MS * 2);
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it("starts over before the API's five-minute challenge runs out", async () => {
    const { autofill, signIn, calls } = setup();
    void autofill.start();
    await flush();
    await vi.advanceTimersByTimeAsync(PASSKEY_AUTOFILL_REFRESH_MS);
    expect(signIn).toHaveBeenCalledTimes(2);
    expect(PASSKEY_AUTOFILL_REFRESH_MS).toBeLessThan(5 * 60 * 1000);
    // The old wait ends as the new one opens; that is not an error.
    calls[0].reject(named("AbortError"));
    await flush();
  });

  it("asks nothing of a browser that cannot offer passkeys in a box", async () => {
    const { autofill, signIn } = setup(false);
    await autofill.start();
    await vi.advanceTimersByTimeAsync(PASSKEY_AUTOFILL_REFRESH_MS * 2);
    expect(signIn).not.toHaveBeenCalled();
  });

  it("stays quiet when the page's button takes over, and stops for good on stop()", async () => {
    const { autofill, signIn, last, handlers } = setup();
    void autofill.start();
    await flush();
    autofill.stop();
    last().reject(named("AbortError"));
    await vi.advanceTimersByTimeAsync(PASSKEY_AUTOFILL_REFRESH_MS * 2);
    expect(signIn).toHaveBeenCalledTimes(1);
    expect(handlers.onError).not.toHaveBeenCalled();
  });

  it("reports a picked passkey that does not sign in, then offers it again", async () => {
    const { autofill, signIn, last, handlers } = setup();
    void autofill.start();
    await flush();
    last().onPicked();
    last().reject(new Error("This passkey is not recognized."));
    await flush();
    expect(handlers.onError).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(PASSKEY_AUTOFILL_RETRY_MS);
    expect(signIn).toHaveBeenCalledTimes(2);
  });

  it("offers it again soon after a dismissed Face ID", async () => {
    const { autofill, signIn, last, handlers } = setup();
    void autofill.start();
    await flush();
    await vi.advanceTimersByTimeAsync(5000); // a person looked, tapped, then cancelled
    last().reject(named("NotAllowedError"));
    await flush();
    await vi.advanceTimersByTimeAsync(PASSKEY_AUTOFILL_RETRY_MS);
    expect(signIn).toHaveBeenCalledTimes(2);
    expect(handlers.onError).not.toHaveBeenCalled();
  });

  it("never loops on a browser that refuses at once, or when it cannot reach the API", async () => {
    for (const err of [named("NotAllowedError"), new TypeError("Failed to fetch")]) {
      const { autofill, signIn, last, handlers } = setup();
      void autofill.start();
      await flush();
      last().reject(err);
      await vi.advanceTimersByTimeAsync(PASSKEY_AUTOFILL_REFRESH_MS - 1);
      expect(signIn).toHaveBeenCalledTimes(1);
      expect(handlers.onError).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      expect(signIn).toHaveBeenCalledTimes(2);
      autofill.stop();
    }
  });
});
