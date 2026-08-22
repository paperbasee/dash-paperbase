import type { AnalyticsBucket } from "@/lib/basicAnalyticsService";

export const brandingQueryKey = ["branding", "admin"] as const;

export const navCountsQueryKey = ["nav-counts"] as const;

export const featuresQueryKey = ["features"] as const;

export const myPermissionsQueryKey = ["me", "permissions"] as const;
export const teamRolesQueryKey = ["team", "roles"] as const;
export const teamMembersQueryKey = ["team", "members"] as const;
export const teamInvitesQueryKey = ["team", "invites"] as const;

export const systemNotificationActiveQueryKey = ["system-notifications", "active"] as const;

export const inventoryCountsQueryKey = ["inventory", "counts"] as const;

/** @deprecated Use inventoryCountsQueryKey */
export const inventoryStatusQueryKey = inventoryCountsQueryKey;

export const dashboardAnalyticsQueryKeyRoot = ["analytics", "overview"] as const;

export function dashboardAnalyticsQueryKey(filters: {
  startDate: string;
  endDate: string;
  bucket: AnalyticsBucket;
}) {
  return [...dashboardAnalyticsQueryKeyRoot, filters] as const;
}

export const advancedAnalyticsQueryKeyRoot = ["analytics", "advanced"] as const;

export function analyticsOverviewQueryKey(range: string) {
  return [...advancedAnalyticsQueryKeyRoot, "overview", range] as const;
}

export function analyticsPageviewsQueryKey(range: string) {
  return [...advancedAnalyticsQueryKeyRoot, "pageviews", range] as const;
}

export function analyticsRevenueQueryKey(range: string) {
  return [...advancedAnalyticsQueryKeyRoot, "revenue", range] as const;
}

export function analyticsPagesQueryKey(range: string) {
  return [...advancedAnalyticsQueryKeyRoot, "pages", range] as const;
}

export function analyticsProductsQueryKey(range: string) {
  return [...advancedAnalyticsQueryKeyRoot, "products", range] as const;
}

export function analyticsParcelsQueryKey(range: string) {
  return [...advancedAnalyticsQueryKeyRoot, "parcels", range] as const;
}

export function analyticsDevicesQueryKey(range: string) {
  return [...advancedAnalyticsQueryKeyRoot, "devices", range] as const;
}

export function analyticsUtmQueryKey(range: string, dimension: string) {
  return [...advancedAnalyticsQueryKeyRoot, "utm", range, dimension] as const;
}

export const shippingZonesQueryKey = ["shipping", "zones"] as const;

export const shippingMethodsQueryKey = ["shipping", "methods"] as const;

export const shippingRatesQueryKey = ["shipping", "rates"] as const;

export const ordersListQueryKeyRoot = ["orders", "list"] as const;

export type OrdersListParams = Record<string, string>;

export function ordersListQueryKey(params: OrdersListParams) {
  return [...ordersListQueryKeyRoot, params] as const;
}

export function orderDetailQueryKey(publicId: string) {
  return ["orders", "detail", publicId] as const;
}

export const productsListQueryKeyRoot = ["products", "list"] as const;

export type ProductsListParams = Record<string, string>;

export function productsListQueryKey(params: ProductsListParams) {
  return [...productsListQueryKeyRoot, params] as const;
}

export function productDetailQueryKey(publicId: string) {
  return ["products", "detail", publicId] as const;
}

export const customersListQueryKeyRoot = ["customers", "list"] as const;

export type CustomersListParams = Record<string, string | number>;

export function customersListQueryKey(params: CustomersListParams) {
  return [...customersListQueryKeyRoot, params] as const;
}

export function customerDetailQueryKey(publicId: string) {
  return ["customers", "detail", publicId] as const;
}

export type InventoryListParams = Record<string, string | number>;

export const inventoryListQueryKey = (params?: InventoryListParams) =>
  ["inventory", "list", ...(params ? [params] : [])] as const;

export type SupportTicketsListParams = Record<string, string | number>;

export const supportTicketsListQueryKey = (params?: SupportTicketsListParams) =>
  ["support-tickets", "list", ...(params ? [params] : [])] as const;

export const supportTicketDetailQueryKey = (publicId: string) =>
  ["support-tickets", "detail", publicId] as const;

export const categoriesQueryKey = ["categories"] as const;

export const variantsQueryKeyRoot = ["variants"] as const;

export const variantsProductsQueryKey = [...variantsQueryKeyRoot, "products"] as const;

export const variantsAttributesQueryKey = [...variantsQueryKeyRoot, "attributes"] as const;

export function variantsListQueryKey(productId: string) {
  return [...variantsQueryKeyRoot, "list", productId] as const;
}

export const notificationsQueryKey = ["notifications"] as const;

export const popupsQueryKey = ["popups"] as const;

export const bannersQueryKey = ["banners"] as const;

export const blogsListQueryKeyRoot = ["blogs", "list"] as const;

export type BlogsListParams = Record<string, string>;

export function blogsListQueryKey(params?: BlogsListParams) {
  return [...blogsListQueryKeyRoot, ...(params ? [params] : [])] as const;
}

export function blogDetailQueryKey(publicId: string) {
  return ["blogs", "detail", publicId] as const;
}

export const blogTagsQueryKey = ["blog-tags"] as const;

export function trashQueryKey(page: number) {
  return ["trash", "list", page] as const;
}

export const couriersQueryKey = ["couriers"] as const;

export const checkoutSettingsQueryKey = ["checkout-settings"] as const;

export const apiKeysQueryKey = ["api-keys"] as const;

export const marketingIntegrationsQueryKey = ["marketing-integrations"] as const;

export const storeSettingsCurrentQueryKey = ["store-settings", "current"] as const;

export const emailNotificationPrefsQueryKey = storeSettingsCurrentQueryKey;

export const themeQueryKey = ["theming"] as const;

export const themePresetsQueryKey = ["theming", "presets"] as const;
