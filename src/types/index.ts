/** Social profile URLs for storefront; keys align with `GET/PATCH admin/branding/` `social_links`. */
export type BrandingSocialLinks = Partial<
  Record<
    | "facebook"
    | "instagram"
    | "whatsapp"
    | "tiktok",
    string
  >
>;

export interface Branding {
  public_id: string;
  logo_url: string | null;
  admin_name: string;
  owner_name: string;
  owner_email: string;
  currency_symbol: string;
  store_type: string;
  contact_email: string;
  phone: string;
  address: string;
  language?: "en" | "bn";
  social_links?: BrandingSocialLinks;
  brand_showcase?: Array<{
    public_id: string;
    name: string;
    slug: string;
    image_url: string | null;
    redirect_url: string;
    brand_type: string;
    order: number;
    is_active: boolean;
  }>;
}

/** Variant option row on order line items (storefront); admin may use variant_option_labels instead. */
export interface OrderItemVariantOption {
  attribute_public_id: string;
  attribute_slug: string;
  attribute_name: string;
  value_public_id: string;
  value: string;
}

export interface OrderItem {
  public_id: string;
  product?: { public_id: string; name: string } | null;
  product_public_id: string | null;
  product_name: string;
  product_name_snapshot?: string;
  variant_snapshot?: string | null;
  status?: "active" | "deleted";
  is_unavailable?: boolean;
  product_brand?: string;
  product_image: string | null;
  variant_public_id?: string | null;
  variant_sku?: string | null;
  variant_inventory_quantity?: number | null;
  variant_option_labels?: string[];
  /** Present on storefront order create responses; admin detail may omit. */
  variant_options?: OrderItemVariantOption[] | null;
  quantity: number;
  unit_price: string;
  unit_price_snapshot?: string;
  original_price: string;
  discount_amount: string;
  line_subtotal: string;
  line_total: string;
  /** Live catalog sell price (admin order detail); null if product removed. */
  catalog_unit_price?: string | null;
  /** Live list/MSRP used for discount display; mirrors catalog at read time. */
  catalog_list_price?: string | null;
}

/** Response from POST admin/orders/pricing-preview/ */
export interface OrderPricingPreview {
  subtotal_before_discount: string;
  discount_total: string;
  subtotal_after_discount: string;
  shipping_cost: string;
  total: string;
  lines?: Array<Record<string, string | number>>;
}

export type OrderStatus =
  | "pending"
  | "payment_pending"
  | "confirmed"
  | "cancelled";

export type OrderPaymentStatus =
  | "none"
  | "submitted"
  | "verified"
  | "failed";

