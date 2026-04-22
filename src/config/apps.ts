import type { LucideIcon } from "lucide-react";
import {
  Package,
  Box,
  Boxes,
  Users,
  Layers,
  Tags,
  Bell,
  PackageSearch,
  Image as ImageIcon,
  Truck,
  Ticket,
  Trash2,
  Newspaper,
} from "lucide-react";

export interface NavCounts {
  orders: number;
  products: number;
  notifications: number;
  supportTickets: number;
  banners: number;
  blog: number;
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
    essential: false,
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
    countKey: null,
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
    essential: true,
    href: "/inventory",
    countKey: null,
    parentId: null,
  },
  trash: {
    id: "trash",
    label: "Trash",
    icon: Trash2,
    description: "Restore or permanently delete removed products and orders",
    essential: false,
    href: "/trash",
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
    countKey: "banners",
    parentId: null,
  },
  blog: {
    id: "blog",
    label: "Blog",
    icon: Newspaper,
    description: "Publish blog posts and manage tags",
    essential: false,
    href: "/blog",
    countKey: "blog",
    parentId: null,
  },
  shipping: {
    id: "shipping",
    label: "Shipping",
    icon: Truck,
    description: "Shipping zones, methods, and rates",
    essential: true,
    href: "/shipping",
    countKey: null,
    parentId: null,
  },
};

export const ESSENTIAL_APP_IDS = ["products", "orders", "inventory", "shipping"] as const;

/** Shipped with the catalog; always on — not listed in Settings → Apps or onboarding toggles. */
export const CATALOG_INCLUDED_APP_IDS = [
  "categories",
  "variants",
  "product_attributes",
] as const;

export const OPTIONAL_APP_IDS = [
  "support_tickets",
  "cta",
  "customers",
  "banners",
  "blog",
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
  "blog",
] as const;

export const MORE_APP_IDS = ["support_tickets", "trash"] as const;
