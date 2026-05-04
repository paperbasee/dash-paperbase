import type { LucideIcon } from "lucide-react";
import {
  Store,
  Layers,
  LayoutGrid,
  Plug,
  Network,
  Bell,
  User,
  Shield,
  CreditCard,
  Palette,
  ShoppingCart,
} from "lucide-react";

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
      icon: LucideIcon;
    }
  | { id: "checkout"; displayLabel: string; icon: LucideIcon };

export const SECTIONS: SettingsSectionNavItem[] = [
  { id: "store", labelKey: "sectionStore", icon: Store },
  { id: "customization", labelKey: "sectionCustomization", icon: Palette },
  {
    id: "checkout",
    displayLabel: "Checkout",
    icon: ShoppingCart,
  },
  { id: "eav", labelKey: "sectionEav", icon: Layers },
  { id: "apps", labelKey: "sectionApps", icon: LayoutGrid },
  { id: "integrations", labelKey: "sectionIntegrations", icon: Plug },
  { id: "networking", labelKey: "sectionNetworking", icon: Network },
  { id: "notifications", labelKey: "sectionNotifications", icon: Bell },
  { id: "account", labelKey: "sectionAccount", icon: User },
  { id: "security", labelKey: "sectionSecurity", icon: Shield },
  { id: "billing", labelKey: "sectionBilling", icon: CreditCard },
];
