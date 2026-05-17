/** Pathname + search for stable route keys (no locale prefix). */
export function normalizeNavigationHref(href: string): string {
  const trimmed = href.trim();
  if (!trimmed) return "/";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      return `${url.pathname}${url.search}`;
    } catch {
      return "/";
    }
  }

  const pathAndQuery = trimmed.split("#")[0] ?? trimmed;
  if (pathAndQuery.startsWith("/")) {
    return pathAndQuery || "/";
  }
  return `/${pathAndQuery}`;
}

export function buildCurrentRouteKey(
  pathname: string,
  searchParams: URLSearchParams | null
): string {
  const qs = searchParams?.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function isSameNavigationRoute(
  href: string,
  pathname: string,
  searchParams: URLSearchParams | null
): boolean {
  const target = normalizeNavigationHref(href);
  const current = buildCurrentRouteKey(pathname, searchParams);
  return target === current;
}
