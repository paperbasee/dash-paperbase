import {
  AppleLogoIcon,
  GoogleLogoIcon,
  QuestionIcon,
  UsbIcon,
  VaultIcon,
  WindowsLogoIcon,
  type Icon,
} from "@phosphor-icons/react";

import type { PasskeyInfo, PasskeyProvider } from "@/lib/auth";

/**
 * How Settings > Account > Passkeys shows each passkey (owner, 2026-10-07): its name, and a line
 * saying where it is saved. A passkey the merchant never named is named after where it is saved,
 * in their language. `t` is the `settings.passkeys` translator.
 */
type Translate = (key: string, values?: Record<string, string>) => string;

const PROVIDERS: ReadonlySet<PasskeyProvider> = new Set(["apple", "google", "windows", "app", "security_key", "unknown"]);

export const PASSKEY_PROVIDER_ICONS: Readonly<Record<PasskeyProvider, Icon>> = {
  apple: AppleLogoIcon,
  google: GoogleLogoIcon,
  windows: WindowsLogoIcon,
  app: VaultIcon,
  security_key: UsbIcon,
  unknown: QuestionIcon,
};

/** The provider to show: "unknown" for anything the API did not name, or an app with no name. */
export function shownProvider(pk: Pick<PasskeyInfo, "provider" | "provider_name">): PasskeyProvider {
  if (!PROVIDERS.has(pk.provider)) return "unknown";
  if (pk.provider === "app" && !pk.provider_name) return "unknown";
  return pk.provider;
}

export function passkeyTitle(pk: Pick<PasskeyInfo, "name" | "provider" | "provider_name">, t: Translate): string {
  if (pk.name) return pk.name;
  const provider = shownProvider(pk);
  if (provider === "app") return pk.provider_name;
  if (provider === "unknown") return t("unnamed");
  return t(`provider.${provider}.name`);
}

export function passkeyWhere(pk: Pick<PasskeyInfo, "provider" | "provider_name">, t: Translate): string {
  const provider = shownProvider(pk);
  if (provider === "app") return t("provider.app.where", { name: pk.provider_name });
  return t(`provider.${provider}.where`);
}
