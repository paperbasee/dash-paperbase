import type { LucideIcon } from "lucide-react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { 
  PlugsIcon, 
  StorefrontIcon, 
  ShoppingCartIcon, 
  BellRingingIcon, 
  AppStoreLogoIcon,
  TruckIcon,
  GavelIcon,
} from "@phosphor-icons/react";

import {
  Layers,
  User,
  Shield,
  CreditCard,
  Palette,
  Users,
  Globe,
  Megaphone,
  MonitorSmartphone,
  Wallet,
} from "lucide-react";

import { holdsOwnerPower, type OwnerPower } from "@/config/owner-powers";

import { PROMOTION_TABS } from "./sections/promotions/promotionTabs";

/** Lucide or Phosphor SVG icon used in settings nav (sidebar + in-page tabs). */
export type SettingsSectionIcon = LucideIcon | PhosphorIcon;

export type SettingsSection =
  | "account"
  | "store"
  | "policies"
  | "customization"
  | "promotions"
  | "checkout"
  | "shipping"
  | "payments"
  | "eav"
  | "apps"
  | "integrations"
  | "domains"
  | "notifications"
  | "team"
  | "security"
  | "sessions"
  | "billing";

export type SettingsSectionLabelKey =
  | "sectionStore"
  | "sectionCheckout"
  | "sectionTeam"
  | "sectionPolicies"
  | "sectionCustomization"
  | "sectionPromotions"
  | "sectionPayments"
  | "sectionShipping"
  | "sectionEav"
  | "sectionApps"
  | "sectionIntegrations"
  | "sectionDomains"
  | "sectionNotifications"
  | "sectionAccount"
  | "sectionSecurity"
  | "sectionSessions"
  | "sectionBilling";

/** Nav row: translated label key or literal label (checkout/team; English-only for now). */
export type SettingsSectionNavItem = {
  id: SettingsSection;
  labelKey: SettingsSectionLabelKey;
  icon: SettingsSectionIcon;
};

/**
 * Sections gated by a permission key; absent = visible to any member.
 *
 * A role sees a section only when it can change it (roles plan, owner 2026-10-02):
 * a Manager reads the checkout settings for the theme editor but is never shown
 * the Checkout tab. A single string requires that key; an array requires ANY.
 */
export const SECTION_PERMISSION: Partial<Record<SettingsSection, string | string[]>> = {
  store: "settings.manage",
  policies: "settings.manage",
  customization: "theming.manage",
  checkout: "settings.manage",
  eav: "products.edit",
  apps: "settings.manage",
  integrations: "integrations.manage",
  notifications: "settings.manage",
};

/** True if `has` satisfies a section's requirement (any-of for arrays; none = open). */
export function sectionMatchesPermission(
  required: string | string[] | undefined,
  has: (key: string) => boolean,
): boolean {
  if (!required) return true;
  return (Array.isArray(required) ? required : [required]).some((k) => has(k));
}

/**
 * Sections that are one of the owner's powers (config/owner-powers.ts): hidden from every team
 * member, Admin included, whatever their role holds.
 */
export const SECTION_OWNER_POWER: Partial<Record<SettingsSection, OwnerPower>> = {
  payments: "payments",
  domains: "domains",
  team: "team",
  security: "security",
  sessions: "sessions",
  billing: "billing",
};

/**
 * Sections holding one owner power beside parts a role may open: shown to whoever may open
 * either. Integrations: marketing pixels (integrations.manage) and the courier accounts (owner).
 */
export const SECTION_OWNER_PART: Partial<Record<SettingsSection, OwnerPower>> = {
  integrations: "couriers",
};

/**
 * Sections that hold apps (ids from config/apps.ts). Such a section shows only when
 * at least one of its apps is enabled for the store AND viewable by the user's role
 * — the same rule the sidebar applies to an app's link. Essential apps such as
 * shipping are always enabled, so for them only the role's view permission counts.
 */
export const SECTION_APPS: Partial<Record<SettingsSection, readonly string[]>> = {
  promotions: PROMOTION_TABS,
  shipping: ["shipping"],
};

