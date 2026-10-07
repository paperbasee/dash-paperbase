"use client";

import { useEffect, useMemo, useRef } from "react";

import { createPasskeyAutofill, type PasskeyAutofill, type PasskeyAutofillHandlers } from "@/lib/passkey-autofill";
import { passkeyAutofillAvailable, stopPasskeyAutofill } from "@/lib/passkeys";

/**
 * The device's passkey offered in the sign-in email box while `active` (lib/passkey-autofill).
 * Returns `pause` and `resume` for the page's own passkey button, which must have the only open
 * request while it runs.
 */
export function usePasskeyAutofill({
  active,
  signIn,
  onSignedIn,
  onError,
}: {
  active: boolean;
  signIn: PasskeyAutofillHandlers["signIn"];
  onSignedIn: PasskeyAutofillHandlers["onSignedIn"];
  onError: PasskeyAutofillHandlers["onError"];
}): { pause: () => void; resume: () => void } {
  const latest = useRef<PasskeyAutofillHandlers>({ available: passkeyAutofillAvailable, signIn, onSignedIn, onError });
  useEffect(() => {
    latest.current = { available: passkeyAutofillAvailable, signIn, onSignedIn, onError };
  });

  const autofill = useMemo<PasskeyAutofill>(() => createPasskeyAutofill(() => latest.current), []);

  useEffect(() => {
    if (!active) return;
    void autofill.start();
    return () => {
      autofill.stop();
      stopPasskeyAutofill();
    };
  }, [active, autofill]);

  return useMemo(
    () => ({
      pause: () => autofill.stop(),
      resume: () => {
        if (active) void autofill.start();
      },
    }),
    [active, autofill]
  );
}
