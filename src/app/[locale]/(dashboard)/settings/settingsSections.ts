import type { LucideIcon } from "lucide-react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { 
  CellTowerIcon, 
  PlugsIcon, 
  StorefrontIcon, 
  ShoppingCartIcon, 
  BellRingingIcon, 
  AppStoreLogoIcon,
} from "@phosphor-icons/react";

import {
  Layers,
  User,
  Shield,
  CreditCard,
  Palette,
  Users,
} from "lucide-react";

/** Lucide or Phosphor SVG icon used in settings nav (sidebar + in-page tabs). */
export type SettingsSectionIcon = LucideIcon | PhosphorIcon;

export type SettingsSection =
  | "account"
  | "store"
  | "customization"
  | "checkout"
  | "eav"
  | "apps"
  | "integrations"
  | "networking"
  | "notifications"
  | "team"
  | "security"
  | "billing";

export type SettingsSectionLabelKey =
  | "sectionStore"
  | "sectionCustomization"
  | "sectionEav"
  | "sectionApps"
  | "sectionIntegrations"
  | "sectionNetworking"
  | "sectionNotifications"
  | "sectionAccount"
  | "sectionSecurity"
  | "sectionBilling";

/** Nav row: translated label key or literal label (checkout/team; English-only for now). */
export type SettingsSectionNavItem =
  | {
      id: Exclude<SettingsSection, "checkout" | "team">;
      labelKey: SettingsSectionLabelKey;
      icon: SettingsSectionIcon;
    }
  | { id: "checkout" | "team"; displayLabel: string; icon: SettingsSectionIcon };

/**
 * Sections gated by RBAC permission key(s); absent = visible to any staff.
 *
 * The key mirrors what the section's backend GET requires, so a role that can't
 * load a section never sees its nav row (fixes "shown but 403s" for staff). A
 * single string requires that key; an array requires ANY of the keys — used by
 * Integrations, which bundles marketing (integrations.*) + couriers (couriers.*).
 */
export const SECTION_PERMISSION: Partial<Record<SettingsSection, string | string[]>> = {
  store: "settings.view",
  customization: "theming.view",
  checkout: "settings.view",
  eav: "products.view",
  apps: "settings.view",
  integrations: ["integrations.view", "couriers.view"],
  networking: "api_keys.view",
  notifications: "settings.manage",
  team: "team.view",
  billing: "billing.view",
};

/** True if `has` satisfies a section's requirement (any-of for arrays; none = open). */
export function sectionMatchesPermission(
  required: string | string[] | undefined,
  has: (key: string) => boolean,
): boolean {
  if (!required) return true;
  return (Array.isArray(required) ? required : [required]).some((k) => has(k));
}

/** Sections only the store owner (or platform superuser) may see. */
export const SECTION_OWNER_ONLY: Partial<Record<SettingsSection, boolean>> = {
  security: true,
};

export const SECTIONS: SettingsSectionNavItem[] = [
  { id: "store", labelKey: "sectionStore", icon: StorefrontIcon },
  { id: "customization", labelKey: "sectionCustomization", icon: Palette },
  {
    id: "checkout",
    displayLabel: "Checkout",
    icon: ShoppingCartIcon,
  },
  { id: "eav", labelKey: "sectionEav", icon: Layers },
  { id: "apps", labelKey: "sectionApps", icon: AppStoreLogoIcon },
  { id: "integrations", labelKey: "sectionIntegrations", icon: PlugsIcon },
  { id: "networking", labelKey: "sectionNetworking", icon: CellTowerIcon },
  { id: "notifications", labelKey: "sectionNotifications", icon: BellRingingIcon },
  { id: "team", displayLabel: "Team", icon: Users },
  { id: "account", labelKey: "sectionAccount", icon: User },
  { id: "security", labelKey: "sectionSecurity", icon: Shield },
  { id: "billing", labelKey: "sectionBilling", icon: CreditCard },
];
