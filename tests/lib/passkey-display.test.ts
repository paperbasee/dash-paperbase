/**
 * Settings > Account > Passkeys (owner, 2026-10-07): each passkey's name, and a line saying where
 * it is saved, in English and Bangla.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";

import type { PasskeyInfo } from "@/lib/auth";
import { PASSKEY_PROVIDER_ICONS, passkeyTitle, passkeyWhere, shownProvider } from "@/lib/passkey-display";
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

const tEn = createTranslator({ locale: "en", messages: en, namespace: "settings.passkeys" });
const tBn = createTranslator({ locale: "bn", messages: bn, namespace: "settings.passkeys" });
const t = (key: string, values?: Record<string, string>) => tEn(key as never, values as never);
const b = (key: string, values?: Record<string, string>) => tBn(key as never, values as never);

const pk = (over: Partial<PasskeyInfo>): Pick<PasskeyInfo, "name" | "provider" | "provider_name"> => ({
  name: "",
  provider: "unknown",
  provider_name: "",
  ...over,
});

describe("each passkey's name", () => {
  it("is the merchant's own when they gave one", () => {
    expect(passkeyTitle(pk({ name: "Office laptop", provider: "google" }), t)).toBe("Office laptop");
  });

  it("is otherwise where it is saved, in the merchant's language", () => {
    expect(passkeyTitle(pk({ provider: "apple" }), t)).toBe("Apple Passwords");
    expect(passkeyTitle(pk({ provider: "security_key" }), t)).toBe("Security key");
    expect(passkeyTitle(pk({ provider: "security_key" }), b)).toBe("সিকিউরিটি কি");
    expect(passkeyTitle(pk({ provider: "app", provider_name: "1Password" }), t)).toBe("1Password");
    expect(passkeyTitle(pk({ provider: "unknown" }), t)).toBe("Passkey");
    expect(passkeyTitle(pk({ provider: "unknown" }), b)).toBe("পাসকি");
  });
});

describe("where each passkey is saved", () => {
  it("says it for every kind, in English and Bangla", () => {
    expect(passkeyWhere(pk({ provider: "apple" }), t)).toBe("Saved in Apple Passwords, on your iPhone, iPad and Mac");
    expect(passkeyWhere(pk({ provider: "google" }), t)).toBe("Saved in Google Password Manager, wherever you use Chrome");
    expect(passkeyWhere(pk({ provider: "windows" }), t)).toBe("Saved in Windows Hello on a Windows computer");
    expect(passkeyWhere(pk({ provider: "security_key" }), t)).toBe("On a security key you plug in or tap");
    expect(passkeyWhere(pk({ provider: "app", provider_name: "Bitwarden" }), t)).toBe("Saved in Bitwarden");
    expect(passkeyWhere(pk({ provider: "app", provider_name: "Bitwarden" }), b)).toBe("Bitwarden-এ রাখা");
    expect(passkeyWhere(pk({ provider: "unknown" }), b)).toBe("এটি কোথায় রাখা, তা আমরা বলতে পারছি না");
  });

  it("says it cannot tell for anything the API did not name", () => {
    expect(shownProvider(pk({ provider: "app", provider_name: "" }))).toBe("unknown");
    expect(shownProvider(pk({ provider: undefined as never }))).toBe("unknown");
    expect(passkeyWhere(pk({ provider: "something-new" as never }), t)).toBe("We can't tell where this one is saved");
  });

  it("has an icon and both languages' words for every kind", () => {
    for (const kind of Object.keys(PASSKEY_PROVIDER_ICONS)) {
      expect((en.settings.passkeys.provider as Record<string, { where: string }>)[kind].where).toBeTruthy();
      expect((bn.settings.passkeys.provider as Record<string, { where: string }>)[kind].where).toBeTruthy();
    }
  });

  it("is what the passkey list shows", () => {
    const src = readFileSync(
      path.join(__dirname, "../../src/app/[locale]/(dashboard)/settings/sections/PasskeysManager.tsx"),
      "utf8"
    );
    expect(src).toContain("passkeyTitle(pk, t)");
    expect(src).toContain("passkeyWhere(pk, t)");
    expect(src).toContain("PASSKEY_PROVIDER_ICONS[shownProvider(pk)]");
  });
});
