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
