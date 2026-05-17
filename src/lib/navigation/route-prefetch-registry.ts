import api from "@/lib/api";
import { getBasicAnalyticsOverview } from "@/lib/basicAnalyticsService";
import { todayYmdInBD } from "@/utils/time";
import type { PaginatedResponse } from "@/types";
import { normalizeNavigationHref } from "@/lib/navigation/normalize-navigation-href";
import { setRoutePrefetch } from "@/lib/navigation/route-prefetch-cache";

export type RoutePrefetchFn = (signal?: AbortSignal) => Promise<void>;

function withSignal<T>(
  promise: Promise<T>,
  signal?: AbortSignal
): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (v) => {
        signal.removeEventListener("abort", onAbort);
        resolve(v);
      },
      (e) => {
        signal.removeEventListener("abort", onAbort);
        reject(e);
      }
    );
  });
}

async function prefetchList<T>(
  cacheKey: string,
  url: string,
  params?: Record<string, string | number>,
  signal?: AbortSignal
): Promise<void> {
  const { data } = await withSignal(
    api.get<PaginatedResponse<T>>(url, { params, signal }),
    signal
  );
  setRoutePrefetch(cacheKey, data);
}

async function prefetchRaw<T>(
  cacheKey: string,
  url: string,
  signal?: AbortSignal
): Promise<void> {
  const { data } = await withSignal(api.get<T>(url, { signal }), signal);
  setRoutePrefetch(cacheKey, data);
}

const STATIC_PREFETCH: Record<string, RoutePrefetchFn> = {
  "/": async (signal) => {
    const iso = todayYmdInBD(new Date());
    const data = await withSignal(
      getBasicAnalyticsOverview({
        start_date: iso,
        end_date: iso,
        bucket: "hour",
      }),
      signal
    );
    setRoutePrefetch("/", data);
  },
  "/orders": (signal) => prefetchList("/orders", "admin/orders/", {}, signal),
  "/products": (signal) => prefetchList("/products", "admin/products/", {}, signal),
  "/customers": (signal) =>
    prefetchList("/customers", "admin/customers/", { page: 1 }, signal),
  "/categories": (signal) =>
    prefetchRaw("/categories", "admin/categories/?tree=1", signal),
  "/inventory": (signal) =>
    prefetchList("/inventory", "admin/inventory/", {}, signal),
  "/support-tickets": (signal) =>
    prefetchList("/support-tickets", "admin/support-tickets/", { page: 1 }, signal),
  "/trash": (signal) => prefetchList("/trash", "admin/trash/", { page: 1 }, signal),
  "/blog": (signal) => prefetchList("/blog", "admin/blogs/", { page: 1 }, signal),
  "/banners": (signal) => prefetchRaw("/banners", "admin/banners/", signal),
  "/popup": (signal) => prefetchRaw("/popup", "admin/popups/", signal),
  "/cta": (signal) => prefetchRaw("/cta", "admin/notifications/", signal),
  "/shipping": async (signal) => {
    const [zones, methods, rates] = await withSignal(
      Promise.all([
        api.get("admin/shipping-zones/", { signal }),
        api.get("admin/shipping-methods/", { signal }),
        api.get("admin/shipping-rates/", { signal }),
      ]),
      signal
    );
    setRoutePrefetch("/shipping", { zones: zones.data, methods: methods.data, rates: rates.data });
  },
  "/product-attributes": (signal) =>
    prefetchList("/product-attributes", "admin/product-attributes/", { page: 1 }, signal),
  "/variants": (signal) =>
    prefetchList("/variants", "admin/products/", { page: 1, page_size: 50 }, signal),
  "/activities": (signal) =>
    prefetchList("/activities", "admin/activities/", { page: 1 }, signal),
  "/analytics": async (signal) => {
    const range = "7d";
    const [overview, pages, parcels, devices] = await withSignal(
      Promise.all([
        api.get(`admin/analytics/overview/?range=${range}`, { signal }),
        api.get(`admin/analytics/pages/?range=${range}`, { signal }),
        api.get(`admin/analytics/parcels/?range=${range}`, { signal }),
        api.get(`admin/analytics/devices/?range=${range}`, { signal }),
      ]),
      signal
    );
    setRoutePrefetch("/analytics", {
      overview: overview.data,
      pages: pages.data,
      parcels: parcels.data,
      devices: devices.data,
      range,
    });
  },
  "/settings": (signal) =>
    prefetchRaw("/settings", "store/settings/current/", signal),
  "/products/new": (signal) =>
    prefetchRaw("/products/new", "admin/categories/?tree=1", signal),
  "/orders/new": async (signal) => {
    const [zones, methods] = await withSignal(
      Promise.all([
        api.get("admin/shipping-zones/", { signal }),
        api.get("admin/shipping-methods/", { signal }),
      ]),
      signal
    );
    setRoutePrefetch("/orders/new", {
      zones: zones.data,
      methods: methods.data,
    });
  },
  "/blog/new": async () => {},
};

