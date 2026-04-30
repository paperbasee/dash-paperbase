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
  customer_confirmation_sent_at?: string | null;
  items?: OrderItem[];
  items_count?: number;
  has_unavailable_products?: boolean;
  unavailable_products_count?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Admin product list/detail (`/api/v1/admin/products/`). Storefront shapes differ — see `StorefrontProductListItem` in `./storefront-api`.
 */
export interface Product {
  public_id: string;
  name: string;
  brand: string | null;
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
  product_count: number;
  child_count: number;
  children: AdminCategoryTreeNode[];
}

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
  banners_count?: number;
  blogs_count?: number;
  recent_orders: Order[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type TrashEntityType = "product" | "order";

/** Admin trash row (`GET/DELETE admin/trash/`, `POST admin/trash/{id}/restore/`). */
export interface TrashItem {
  id: number;
  entity_type: TrashEntityType;
  entity_id: string;
  entity_public_id: string;
  /** Display name from snapshot (product name; order shipping name + number). */
  entity_name: string;
  deleted_at: string;
  expires_at: string;
  is_restored: boolean;
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
