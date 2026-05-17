const cache = new Map<string, unknown>();

export function setRoutePrefetch(cacheKey: string, data: unknown): void {
  cache.set(cacheKey, data);
}

export function takeRoutePrefetch<T>(cacheKey: string): T | null {
  const value = cache.get(cacheKey);
  if (value === undefined) {
    return null;
  }
  cache.delete(cacheKey);
  return value as T;
}

export function peekRoutePrefetch<T>(cacheKey: string): T | null {
  const value = cache.get(cacheKey);
  return value === undefined ? null : (value as T);
}