type DynamicMatcher = {
  test: (path: string) => RegExpMatchArray | null;
  prefetch: (match: RegExpMatchArray, signal?: AbortSignal) => Promise<void>;
};

const DYNAMIC_PREFETCH: DynamicMatcher[] = [
  {
    test: (path) => path.match(/^\/orders\/([^/]+)$/),
    prefetch: async (match, signal) => {
      const id = match[1]!;
      const key = `/orders/${id}`;
      await prefetchRaw(key, `admin/orders/${id}/`, signal);
    },
  },
  {
    test: (path) => path.match(/^\/products\/([^/]+)$/),
    prefetch: async (match, signal) => {
      const id = match[1]!;
      const key = `/products/${id}`;
      const [product, categories] = await withSignal(
        Promise.all([
          api.get(`admin/products/${id}/`, { signal }),
          api.get("admin/categories/?tree=1", { signal }),
        ]),
        signal
      );
      setRoutePrefetch(key, {
        product: product.data,
        categories: categories.data,
      });
    },
  },
  {
    test: (path) => path.match(/^\/products\/([^/]+)\/edit$/),
    prefetch: async (match, signal) => {
      const id = match[1]!;
      const key = `/products/${id}/edit`;
      await prefetchRaw(key, `admin/products/${id}/`, signal);
    },
  },
  {
    test: (path) => path.match(/^\/customers\/([^/]+)$/),
    prefetch: async (match, signal) => {
      const id = match[1]!;
      const key = `/customers/${id}`;
      await prefetchRaw(key, `admin/customers/${id}/`, signal);
    },
  },
  {
    test: (path) => path.match(/^\/support-tickets\/([^/]+)$/),
    prefetch: async (match, signal) => {
      const id = match[1]!;
      const key = `/support-tickets/${id}`;
      await prefetchRaw(key, `admin/support-tickets/${id}/`, signal);
    },
  },
  {
    test: (path) => path.match(/^\/blog\/([^/]+)\/edit$/),
    prefetch: async (match, signal) => {
      const id = match[1]!;
      const key = `/blog/${id}/edit`;
      await prefetchRaw(key, `admin/blogs/${id}/`, signal);
    },
  },
];

function prefetchOrdersList(normalized: string, signal?: AbortSignal): Promise<void> {
  const query = normalized.includes("?")
    ? new URLSearchParams(normalized.split("?")[1] ?? "")
    : new URLSearchParams();
  const params: Record<string, string> = {};
  const customer = query.get("customer");
  if (customer) params.customer = customer;
  return prefetchList("/orders", "admin/orders/", params, signal);
}

export function getPrefetchFn(
  href: string,
  routerPrefetch?: (href: string) => void
): RoutePrefetchFn {
  const normalized = normalizeNavigationHref(href);
  const pathOnly = normalized.split("?")[0] ?? normalized;

  if (pathOnly === "/orders" && normalized.includes("?")) {
    return (signal) => prefetchOrdersList(normalized, signal).catch(() => undefined);
  }

  const staticFn = STATIC_PREFETCH[pathOnly];
  if (staticFn) {
    return (signal) => staticFn(signal).catch(() => undefined);
  }

  if (pathOnly.startsWith("/settings")) {
    return (signal) =>
      prefetchRaw(normalized, "store/settings/current/", signal).catch(() => undefined);
  }

  for (const matcher of DYNAMIC_PREFETCH) {
    const match = matcher.test(pathOnly);
    if (match) {
      return (signal) => matcher.prefetch(match, signal).catch(() => undefined);
    }
  }

  return async () => {
    routerPrefetch?.(normalized);
  };
}
