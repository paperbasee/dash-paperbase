/**
 * JSON shapes for the **publishable storefront API** (`Authorization: Bearer ak_pk_…`).
 * Admin/dashboard CRUD uses different field names in some places (e.g. banners use `cta_link` in admin).
 * @see api-akkho/README.md — "Storefront JSON contract"
 */

export interface StorefrontProductImage {
  public_id: string;
  image_url: string | null;
  alt: string;
  order: number;
}

export interface StorefrontVariantOption {
  attribute_public_id: string;
  attribute_slug: string;
  attribute_name: string;
  value_public_id: string;
  value: string;
}

export interface StorefrontProductListItem {
  public_id: string;
  name: string;
  brand: string | null;
  stock_tracking: boolean;
  price: string;
  original_price: string | null;
  image_url: string | null;
  category_public_id: string;
  category_slug: string;
  category_name: string;
  slug: string;
  total_stock: number;
  stock_source: string;
  available_quantity: number;
  stock_status: string;
  variant_count: number;
  extra_data: Record<string, unknown>;
}

export interface StorefrontProductDetail extends StorefrontProductListItem {
  images: StorefrontProductImage[];
  description: string;
  created_at: string;
  variants: Array<{
    public_id: string;
    sku: string;
    available_quantity: number;
    stock_source: string;
    stock_status: string;
    is_active: boolean;
    price: string;
    options: StorefrontVariantOption[];
  }>;
  breadcrumbs: string[];
  related_products: StorefrontProductListItem[];
  /** Keys are attribute slugs; values include attribute_public_id and value_public_id. */
  variant_matrix: Record<
    string,
    {
      slug: string;
      attribute_public_id: string;
      attribute_name: string;
      values: Array<{ value_public_id: string; value: string }>;
    }
  >;
}

export interface StorefrontCategory {
  public_id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  parent_public_id: string | null;
  order: number;
  is_active: boolean;
  /** Present when `GET /categories/?tree=1`. */
  children?: StorefrontCategory[];
}

/** One storefront banner image (gallery `bni_…` or legacy main `ban_…` when no gallery row). */
export interface StorefrontBannerImage {
  public_id: string;
  image_url: string;
  order: number;
}

export interface StorefrontBanner {
  public_id: string;
  title: string;
  /** First image URL; same as `images[0]?.image_url` when `images` is non-empty. */
  image_url: string | null;
  /** All banner images in display order (API absolute URLs), up to five. */
  images: StorefrontBannerImage[];
  cta_text: string;
  cta_url: string;
  order: number;
  /** Predefined placement keys (e.g. home_top); same as admin `placement_slots`. */
  placement_slots: string[];
  start_at: string | null;
  end_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StorefrontCTA {
  public_id: string;
  cta_text: string;
  notification_type: string;
  is_active: boolean;
  is_currently_active: boolean;
  cta_url: string | null;
  cta_label: string;
  order: number;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StorefrontOrderLineVariantOption {
  attribute_public_id: string;
  attribute_slug: string;
  attribute_name: string;
  value_public_id: string;
  value: string;
}

export interface StorefrontOrderItem {
  public_id: string;
  product_public_id: string | null;
  product_name: string;
  status: string;
  quantity: number;
  price: string;
  variant_public_id: string | null;
  variant_sku: string | null;
  variant_options: StorefrontOrderLineVariantOption[] | null;
}
