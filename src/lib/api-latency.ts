/**
 * Rolling window of real fetch() durations from api.ts's request choke point —
 * the same traffic that already drives the dashboard's "API: nominal" status.
 * Averaged over a few samples so one heavy analytics call doesn't spike the
 * reading; not a synthetic ping.
 */
const MAX_SAMPLES = 5;
const samples: number[] = [];
const listeners = new Set<() => void>();

export function recordApiLatency(ms: number): void {
  samples.push(ms);
  if (samples.length > MAX_SAMPLES) samples.shift();
  listeners.forEach((listener) => listener());
}

export function getApiLatencySnapshot(): number | null {
  if (samples.length === 0) return null;
  const avg = samples.reduce((sum, ms) => sum + ms, 0) / samples.length;
  return Math.round(avg);
}

export function subscribeApiLatency(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
