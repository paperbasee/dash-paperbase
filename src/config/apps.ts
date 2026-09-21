import type { LucideIcon } from "lucide-react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { NewspaperClippingIcon, TruckIcon, PackageIcon } from "@phosphor-icons/react";
import {
  Box,
  Boxes,
  ChartSpline,
  Users,
  Layers,
  Tags,
  Bell,
  MessageSquare,
  PackageSearch,
  Image as ImageIcon,
  Ticket,
  TicketPercent,
  Trash,
  Heart as HeartIcon,
  Phone as PhoneIcon,
  UserRound,
} from "lucide-react";

/** Lucide or Phosphor icon for main nav / apps list. */
export type AppNavIcon = LucideIcon | PhosphorIcon;

export interface NavCounts {
  orders: number;
  products: number;
  customers: number;
  supportTickets: number;
  blog: number;
}

export interface AppConfig {
  id: string;
  label: string;
  icon: AppNavIcon;
  description: string;
  essential: boolean;
  /** Sidebar route; null for apps shown in Settings instead (Promotions tabs, Shipping). */
  href: string | null;
  countKey: keyof NavCounts | null;
  parentId: string | null;
}

export const APP_CONFIG: Record<string, AppConfig> = {
  analytics: {
    id: "analytics",
    label: "Analytics",
    icon: ChartSpline,
    description: "Advanced analytics dashboard (sessions, revenue, devices, top pages)",
    essential: false,
    href: "/analytics",
    countKey: null,
    parentId: null,
  },
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
    icon: PackageIcon,
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
    countKey: "customers",
    parentId: null,
  },
  abandoned_checkouts: {
    id: "abandoned_checkouts",
    label: "Abandoned checkouts",
    icon: PhoneIcon,
    description: "People who filled in checkout and did not finish",
    essential: false,
    href: "/orders/abandoned",
    countKey: null,
    parentId: "orders",
  },
  accounts: {
    id: "accounts",
    label: "Accounts",
    icon: UserRound,
    description: "Shoppers who signed in to your storefront",
    essential: false,
    href: "/customers/accounts",
    countKey: null,
    parentId: "customers",
  },
  wishlist: {
    id: "wishlist",
    label: "Most wished-for",
    icon: HeartIcon,
    description: "What shoppers saved to come back to",
    essential: false,
    href: "/products/wished",
    countKey: null,
    parentId: "products",
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
    href: null,
    countKey: null,
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
    icon: Trash,
    description: "Restore or permanently delete removed products and orders",
    essential: false,
    href: "/trash",
    countKey: null,
    parentId: "more",
  },
  popup: {
    id: "popup",
    label: "Pop-up",
    icon: MessageSquare,
    description: "Marketing pop-up modal announcement",
    essential: false,
    href: null,
    countKey: null,
    parentId: null,
  },
  coupons: {
    id: "coupons",
    label: "Discount codes",
    icon: TicketPercent,
    description: "Codes shoppers type at checkout for money off",
    essential: false,
    href: "/coupons",
    countKey: null,
    parentId: null,
  },
  blog: {
    id: "blog",
    label: "Blog",
    icon: NewspaperClippingIcon,
    description: "Publish blog posts and manage tags",
    essential: false,
    href: "/blog",
    countKey: "blog",
    parentId: null,
  },
  shipping: {
    id: "shipping",
    label: "Shipping",
    icon: TruckIcon,
    description: "Shipping zones, methods, and rates",
    essential: true,
    href: null,
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
  "analytics",
  "support_tickets",
  "blog",
] as const;

/** Collapsible “Catalog” group in the sidebar (Products + related). */
export const CATALOG_SUB_APP_IDS = [
  "products",
  "categories",
  "variants",
  "product_attributes",
  // What shoppers saved. A sibling of Products rather than a child of it: the
  // group is already the catalogue, and a second level inside it would be one
  // more thing to open for a list that is read in ten seconds.
  "wishlist",
] as const;

/** Top-level nav items (excluding catalog children). */
export const MAIN_NAV_APP_IDS = [
  "orders",
  "analytics",
  "customers",
  "inventory",
  // Its own row rather than a child of Sales: a merchant writing a campaign is
  // not reading today's orders, and a code outlives any one of them.
  "coupons",
  "blog",
] as const;

export const MORE_APP_IDS = ["support_tickets", "trash"] as const;

