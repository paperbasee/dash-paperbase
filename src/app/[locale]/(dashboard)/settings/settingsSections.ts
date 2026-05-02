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
} from "lucide-react";

export type SettingsSection =
  | "account"
  | "store"
  | "customization"
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

export const SECTIONS: {
  id: SettingsSection;
  labelKey: SettingsSectionLabelKey;
  icon: LucideIcon;
}[] = [
  { id: "store", labelKey: "sectionStore", icon: Store },
  { id: "customization", labelKey: "sectionCustomization", icon: Palette },
  { id: "eav", labelKey: "sectionEav", icon: Layers },
  { id: "apps", labelKey: "sectionApps", icon: LayoutGrid },
  { id: "integrations", labelKey: "sectionIntegrations", icon: Plug },
  { id: "networking", labelKey: "sectionNetworking", icon: Network },
  { id: "notifications", labelKey: "sectionNotifications", icon: Bell },
  { id: "account", labelKey: "sectionAccount", icon: User },
  { id: "security", labelKey: "sectionSecurity", icon: Shield },
  { id: "billing", labelKey: "sectionBilling", icon: CreditCard },
];
