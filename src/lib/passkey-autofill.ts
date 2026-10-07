/**
 * The sign-in page's quiet passkey request (owner, 2026-10-07): while the page is open, it asks the
 * device for a Paperbase passkey, and the device offers it in the email box's suggestions (the
 * iPhone's keyboard bar, Chrome's drop-down). Picking it signs in.
 *
 * Plain logic, so it is tested without a browser; hooks/usePasskeyAutofill runs it on the page.
 *
 * - A challenge lives five minutes on the API (WEBAUTHN_CHALLENGE_TTL_SECONDS), so the wait starts
 *   over every four.
 * - Only one passkey request can be open, so the page's button `stop`s this one before it asks,
 *   and `start`s it again if the button did not sign in.
 * - A wait that ends without a pick is quiet: the merchant never asked for anything. A pick that
 *   fails to sign in is reported. A dismissed Face ID, or a failed pick, is offered again a moment
 *   later; a request the browser refuses at once is not retried until the next refresh, so a
 *   browser that never allows it can not loop.
 */

export const PASSKEY_AUTOFILL_REFRESH_MS = 4 * 60 * 1000;
/** After a real wait ends (dismissed, failed), how soon the passkey is offered again. */
export const PASSKEY_AUTOFILL_RETRY_MS = 1000;
/** A wait that ended sooner than this was refused by the browser, not dismissed by a person. */
export const PASSKEY_AUTOFILL_REFUSED_MS = 2000;

export interface PasskeyAutofillHandlers {
  /** Whether this browser can offer passkeys in a box's suggestions. */
  available: () => Promise<boolean>;
  /** The whole sign-in: ask, wait for a pick (`onPicked`), check it, keep the tokens. */
  signIn: (onPicked: () => void) => Promise<unknown>;
  onSignedIn: () => void | Promise<void>;
  /** A picked passkey that did not sign in. */
  onError: (err: unknown) => void;
}

export interface PasskeyAutofill {
  start: () => Promise<void>;
  stop: () => void;
}

function errorName(err: unknown): string | undefined {
  return (err as { name?: string } | null)?.name;
}

/** `handlers` is read at each step, so a page can pass fresh callbacks on every render. */
export function createPasskeyAutofill(handlers: () => PasskeyAutofillHandlers): PasskeyAutofill {
  let run = 0; // which wait is current; an older one's timer or ending is ignored
  let timer: ReturnType<typeof setTimeout> | undefined;

  function clearTimer() {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  }

  function stop() {
    run += 1;
    clearTimer();
  }

  function later(mine: number, ms: number) {
    clearTimer();
    timer = setTimeout(() => {
      if (mine === run) void start();
    }, ms);
  }

  async function start(): Promise<void> {
    stop();
    const mine = run;
    if (!(await handlers().available()) || mine !== run) return;
    later(mine, PASSKEY_AUTOFILL_REFRESH_MS);

    const waitedFrom = Date.now();
    let picked = false;
    try {
      await handlers().signIn(() => {
        picked = true;
      });
    } catch (err) {
      // Ended by the button, a fresh wait, or leaving the page.
      if (mine !== run || errorName(err) === "AbortError") return;
      if (picked) {
        handlers().onError(err);
        later(mine, PASSKEY_AUTOFILL_RETRY_MS);
        return;
      }
      if (errorName(err) === "NotAllowedError" && Date.now() - waitedFrom >= PASSKEY_AUTOFILL_REFUSED_MS) {
        later(mine, PASSKEY_AUTOFILL_RETRY_MS);
      }
      // Anything else (offline, the API's limit) waits for the refresh.
      return;
    }
    stop();
    await handlers().onSignedIn();
  }

  return { start, stop };
}
