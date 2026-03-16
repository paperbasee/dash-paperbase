export interface Branding {
  logo_url: string | null;
  admin_name: string;
  admin_subtitle: string;
  currency_symbol: string;
}

export interface OrderItem {
  id: number;
  product: string;
  product_name: string;
  product_brand?: string;
  product_image: string | null;
  quantity: number;
  size: string;
  price: string;
  original_price?: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  user: number | null;
  email: string;
  status: "pending" | "confirmed" | "cancelled";
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
  is_featured: boolean;
  is_active: boolean;
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

export interface NavbarCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  order: number;
  is_active: boolean;
  subcategory_count: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  navbar_category: number;
  navbar_category_name: string;
  order: number;
  is_active: boolean;
  product_count: number;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  image: string;
  redirect_url: string;
  brand_type: string;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  brands: number;
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