export interface Order {
  public_id: string;
  order_number: string;
  user_public_id?: string | null;
  email: string;
  status: OrderStatus | string;
  payment_status?: OrderPaymentStatus;
  transaction_id?: string | null;
  payer_number?: string | null;
  flag?: string | null;
  subtotal_before_discount: string;
  discount_total: string;
  subtotal_after_discount: string;
  shipping_cost?: string;
  shipping_zone_public_id?: string | null;
  shipping_method_public_id?: string | null;
  total: string;
  shipping_name: string;
  shipping_address: string;
  phone: string;
  district: string;
  courier_provider?: string;
  courier_consignment_id?: string;
  sent_to_courier?: boolean;
  courier_dispatch_pending?: boolean;
  dispatched_by_autopilot?: boolean;
  customer_confirmation_sent_at?: string | null;
  delivery_status:
    | "not_dispatched"
    | "in_transit"
    | "delivered"
    | "partial_delivered"
    | "cancelled"
    | "unknown";
  delivery_status_updated_at: string | null;
  last_tracking_message: string;
  items?: OrderItem[];
  items_count?: number;
  has_unavailable_products?: boolean;
  unavailable_products_count?: number;
  /** True when created after the user's last orders-page visit (admin list only). */
  is_new?: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Admin product list/detail (`/api/v1/admin/products/`). Storefront shapes differ — see `StorefrontProductListItem` in `./storefront-api`.
 */
export interface Product {
  public_id: string;
  name: string;
  /** Detail only: the brand's `public_id`, which is also what a save sends. */
  brand?: string | null;
  /** Read-only, on both list and detail. The id is not a thing to show anyone. */
  brand_name?: string | null;
  /** List only; the detail shape calls the same value `brand`. */
  brand_public_id?: string | null;
  /**
   * Detail only: the questions the merchant wrote about this product, in their
   * order. Merchant-authored — shoppers never submit here.
   */
  faq?: { question: string; answer: string }[];
  slug: string;
  price: string;
  original_price: string | null;
  /** Admin detail: multipart file field (path/URL). */
  image?: string | null;
  /** Admin list: absolute or relative image URL. */
  image_url?: string | null;
  /** Admin detail: selected category `public_id`. */
  category?: string;
  category_public_id?: string;
  category_slug?: string;
  category_name?: string;
  stock_tracking?: boolean;
  description?: string;
  /** Admin/catalog: sellable quantity (inventory-aligned). */
  available_quantity?: number;
  total_stock?: number;
  stock_source?: string;
  variant_count?: number;
  is_active: boolean;
  /** Ships free on its own flag. Optional: older API builds do not send it. */
  free_delivery?: boolean;
  extra_data?: Record<string, string | number | boolean>;
  images?: ProductImage[];
  /** Admin list: manual sort index within category. */
  display_order?: number;
  /** Prepayment requirement for checkout; applies to all variants. */
  prepayment_type?: ProductPrepaymentType;
  created_at: string;
  updated_at?: string;
}

export type ProductPrepaymentType = "none" | "delivery_only" | "full";

export interface ProductImage {
  public_id: string;
  product_public_id: string;
  image: string;
  order: number;
}

/** Admin API: product variant (SKU) row. */
export interface ProductVariant {
  public_id: string;
  product_public_id: string;
  sku: string;
  price_override: string | null;
  /** Short note shown in the storefront when this variant is selected. */
  price_note: string | null;
  /** Catalog sell price (override or product base); admin list/detail. */
  effective_price?: string;
  available_quantity: number;
  stock_source?: string;
  is_active: boolean;
  attribute_value_public_ids: string[];
  option_labels: string[];
  created_at: string;
  updated_at: string;
}

/** Admin API: global attribute type (Color, Size, …). */
export interface ProductAttributeAdmin {
  public_id: string;
  name: string;
  slug: string;
  order: number;
  values: ProductAttributeValueAdmin[];
}

export interface ProductAttributeValueAdmin {
  public_id: string;
  attribute_public_id?: string;
  attribute_name?: string;
  value: string;
  order: number;
}

/** Admin `GET /admin/categories/?tree=1` node (nested). */
export interface AdminCategoryTreeNode {
  public_id: string;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  parent: string | null;
  parent_name: string;
  order: number;
  is_active: boolean;
  /** Every product in this category ships free. Optional: older API builds do not send it. */
  free_delivery?: boolean;
  product_count: number;
  child_count: number;
  children: AdminCategoryTreeNode[];
}

/**
 * One of the shop's brands (`/api/v1/admin/brands/`).
 *
 * `product_count` is what a merchant reads before deleting one. Deleting is
 * safe either way -- the products keep existing and simply stop having a
 * brand -- but a merchant deserves to know how many they are about to touch.
 */
export interface AdminBrand {
  public_id: string;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  is_active: boolean;
  product_count: number;
  created_at: string;
}

/** One photo on a review (`/api/v1/admin/reviews/`). At most two per review. */
export interface AdminReviewImage {
  public_id: string;
  image: string | null;
  /** The card-sized copy. What the queue shows; `image` is the full one. */
  thumbnail: string | null;
  order: number;
}

/**
 * A review as the Reviews tab reads it.
 *
 * Almost all of it is read-only: a merchant decides, answers, deletes, or adds
 * one of their own. `reply` is the only field of theirs to write — a review the
 * shop can rewrite is not a review.
 */
export interface AdminReview {
  public_id: string;
  product_public_id: string;
  product_name: string;
  /** Empty when the shop added it; `source` is what says so in words. */
  account_public_id: string | null;
  rating: number;
  body: string;
  display_name: string;
  source: "shopper" | "merchant";
  status: "pending" | "published" | "rejected";
  is_verified_buyer: boolean;
  images: AdminReviewImage[];
  reply: string;
  replied_at: string | null;
  created_at: string;
  /** Sent back on Approve, so a review edited since it was read is refused. */
  updated_at: string;
  moderated_at: string | null;
}

export type AdminReviewCounts = Record<AdminReview["status"], number>;

/** Admin storefront CTA rows (`/api/v1/admin/notifications/`). Publishable API uses `cta_url` / `cta_label` / `start_at` / `end_at`. */
export interface Notification {
  public_id: string;
  cta_text: string;
  notification_type: string;
  is_active: boolean;
  is_currently_active: boolean;
  link: string | null;
  link_text: string;
  start_date: string | null;
  end_date: string | null;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface SupportTicketAttachment {
  public_id: string;
  file: string;
  created_at: string;
}

/** Admin API: support ticket (matches AdminSupportTicketSerializer). */
export interface SupportTicket {
  public_id: string;
  store_public_id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  order_number: string | null;
  category: string;
  priority: string;
  status: string;
  internal_notes: string;
  attachments: SupportTicketAttachment[];
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  orders: {
    total: number;
    pending: number;
    confirmed: number;
    cancelled: number;
  };
  revenue: string;
  products: {
    total: number;
    active: number;
    out_of_stock: number;
  };
  category_roots: number;
  category_total: number;
  support_tickets: number;
  notifications: number;
  customers_count?: number;
  banners_count?: number;
  blogs_count?: number;
  recent_orders: Order[];
}

export interface PaginatedResponse<T> {
  next: string | null;
  previous: string | null;
  results: T[];
  /** PageNumberPagination only; cursor lists omit this. */
  count?: number;
}

/** Admin trashed product row (`GET/DELETE admin/trash/`, `POST admin/trash/{public_id}/restore/`). */
export interface TrashItem {
  id: string;
  public_id: string;
  name: string;
  trashed_at: string;
  expires_at: string;
}

export interface ActivityActor {
  public_id: string;
  email: string;
  full_name: string;
}

export interface ActivityLog {
  public_id: string;
  created_at: string;
  actor: ActivityActor | null;
  action: "create" | "update" | "delete" | "custom";
  entity_type: string;
  entity_id: string;
  summary: string;
  metadata: Record<string, unknown>;
}

export interface Inventory {
  public_id: string;
  product_public_id: string;
  product_name: string;
  variant_public_id: string | null;
  variant_sku: string | null;
  /** Attribute option lines, same format as variants list (e.g. "Color: Red"). */
  option_labels: string[];
  quantity: number;
  low_stock_threshold: number;
  is_tracked: boolean;
  updated_at: string;
  is_low: boolean;
}

export interface StockMovement {
  public_id: string;
  change: number;
  reason: string;
  reference: string;
  created_at: string;
  actor_public_id: string | null;
}

export interface BlogTag {
  public_id: string;
  name: string;
  slug: string;
  created_at?: string;
}

/** Admin blog CRUD (`/api/v1/admin/blogs/`). Storefront GET uses `featured_image_url`. */
export interface Blog {
  public_id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featured_image: string | null;
  featured_image_url: string | null;
  meta_title: string;
  meta_description: string;
  tags: BlogTag[];
  published_at: string | null;
  is_featured: boolean;
  is_public: boolean;
  views: number;
  author_name: string;
  created_at: string;
  updated_at: string;
}

/** Single gallery image row from `GET/PATCH admin/banners/`. */
export interface BannerImage {
  public_id: string;
  image_url: string | null;
  order: number;
  created_at: string;
}

/** Admin banner CRUD (`/api/v1/admin/banners/`). Storefront GET uses `images`, `image_url`, and `cta_url`. */
export interface Banner {
  public_id: string;
  /** Thumbnail: first gallery image, else legacy main image URL. */
  image: string | null;
  images?: BannerImage[];
  title: string;
  cta_text: string;
  cta_link: string;
  is_active: boolean;
  is_currently_active: boolean;
  order: number;
  placement_slots: string[];
  start_at: string | null;
  end_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Store popup image row for `GET/PATCH admin/popups/` + storefront modal payload. */
export interface StorePopupImage {
  public_id: string;
  image_url: string | null;
  order: number;
  created_at?: string;
}

export type StorePopupShowFrequency = "session" | "daily" | "always";

/** Store popup payload for editor + storefront modal. */
export interface StorePopup {
  public_id: string;
  title: string;
  description: string;
  button_text: string;
  button_link: string;
  delay_seconds: number;
  show_frequency: StorePopupShowFrequency;
  show_on_all_pages: boolean;
  is_active: boolean;
  images: StorePopupImage[];
  created_at: string;
  updated_at: string;
}

export interface Customer {
  public_id: string;
  name: string;
  email: string | null;
  phone: string;
  address: string | null;
  total_orders: number;
  total_spent: string | number;
  first_order_at?: string | null;
  last_order_at?: string | null;
  is_repeat_customer?: boolean;
  avg_order_interval_days?: string | number | null;
  created_at: string;
  updated_at?: string;
}

/**
 * A shopper who signed in to the storefront. Distinct from `Customer`, which is
 * the phone-keyed record built from orders: the two are separate tabs of the
 * customers screen and are never merged. A person can appear in both.
 *
 * Read-only — the API exposes no way to create, edit or delete one.
 */
/** One row of the Products page's "Most wished-for" tab. `saved_by` counts
 *  people, not rows: one shopper saving two sizes is one person who wants it. */
/** One line of what somebody had in their basket when they stopped. */
export interface AbandonedCheckoutItem {
  name: string;
  variant: string;
  quantity: number;
  unit_price: string;
}

/**
 * Somebody who started checking out and did not finish.
 *
 * The phone is the point: an abandoned cart is a statistic, an abandoned
 * checkout is a phone call.
 */
export interface AbandonedCheckout {
  id: number;
  cart_public_id: string;
  account_public_id: string | null;
  name: string;
  phone: string;
  email: string;
  shipping_address: string;
  district: string;
  items: AbandonedCheckoutItem[];
  item_count: number;
  value: string | number;
  created_at: string;
  updated_at: string;
}

export interface MostWishedForProduct {
  public_id: string;
  name: string;
  slug: string;
  price: string | number;
  image_url: string | null;
  category_name: string | null;
  is_active: boolean;
  saved_by: number;
}

export interface CustomerAccount {
  public_id: string;
  name: string;
  /** The verified address they sign in with; null until one is verified. */
  email: string | null;
  created_at: string;
  last_seen_at: string | null;
  /** Confirmed orders placed while signed in — same definition the Customers tab uses. */
  total_orders: number;
  total_spent: string | number;
  first_order_at?: string | null;
  last_order_at?: string | null;
  /** Derived from the confirmed signed-in order count, not a stored column. */
  is_repeat_customer: boolean;
}

/** How a shopper signs in. Only `email` exists today; the list shape is what makes
 *  a phone or social login a later addition rather than a redesign. */
export interface CustomerIdentity {
  provider: string;
  identifier: string;
  verified_at: string | null;
}

/** One thing a shopper saved, on their own account page. */
export interface CustomerSavedItem {
  product_public_id: string;
  product_name: string;
  variant_public_id: string | null;
  saved_at: string;
}

export interface CustomerAccountDetailsResponse {
  account: {
    public_id: string;
    name: string;
    email: string | null;
    created_at: string;
    last_seen_at: string | null;
  };
  analytics: {
    total_orders: number;
    total_spent: string | number;
    first_order_at: string | null;
    last_order_at: string | null;
    average_order_value: string | number;
  };
  identities: CustomerIdentity[];
  saved_items: CustomerSavedItem[];
}

export interface CustomerDetailsResponse {
  customer: {
    public_id: string;
    name: string;
    email: string | null;
    phone: string;
    address: string | null;
  };
  analytics: {
    total_orders: number;
    total_spent: string;
    first_order_at: string | null;
    last_order_at: string | null;
    is_repeat_customer: boolean;
    avg_order_interval_days: string | number | null;
  };
}

export interface ShippingZone {
  public_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShippingMethod {
  public_id: string;
  name: string;
  method_type: "standard" | "express" | "pickup" | "other";
  is_active: boolean;
  order: number;
  zone_public_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface Courier {
  public_id: string;
  provider: "steadfast";
  api_key_masked: string;
  secret_key_masked: string;
  has_webhook_token?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShippingRate {
  public_id: string;
  shipping_method_public_id: string;
  shipping_zone_public_id: string;
  rate_type: "flat" | "weight" | "order_total";
  min_order_total: string | null;
  max_order_total: string | null;
  price: string;
  is_active: boolean;
}

export interface IntegrationEventSettings {
  track_purchase: boolean;
  track_initiate_checkout: boolean;
  track_add_to_cart: boolean;
  track_view_content: boolean;
}

export interface MarketingIntegration {
  public_id: string;
  provider: "facebook" | "google_analytics" | "tiktok";
  pixel_id: string;
  access_token_masked: string;
  test_event_code: string;
  is_active: boolean;
  event_settings: IntegrationEventSettings | null;
  created_at: string;
  updated_at: string;
}

export interface StoreAPIKey {
  public_id: string;
  name: string;
  key_prefix: string;
  key_type?: "public" | "secret";
  created_at: string;
  revoked_at: string | null;
}

export type {
  StorefrontBanner,
  StorefrontBannerImage,
  StorefrontCategory,
  StorefrontCTA,
  StorefrontOrderItem,
  StorefrontProductDetail,
  StorefrontProductListItem,
} from "./storefront-api";

/**
 * A discount code, as the dashboard reads it.
 *
 * `times_used` and `total_discount` are counted by the server over the
 * redemptions, never stored on the row — a stored tally drifts the first time
 * anything fails halfway, and a wrong one either refuses a good code or
 * honours a spent one. `times_used` excludes cancelled orders, exactly as the
 * usage limit does, so the number a merchant reads is the number deciding
 * whether the next shopper gets in.
 */
export interface Coupon {
  public_id: string;
  code: string;
  kind: "percent" | "fixed";
  value: string;
  min_spend: string | null;
  max_discount: string | null;
  usage_limit: number | null;
  per_customer_limit: number | null;
  starts_at: string | null;
  expires_at: string | null;
  applies_to: "all" | "products" | "categories";
  product_public_ids: string[];
  category_public_ids: string[];
  is_active: boolean;
  created_at: string;
  times_used: number;
  total_discount: string;
}

export interface CouponWrite {
  code?: string;
  kind?: "percent" | "fixed";
  value?: string;
  min_spend?: string | null;
  max_discount?: string | null;
  usage_limit?: number | null;
  per_customer_limit?: number | null;
  starts_at?: string | null;
  expires_at?: string | null;
  applies_to?: "all" | "products" | "categories";
  is_active?: boolean;
}
