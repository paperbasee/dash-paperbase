/**
 * Settings -> Store Info -> Identity: the one place the shop's phone, email, address and social
 * accounts are typed (owner, 2026-09-29: "the identity in the store info tab will be the source of
 * truth"). The theme editor's footer and Sign-up places only read the accounts.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";

import { IdentityAccounts } from "@/app/[locale]/(dashboard)/settings/sections/IdentityAccounts";
import {
  accountFor,
  accountsFromApi,
  accountsToSave,
  availableTargets,
  SIGNUP_TARGETS,
  SOCIAL_PLATFORMS,
  type SocialAccount,
} from "@/lib/storeSocialLinks";
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");
const EDITOR = read("src/components/theme-editor/slots/SlotEditor.tsx");
const API_RULES = path.resolve(ROOT, "../api-paperbase/engine/apps/stores/social_links.py");

const ACCOUNTS: SocialAccount[] = [
  { platform: "youtube", account: "@gadzilla" },
  { platform: "facebook", account: "facebook.com/gadzilla" },
  { platform: "whatsapp", account: "01712-345678" },
];

describe("the accounts", () => {
  test("read from the API in the merchant's order, and nothing this screen cannot draw", () => {
    const raw = [
      ...ACCOUNTS,
      { platform: "myspace", account: "x" },
      { platform: "youtube", account: "@again" },
      "junk",
      { platform: "x" },
    ];
    expect(accountsFromApi(raw)).toEqual(ACCOUNTS);
    expect(accountsFromApi({ facebook: "old four boxes" })).toEqual([]);
  });

  test("saved trimmed, and a box left empty is not an account", () => {
    expect(
      accountsToSave([
        { platform: "x", account: "  @gadzilla " },
        { platform: "tiktok", account: "   " },
      ]),
    ).toEqual([{ platform: "x", account: "@gadzilla" }]);
  });

  test("Messenger is the Facebook page's chat; the rest their own account", () => {
    expect(accountFor("messenger", ACCOUNTS)?.platform).toBe("facebook");
    expect(accountFor("instagram", ACCOUNTS)).toBeUndefined();
    expect(availableTargets(ACCOUNTS)).toEqual(["whatsapp", "messenger", "facebook", "youtube"]);
  });

  test.skipIf(!fs.existsSync(API_RULES))("the same platforms, in the same order, as the API's", () => {
    const source = fs.readFileSync(API_RULES, "utf8");
    const block = source.slice(source.indexOf("PLATFORMS: tuple[str, ...] = ("), source.indexOf(")\n", source.indexOf("PLATFORMS: tuple")));
    expect([...block.matchAll(/"([a-z]+)"/g)].map((match) => match[1])).toEqual([...SOCIAL_PLATFORMS]);
    expect(SIGNUP_TARGETS).toEqual(["whatsapp", "messenger", ...SOCIAL_PLATFORMS.slice(1)]);
  });
});

describe("the list in Settings", () => {
  const draw = (accounts: SocialAccount[], problem: { platform: "tiktok" } | null = null) =>
    renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={en}>
        <IdentityAccounts accounts={accounts} onChange={() => {}} problem={problem} />
      </NextIntlClientProvider>,
    );

  test("a row per account, in order, each with its box and its Phosphor logo", () => {
    const html = draw(ACCOUNTS);
    expect(html.match(/<input/g)).toHaveLength(ACCOUNTS.length);
    expect(html.indexOf('value="@gadzilla"')).toBeLessThan(html.indexOf('value="01712-345678"'));
    // Phosphor draws on a 256 box: a logo per row, and the add button's is lucide's.
    expect(html.match(/viewBox="0 0 256 256"/g)).toHaveLength(ACCOUNTS.length);
    expect(html).toContain("Add account");
  });

  test("with nothing added yet, it says so", () => {
    expect(draw([])).toContain(en.settings.identity.accountsEmpty);
  });

  test("an account the API could not read is marked on its own row", () => {
    const html = draw([{ platform: "tiktok", account: "see our page" }], { platform: "tiktok" });
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("This does not look like a TikTok account");
  });

  test("every platform has a name in both languages", () => {
    for (const platform of SOCIAL_PLATFORMS) {
      expect(en.settings.identity.platforms[platform], platform).toBeTruthy();
      expect(bn.settings.identity.platforms[platform], platform).toBeTruthy();
    }
  });
});

describe("saved from Settings, and only there", () => {
  test("Store Info sends every account on every save, as a list", () => {
    const save = read("src/app/[locale]/(dashboard)/settings/useStoreSettings.ts");
    expect(save).toContain('formData.append("social_links", JSON.stringify(accountsToSave(accounts)));');
  });

  test("the theme editor never writes them", () => {
    expect(EDITOR).not.toContain("admin/branding/");
    expect(EDITOR).not.toMatch(/pendingLinks|saveSocialLinks/);
    expect(fs.existsSync(path.join(ROOT, "src/components/theme-editor/slots/SocialLinksFields.tsx"))).toBe(false);
  });

  test("its footer and Sign-up places send the merchant to Identity, in a new tab", () => {
    expect(EDITOR).toContain("href={`/${locale}${IDENTITY_HREF}`}");
    expect(EDITOR).toContain('target="_blank"');
  });

  test("the Sign-up place offers only the accounts this shop has, and what it is set to now", () => {
    expect(EDITOR).toContain("slot={shownSlot(openSlot, open)}");
    for (const target of SIGNUP_TARGETS) {
      const label = `signup${target[0].toUpperCase()}${target.slice(1)}` as keyof typeof en.themeEditor.slots;
      expect(en.themeEditor.slots[label], target).toBeTruthy();
      expect(bn.themeEditor.slots[label], target).toBeTruthy();
    }
  });
});
