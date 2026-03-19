export interface Branding {
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
  id: number;
  product: string;
  product_name: string;
  product_brand?: string;
  product_image: string | null;
  variant?: number | null;
  variant_sku?: string | null;
  variant_stock_quantity?: number | null;
  variant_option_labels?: string[];
  quantity: number;
  price: string;
  original_price?: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  extra_data?: Record<string, string | number | boolean>;
  user: number | null;
  email: string;
  status: "pending" | "confirmed" | "cancelled";
  subtotal?: string;
  shipping_cost?: string;
  shipping_zone?: number | null;
  shipping_method?: number | null;
  total: string;
  shipping_name: string;
  shipping_address: string;
  phone: string;
  delivery_area: string;
  delivery_area_label: string;
  district: string;
  tracking_number: string;
  items?: OrderItem[];
  items_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  slug: string;
  price: string;
  original_price: string | null;
  image: string | null;
  image_url?: string | null;
  badge: string | null;
  category: number;
  category_name: string;
  sub_category: number | null;
  sub_category_name: string | null;
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
  id: number;
  product: string;
  image: string;
  order: number;
}

/** Admin API: product variant (SKU) row. */
export interface ProductVariant {
  id: number;
  product: string;
  sku: string;
  price_override: string | null;
  stock_quantity: number;
  is_active: boolean;
  attribute_value_ids: number[];
  option_labels: string[];
  created_at: string;
  updated_at: string;
}

/** Admin API: global attribute type (Color, Size, …). */
export interface ProductAttributeAdmin {
  id: number;
  name: string;
  slug: string;
  order: number;
  values: ProductAttributeValueAdmin[];
}

export interface ProductAttributeValueAdmin {
  id: number;
  attribute: number;
  attribute_name?: string;
  value: string;
  order: number;
}

export interface ParentCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  order: number;
  is_active: boolean;
  child_count: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  parent: number | null;
  parent_name: string;
  order: number;
  is_active: boolean;
  product_count: number;
}

export interface Notification {
  id: number;
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

export interface ContactSubmission {
  id: number;
  name: string;
  phone: string;
  email: string;
  message: string;
  created_at: string;
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
  contacts: number;
  notifications: number;
  carts: number;
  wishlist: number;
  recent_orders: Order[];
}

export interface CartItem {
  id: number;
  product: number;
  product_name: string;
  product_brand?: string;
  quantity: number;
  size: string;
  created_at: string;
  updated_at: string;
}

export interface Cart {
  id: number;
  items: CartItem[];
  created_at: string;
  updated_at: string;
}

export interface WishlistItem {
  id: number;
  product: number;
  product_name: string;
  product_brand?: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ActivityActor {
  id: number;
  username: string;
  email: string;
}

export interface ActivityLog {
  id: number;
  created_at: string;
  actor: ActivityActor | null;
  action: "create" | "update" | "delete" | "custom";
  entity_type: string;
  entity_id: string;
  summary: string;
  metadata: Record<string, unknown>;
}

export interface Inventory {
  id: number;
  product: string;
  product_name: string;
  variant: number | null;
  variant_sku: string | null;
  quantity: number;
  low_stock_threshold: number;
  is_tracked: boolean;
  updated_at: string;
  is_low: boolean;
}

export interface StockMovement {
  id: number;
  change: number;
  reason: string;
  reference: string;
  created_at: string;
  actor: number | null;
}

export interface Coupon {
  id: number;
  code: string;
  discount_type: string;
  discount_value: string;
  min_order_value: string | null;
  max_uses: number | null;
  times_used: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Banner {
  id: number;
  title: string;
  image: string;
  link_url: string;
  position: string;
  order: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: number;
  product: string;
  product_name: string;
  user: number;
  user_email: string;
  rating: number;
  title: string;
  body: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: number;
  user: number;
  user_email: string;
  user_username: string;
  phone: string;
  marketing_opt_in: boolean;
  extra_data?: Record<string, string | number | boolean>;
  created_at: string;
  updated_at?: string;
}

export interface ShippingZone {
  id: number;
  name: string;
  delivery_areas: string;
  districts: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShippingMethod {
  id: number;
  name: string;
  method_type: "standard" | "express" | "pickup" | "other";
  is_active: boolean;
  order: number;
  zone_ids: number[];
  created_at: string;
  updated_at: string;
}

export interface ShippingRate {
  id: number;
  shipping_method: number;
  shipping_zone: number;
  rate_type: "flat" | "weight" | "order_total";
  min_order_total: string | null;
  max_order_total: string | null;
  price: string;
  is_active: boolean;
}