/** What a user can reach, as the settings nav and page need it. */
export type SettingsSectionAccess = {
  has: (key: string) => boolean;
  isOwner: boolean;
  isSuperuser: boolean;
  canShowApp: (appId: string) => boolean;
  /** Paperbase support is in the dashboard ("Sign in as this shop"), signed in as the owner. */
  inSupportMode?: boolean;
  /** The permissions aren't known yet: nothing is hidden meanwhile. */
  isUnknown?: boolean;
};

/** True if the user may see a section: owner powers, then app gate, then permission gate. */
export function isSectionVisible(id: SettingsSection, access: SettingsSectionAccess): boolean {
  const power = SECTION_OWNER_POWER[id];
  if (power) return holdsOwnerPower(power, access);
  const apps = SECTION_APPS[id];
  if (apps && !apps.some((appId) => access.canShowApp(appId))) return false;
  const part = SECTION_OWNER_PART[id];
  if (part && holdsOwnerPower(part, access)) return true;
  return sectionMatchesPermission(SECTION_PERMISSION[id], access.has);
}

/**
 * The section the settings page shows and the sidebar highlights: the URL's `tab`
 * when the user can see it, else their first visible section, so nobody lands on a
 * panel missing from their nav (e.g. a staff member without the default "store").
 */
export function resolveSettingsSection(
  requested: string | null,
  visible: readonly SettingsSectionNavItem[],
): SettingsSection {
  const candidate = (requested ?? "").trim();
  return (visible.find((row) => row.id === candidate) ?? visible[0])?.id ?? "store";
}

/** Every settings section that exists, before any feature-flag filtering. */
export const ALL_SECTIONS: SettingsSectionNavItem[] = [
  { id: "store", labelKey: "sectionStore", icon: StorefrontIcon },
  { id: "policies", labelKey: "sectionPolicies", icon: GavelIcon },
  { id: "customization", labelKey: "sectionCustomization", icon: Palette },
  { id: "promotions", labelKey: "sectionPromotions", icon: Megaphone },
  { id: "checkout", labelKey: "sectionCheckout", icon: ShoppingCartIcon },
  { id: "shipping", labelKey: "sectionShipping", icon: TruckIcon },
  { id: "payments", labelKey: "sectionPayments", icon: Wallet },
  { id: "eav", labelKey: "sectionEav", icon: Layers },
  { id: "apps", labelKey: "sectionApps", icon: AppStoreLogoIcon },
  { id: "integrations", labelKey: "sectionIntegrations", icon: PlugsIcon },
  { id: "domains", labelKey: "sectionDomains", icon: Globe },
  { id: "notifications", labelKey: "sectionNotifications", icon: BellRingingIcon },
  { id: "team", labelKey: "sectionTeam", icon: Users },
  { id: "account", labelKey: "sectionAccount", icon: User },
  { id: "security", labelKey: "sectionSecurity", icon: Shield },
  { id: "sessions", labelKey: "sectionSessions", icon: MonitorSmartphone },
  { id: "billing", labelKey: "sectionBilling", icon: CreditCard },
];

/**
 * Custom domains stay hidden until the platform can actually serve them.
 *
 * With the API's TRAEFIK_CERT_PROVISIONING_ENABLED and HOST_STORE_ROUTING_ENABLED
 * off, connecting a domain still writes a real StoreDomain row and the background
 * verifier can flip it to active -- so the UI would badge it "Live" and tell the
 * merchant their store is at https://theirdomain.com while no certificate exists
 * and no hostname binds to a store. Pointing a live domain here on that promise
 * takes the shop down.
 *
 * Set NEXT_PUBLIC_DOMAINS_ENABLED=1 only once the shared storefront is serving
 * host-routed traffic and certificates are being issued.
 */
const DOMAINS_UI_ENABLED = process.env.NEXT_PUBLIC_DOMAINS_ENABLED === "1";

export const SECTIONS: SettingsSectionNavItem[] = ALL_SECTIONS.filter(
  (section) => section.id !== "domains" || DOMAINS_UI_ENABLED,
);
