import {
  ChartLineUpIcon,
  GearIcon,
  HouseIcon,
  ListChecksIcon,
  NewspaperClippingIcon,
  PackageIcon,
  SealPercentIcon,
  SquaresFourIcon,
  StorefrontIcon,
  UsersIcon,
  WarehouseIcon,
  type Icon,
} from "@phosphor-icons/react";

import type { MAIN_NAV_APP_IDS } from "@/config/apps";

/**
 * The main menu's icons: Phosphor, all one family. Only the menu uses these. Add new and
 * Settings > Apps keep each app's own `APP_CONFIG` icon.
 *
 * Drawn hollow, in both menus: the settings menu (settingsSections.ts) uses this weight too. The
 * owner tried them filled on 2026-10-07 and chose hollow the same day: "filled icons does not
 * looks good make them un filled across all the menu".
 */
export const NAV_ICON_WEIGHT = "regular";

/** Rows that are not apps: Home, the two groups, and the two links under the menu. */
export const NAV_ICONS = {
  home: HouseIcon,
  catalog: SquaresFourIcon,
  more: ListChecksIcon,
  viewMyShop: StorefrontIcon,
  settings: GearIcon,
} as const satisfies Record<string, Icon>;

/** One per main-menu app, so an app added to `MAIN_NAV_APP_IDS` fails the type check until it has one. */
export const MAIN_NAV_APP_ICONS: Readonly<Record<(typeof MAIN_NAV_APP_IDS)[number], Icon>> = {
  orders: PackageIcon,
  analytics: ChartLineUpIcon,
  customers: UsersIcon,
  inventory: WarehouseIcon,
  coupons: SealPercentIcon,
  blog: NewspaperClippingIcon,
};
