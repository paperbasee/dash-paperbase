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

/** Nav row: translated label key or literal label (checkout; English-only for now). */
export type SettingsSectionNavItem =
  | {
      id: Exclude<SettingsSection, "checkout">;
      labelKey: SettingsSectionLabelKey;
      icon: SettingsSectionIcon;
    }
  | { id: "checkout"; displayLabel: string; icon: SettingsSectionIcon };

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
  { id: "account", labelKey: "sectionAccount", icon: User },
  { id: "security", labelKey: "sectionSecurity", icon: Shield },
  { id: "billing", labelKey: "sectionBilling", icon: CreditCard },
];
