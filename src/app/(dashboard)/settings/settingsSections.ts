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
  Database,
} from "lucide-react";

export type SettingsSection =
  | "account"
  | "store"
  | "eav"
  | "apps"
  | "integrations"
  | "networking"
  | "notifications"
  | "security"
  | "billing"
  | "data";

export const SECTIONS: { id: SettingsSection; label: string; icon: LucideIcon }[] = [
  { id: "store", label: "Store Info", icon: Store },
  { id: "eav", label: "Dynamic Fields", icon: Layers },
  { id: "apps", label: "Apps", icon: LayoutGrid },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "networking", label: "Networking", icon: Network },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "account", label: "Account", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "data", label: "Data & Export", icon: Database },
];

