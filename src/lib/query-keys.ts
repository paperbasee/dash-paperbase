import type { AnalyticsBucket } from "@/lib/basicAnalyticsService";

export const brandingQueryKey = ["branding", "admin"] as const;

export function dashboardAnalyticsQueryKey(filters: {
  startDate: string;
  endDate: string;
  bucket: AnalyticsBucket;
}) {
  return ["analytics", "overview", filters] as const;
}

export type OrdersListParams = Record<string, string>;

export function ordersListQueryKey(params: OrdersListParams) {
  return ["orders", "list", params] as const;
}

export type ProductsListParams = Record<string, string>;

export function productsListQueryKey(params: ProductsListParams) {
  return ["products", "list", params] as const;
}

export type CustomersListParams = Record<string, string | number>;

export function customersListQueryKey(params: CustomersListParams) {
  return ["customers", "list", params] as const;
}
