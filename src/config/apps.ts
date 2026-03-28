import type { LucideIcon } from "lucide-react";
import {
  Package,
  Box,
  Boxes,
  Users,
  Layers,
  Tag,
  Tags,
  Bell,
  PackageSearch,
  History,
  Star,
  Image as ImageIcon,
  BarChart3,
  Truck,
  Ticket,
} from "lucide-react";

export interface NavCounts {
  orders: number;
  products: number;
  notifications: number;
  categories: number;
  supportTickets: number;
}

export interface AppConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  essential: boolean;
  href: string | null;
  countKey: keyof NavCounts | null;
  parentId: string | null;
}

export const APP_CONFIG: Record<string, AppConfig> = {
  products: {
    id: "products",
    label: "Products",
    icon: Box,
    description:
      "Product catalog; categories, variants, and attributes are always available with it",
    essential: true,
    href: "/products",
    countKey: "products",
    parentId: "catalog",
  },
  orders: {
    id: "orders",
    label: "Orders",
    icon: Package,
    description: "Order management, status flow, and fulfillment",
    essential: true,
    href: "/orders",
    countKey: "orders",
    parentId: null,
  },
  customers: {
    id: "customers",
    label: "Customers",
    icon: Users,
    description: "Customer accounts and profiles",
    essential: true,
    href: "/customers",
    countKey: null,
    parentId: null,
  },
  categories: {
    id: "categories",
    label: "Categories",
    icon: Layers,
    description: "Product categories and organization",
    essential: true,
    href: "/categories",
    countKey: "categories",
    parentId: "catalog",
  },
  support_tickets: {
    id: "support_tickets",
    label: "Support tickets",
    icon: Ticket,
    description: "Customer support tickets and inquiries",
    essential: false,
    href: "/support-tickets",
    countKey: "supportTickets",
    parentId: "more",
  },
  cta: {
    id: "cta",
    label: "CTA",
    icon: Bell,
    description: "Call-to-action banners and notifications",
    essential: false,
    href: "/cta",
    countKey: "notifications",
    parentId: null,
  },
  reviews: {
    id: "reviews",
    label: "Reviews",
    icon: Star,
    description: "Product reviews and ratings",
    essential: false,
    href: "/reviews",
    countKey: null,
    parentId: "more",
  },
  coupons: {
    id: "coupons",
    label: "Coupons",
    icon: Tag,
    description: "Coupon codes and automatic bulk discounts",
    essential: false,
    href: "/coupons",
    countKey: null,
    parentId: "more",
  },
  variants: {
    id: "variants",
    label: "Variants",
    icon: Boxes,
    description: "Product variants (size, color, SKU) per product",
    essential: true,
    href: "/variants",
    countKey: null,
    parentId: "catalog",
  },
  product_attributes: {
    id: "product_attributes",
    label: "Attributes",
    icon: Tags,
    description: "Option types and values (e.g. Color, Size) for variants",
    essential: true,
    href: "/product-attributes",
    countKey: null,
    parentId: "catalog",
  },
  inventory: {
    id: "inventory",
    label: "Inventory",
    icon: PackageSearch,
    description: "Stock levels and SKU management",
    essential: false,
    href: "/inventory",
    countKey: null,
    parentId: null,
  },
  activities: {
    id: "activities",
    label: "Activities",
    icon: History,
    description: "Activity log and audit trail",
    essential: false,
    href: "/activities",
    countKey: null,
    parentId: "more",
  },
  banners: {
    id: "banners",
    label: "Banners",
    icon: ImageIcon,
    description: "Manage banners for homepage, sidebar, footer",
    essential: false,
    href: "/banners",
    countKey: null,
    parentId: null,
  },
  analytics: {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    description: "Store insights – orders and pageviews",
    essential: false,
    href: "/analytics",
    countKey: null,
    parentId: null,
  },
  shipping: {
    id: "shipping",
    label: "Shipping",
    icon: Truck,
    description: "Shipping zones, methods, and rates",
    essential: false,
    href: "/shipping",
    countKey: null,
    parentId: null,
  },
};

export const ESSENTIAL_APP_IDS = ["products", "orders", "customers"] as const;

/** Shipped with the catalog; always on — not listed in Settings → Apps or onboarding toggles. */
export const CATALOG_INCLUDED_APP_IDS = [
  "categories",
  "variants",
  "product_attributes",
] as const;

export const OPTIONAL_APP_IDS = [
  "support_tickets",
  "cta",
  "reviews",
  "coupons",
  "inventory",
  "activities",
  "banners",
  "analytics",
  "shipping",
] as const;

/** Collapsible “Catalog” group in the sidebar (Products + related). */
export const CATALOG_SUB_APP_IDS = [
  "products",
  "categories",
  "variants",
  "product_attributes",
] as const;

/** Top-level nav items (excluding catalog children). */
export const MAIN_NAV_APP_IDS = [
  "orders",
  "customers",
  "inventory",
  "shipping",
  "cta",
  "banners",
  "analytics",
] as const;

export const MORE_APP_IDS = [
  "support_tickets",
  "activities",
  "reviews",
  "coupons",
] as const;
