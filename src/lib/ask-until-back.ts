/**
 * The waiting page's asking (server-unreachable/page.tsx): whether the part of Paperbase that was
 * away answers again -- at once, then every `everyS` seconds, counted down a second at a time so
 * the page can say when. Offline, the count stands still (the page asks when the device is back
 * online). One ask at a time: Try now while one is out does not send another.
 */
export function askUntilBack(o: {
  answers: (signal: AbortSignal) => Promise<boolean>;
  everyS: number;
  online: () => boolean;
  /** It answered: the page leaves, and nothing more is asked. */
  onBack: () => void;
  onCount: (secondsLeft: number) => void;
  onChecking: (checking: boolean) => void;
}): { now: () => void; stop: () => void } {
  const controller = new AbortController();
  let busy = false;
  let wait = o.everyS;

  const ask = async () => {
    if (busy) return;
    busy = true;
    o.onChecking(true);
    if (await o.answers(controller.signal)) {
      o.onBack();
      return;
    }
    if (controller.signal.aborted) return;
    busy = false;
    wait = o.everyS;
    o.onCount(wait);
    o.onChecking(false);
  };

  const timer = setInterval(() => {
    if (busy || !o.online()) return;
    if (wait > 1) o.onCount(--wait);
    else void ask();
  }, 1000);
  void ask();

  return {
    now: () => void ask(),
    stop: () => {
      controller.abort();
      clearInterval(timer);
    },
  };
}

/**
 * Whether a part's `/health` says it is up: its own `{"status": "ok"}`, read in full. Asked as an
 * ordinary page asks, never blind (`no-cors`): blind, a proxy's error page while the part restarts
 * counted as "back", and the waiting page reloaded the dashboard again and again (switch night,
 * 2026-10-09). The API's and Accounts' answers let the dashboard read them; a proxy's does not,
 * and the browser refuses it.
 */
export async function healthSaysUp(url: string, signal: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch(url, { signal, cache: "no-store" });
    if (!response.ok) return false;
    const body: unknown = await response.json();
    return typeof body === "object" && body !== null && (body as { status?: unknown }).status === "ok";
  } catch {
    return false;
  }
}
