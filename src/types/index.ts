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

export interface OrderItem {
  public_id: string;
  product: string | null;
  product_name: string;
  status?: "active" | "deleted";
  product_brand?: string;
  product_image: string | null;
  variant_public_id?: string | null;
  variant_sku?: string | null;
  variant_inventory_quantity?: number | null;
  variant_option_labels?: string[];
  quantity: number;
  price: string;
  original_price?: string | null;
}

export interface Order {
  public_id: string;
  order_number: string;
  extra_data?: Record<string, string | number | boolean>;
  user_public_id?: string | null;
  email: string;
  status: string;
  subtotal?: string;
  shipping_cost?: string;
  shipping_zone_public_id?: string | null;
  shipping_method_public_id?: string | null;
  total: string;
  shipping_name: string;
  shipping_address: string;
  phone: string;
  district: string;
  tracking_number: string;
  courier_provider?: string;
  courier_consignment_id?: string;
  courier_tracking_code?: string;
  courier_status?: string;
  sent_to_courier?: boolean;
  customer_confirmation_sent_at?: string | null;
  coupon_code?: string;
  discount_amount?: string;
  allowed_next_statuses?: string[];
  items?: OrderItem[];
  items_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  public_id: string;
  name: string;
  brand: string | null;
  slug: string;
  price: string;
  original_price: string | null;
  image: string | null;
  image_url?: string | null;
  badge: string | null;
  category: string;
  category_public_id?: string;
  category_name: string;
  description?: string;
  stock: number;
  /** Number of ProductVariant rows (admin API). */
  variant_count?: number;
  /** Sum of variant stock when variants exist; else same as `stock` (admin API). */
  total_stock?: number;
  is_featured: boolean;
  is_active: boolean;
  extra_data?: Record<string, string | number | boolean>;
  images?: ProductImage[];
  created_at: string;
  updated_at?: string;
}

export interface ProductImage {
  public_id: string;
  product: string;
  image: string;
  order: number;
}

/** Admin API: product variant (SKU) row. */
export interface ProductVariant {
  public_id: string;
  product: string;
  sku: string;
  price_override: string | null;
  inventory_quantity: number;
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

export interface ParentCategory {
  public_id: string;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  order: number;
  is_active: boolean;
  child_count: number;
}

export interface Category {
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
}

export interface Notification {
  public_id: string;
  text: string;
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
  categories: number;
  subcategories: number;
  support_tickets: number;
  notifications: number;
  recent_orders: Order[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
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

export interface Coupon {
  public_id: string;
  code: string;
  discount_type: string;
  discount_value: string;
  min_order_value: string | null;
  max_uses: number | null;
  per_identity_max_uses: number | null;
  times_used: number;
  successful_uses?: number;
  reversed_uses?: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BulkDiscount {
  public_id: string;
  target_type: "category" | "subcategory" | "product";
  category_public_id: string | null;
  product_public_id: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: string;
  priority: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Banner {
  public_id: string;
  image: string;
  title: string;
  description: string;
  cta_text: string;
  redirect_url: string;
  is_clickable: boolean;
  placement: string;
  position: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  public_id: string;
  product: string;
  product_name: string;
  user_email: string;
  rating: number;
  title: string;
  body: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  public_id: string;
  user_public_id: string | null;
  user_email: string | null;
  user_username: string | null;
  name: string;
  email: string | null;
  phone: string;
  address: string | null;
  total_orders: number;
  marketing_opt_in: boolean;
  extra_data?: Record<string, string | number | boolean>;
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
    district: string | null;
  };
  analytics: {
    total_orders: number;
    total_spent: string;
    average_order_value: string;
    first_order_date: string | null;
    last_order_date: string | null;
    loyalty_score: string;
  };
  ordered_products: Array<{
    order_public_id: string;
    order_number: string;
    ordered_at: string;
    product_public_id: string;
    product_name: string;
    quantity: number;
    price: string;
  }>;
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
  provider: "pathao" | "steadfast";
  api_key_masked: string;
  secret_key_masked: string;
  access_token_masked: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShippingRate {
  public_id: string;
  shipping_method: string;
  shipping_zone: string;
  rate_type: "flat" | "weight" | "order_total";
  min_order_total: string | null;
  max_order_total: string | null;
  price: string;
  is_active: boolean;
}

export interface IntegrationEventSettings {
  track_purchase: boolean;
  track_initiate_checkout: boolean;
  track_view_content: boolean;
  track_page_view: boolean;
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