/**
 * Apps that are OFF until a merchant switches them on.
 *
 * Different from `OPTIONAL_APP_IDS`, where a missing flag means *on* -- those
 * predate per-shop flags and defaulting them off would have taken features away
 * from every existing shop. These three arrived with their flag, the storefront
 * treats a missing flag as off, and the dashboard has to agree: a sidebar entry
 * for something the shop does not serve is a link to a 404.
 */
export const OPT_IN_APP_IDS = ["wishlist", "coupons"] as const;

/**
 * Always on, and not listed in Settings → Apps.
 *
 * `abandoned_checkouts` is here by the owner's decision on 2026-09-21: every
 * shop keeps the phone number and basket of somebody who starts checkout and
 * does not finish. There is no switch, so the thirty-day deletion is the only
 * thing limiting how long that is held -- see
 * `engine.apps.checkout_attempts.services.KEEP_FOR_DAYS`.
 *
 * `popup` and `cta` joined it on the same day, moved off `OPTIONAL_APP_IDS`.
 * Their switch only ever hid their own editor: neither flag is read by the
 * storefront, which draws a pop-up or a notice when the merchant has written
 * one and marked it active. So the switch turned off the only screen where the
 * thing could be turned off -- and a merchant who used it once could not find
 * their pop-up again. Writing it inactive is how you turn it off.
 */
export const ALWAYS_ON_EXTRA_APP_IDS = [
  "abandoned_checkouts",
  "popup",
  "cta",
  // Owner's decision 2026-09-22: Shoppers cannot be switched off. Every shop
  // has customers the moment it takes an order -- the list is built from the
  // orders themselves -- so a switch that hid them only ever hid a merchant's
  // own record of who bought from them. No storefront page reads this flag,
  // so nothing a shopper sees changes.
  "customers",
  // The same decision, and this half DID change what shoppers see: signing in
  // is now part of every shop rather than something a merchant switches on.
  // The old switch had one unavoidable consequence -- a wishlist needs an
  // account to belong to, so a shop with accounts off could not have a
  // wishlist either, however much the merchant wanted one.
  "accounts",
] as const;

/**
 * Sidebar groups: a row that opens a tree, exactly as `Catalog` does.
 *
 * **The parent's own page is the first child.** The row itself no longer
 * navigates -- it expands -- so without that entry the orders list and the
 * customer list would have no way in at all. Products sits under Catalog for
 * the same reason.
 *
 * One behaviour for every group in the sidebar. Two that look alike and do
 * different things is worse than either.
 */
export const NAV_CHILD_APP_IDS: Record<string, readonly string[]> = {
  orders: ["orders", "abandoned_checkouts"],
  customers: ["customers", "accounts"],
};

/**
 * What a group is called, when it cannot be called what its parent is called.
 *
 * `Catalog` has this problem solved for it: the group and the page beneath it
 * were always different words. Orders and Customers were not, so the tree read
 * "Orders / Orders, Abandoned checkouts" -- the same word twice, one indented
 * under the other, which looks like a mistake.
 *
 * The group takes the wider word and the page keeps its own: a sale that landed
 * and one that did not are both `Sales`; the phone-keyed record and the login
 * are both people who `Shop` here. In Bangla the two words are already
 * distinct -- গ্রাহক for the record, ক্রেতা for the person -- so the same
 * split works there.
 */
export const NAV_GROUP_LABEL_KEYS: Record<string, string> = {
  orders: "groupSales",
  customers: "groupShoppers",
};

/** Does this app have a place of its own, or is it a screen inside Settings? */
const hasOwnPage = (id: string): boolean => Boolean(APP_CONFIG[id]?.href);

/**
 * What Settings → Apps lists, in its two groups.
 *
 * An app earns its place on that screen by having a place of its own in the
 * sidebar. `shipping`, `popup` and `cta` have no `href` because they ARE
 * settings screens -- Settings → Shipping, and the two Promotions tabs -- so
 * listing them there asked a merchant to switch on the page they were already
 * standing in, under a heading that says these are the apps in their shop.
 *
 * Derived from `href` rather than written out again, so an app cannot be added
 * to the sidebar and quietly miss this screen, or lose its page and linger on
 * it.
 */
export const APPS_SCREEN_ALWAYS_ON_IDS: readonly string[] =
  ESSENTIAL_APP_IDS.filter(hasOwnPage);

export const APPS_SCREEN_SWITCHABLE_IDS: readonly string[] = [
  ...OPTIONAL_APP_IDS,
  ...OPT_IN_APP_IDS,
].filter(hasOwnPage);
