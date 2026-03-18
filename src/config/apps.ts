import type { LucideIcon } from "lucide-react";
import {
  Package,
  Box,
  Boxes,
  Users,
  ShoppingCart,
  Heart,
  Layers,
  Tag,
  Bell,
  PackageSearch,
  History,
  Star,
  Image as ImageIcon,
  BarChart3,
} from "lucide-react";

export interface NavCounts {
  orders: number;
  products: number;
  notifications: number;
  carts: number;
  wishlist: number;
  categories: number;
  brands: number;
  contacts: number;
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
    description: "Product catalog, variants, and inventory basics",
    essential: true,
    href: "/products",
    countKey: "products",
    parentId: null,
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
  carts: {
    id: "carts",
    label: "Carts",
    icon: ShoppingCart,
    description: "Shopping cart and abandoned cart tracking",
    essential: false,
    href: "/carts",
    countKey: "carts",
    parentId: null,
  },
  wishlist: {
    id: "wishlist",
    label: "Wishlist",
    icon: Heart,
    description: "Customer wishlists and saved items",
    essential: false,
    href: "/wishlist",
    countKey: "wishlist",
    parentId: null,
  },
  categories: {
    id: "categories",
    label: "Categories",
    icon: Layers,
    description: "Product categories and organization",
    essential: false,
    href: "/categories",
    countKey: "categories",
    parentId: "categories_brands",
  },
  brands: {
    id: "brands",
    label: "Brands",
    icon: Tag,
    description: "Product brands and brand showcase",
    essential: false,
    href: "/brands",
    countKey: "brands",
    parentId: "categories_brands",
  },
  contacts: {
    id: "contacts",
    label: "Contacts",
    icon: Users,
    description: "Contact form submissions and inquiries",
    essential: false,
    href: "/contacts",
    countKey: "contacts",
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
    description: "Discount codes and promotions",
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
    essential: false,
    href: "/variants",
    countKey: null,
    parentId: "more",
  },
  inventory: {
    id: "inventory",
    label: "Inventory",
    icon: PackageSearch,
    description: "Stock levels and SKU management",
    essential: false,
    href: "/inventory",
    countKey: null,
    parentId: "more",
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
    description: "Store insights – orders, carts, pageviews",
    essential: false,
    href: "/analytics",
    countKey: null,
    parentId: null,
  },
};

export const ESSENTIAL_APP_IDS = ["products", "orders", "customers"] as const;

export const OPTIONAL_APP_IDS = [
  "carts",
  "wishlist",
  "categories",
  "brands",
  "contacts",
  "cta",
  "reviews",
  "coupons",
  "variants",
  "inventory",
  "activities",
  "banners",
  "analytics",
] as const;

export const MAIN_NAV_APP_IDS = ["orders", "products", "customers", "cta", "carts", "wishlist", "banners", "analytics"] as const;

export const CATEGORIES_BRANDS_APP_IDS = ["categories", "brands"] as const;

export const MORE_APP_IDS = [
  "contacts",
  "activities",
  "reviews",
  "coupons",
  "variants",
  "inventory",
] as const;
