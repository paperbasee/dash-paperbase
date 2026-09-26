/**
 * The shop's social links are typed in the theme editor (owner, 2026-09-26: "we are moving the
 * social links input field from settings to the theme editor. Yes."), in the footer's Social links
 * place, and saved where they always were -- so the live shop, the footer and the Sign-up band all
 * read one answer.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";

import { SocialLinksFields } from "@/components/theme-editor/slots/SocialLinksFields";
import { hasLinkFor, linkBoxFor, SIGNUP_PLATFORMS, STORE_SOCIAL_LINK_KEYS } from "@/lib/storeSocialLinks";
import en from "../../messages/en.json";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");
const EDITOR = read("src/components/theme-editor/slots/SlotEditor.tsx");

const LINKS = { facebook: "facebook.com/gadzilla", instagram: "", whatsapp: "01712-345678", tiktok: "@gadzilla" };

describe("the boxes", () => {
  const html = renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en}>
      <SocialLinksFields values={LINKS} onChange={() => {}} />
    </NextIntlClientProvider>,
  );

  test("a box for each link the shop keeps, holding what it has", () => {
    expect(html.match(/<input/g)).toHaveLength(STORE_SOCIAL_LINK_KEYS.length);
    expect(html).toContain('value="facebook.com/gadzilla"');
    expect(html).toContain('value="01712-345678"');
  });

  test("each with its platform's Phosphor logo", () => {
    // Phosphor draws on a 256 box; one logo per box.
    expect(html.match(/viewBox="0 0 256 256"/g)).toHaveLength(STORE_SOCIAL_LINK_KEYS.length);
  });

  test("and says when they are saved, as every shop setting in the editor must", () => {
    expect(en.themeEditor.slots.socialLinksSaved).toMatch(/^Saved when you press Save to store/);
    expect(html).toContain("Saved when you press Save to store");
  });
});

describe("saving them", () => {
  test("with Save to store, all four at once, where Settings saved them", () => {
    // The API keeps only what it is sent: a box left out of the save would be emptied.
    expect(EDITOR).toContain('api.patch("admin/branding/", { social_links: links })');
    expect(EDITOR).toMatch(/const social = await saveSocialLinks\(\);/);
  });

  test("starting over gives up the ones typed and not saved", () => {
    const startedOver = EDITOR.slice(EDITOR.indexOf("const startedOver = () => {"));
    expect(startedOver.slice(0, startedOver.indexOf("};"))).toContain("setPendingLinks({})");
  });
});

describe("Settings no longer asks for them", () => {
  test("no box, and its save sends none -- which the API reads as leaving them alone", () => {
    const section = read("src/app/[locale]/(dashboard)/settings/sections/StoreInfoSection.tsx");
    const save = read("src/app/[locale]/(dashboard)/settings/useStoreSettings.ts");
    expect(section).not.toMatch(/social/i);
    expect(save).not.toContain("social_links");
  });
});

describe("the Sign-up band's link", () => {
  test("Messenger reads the Facebook page's box; the rest their own", () => {
    expect(linkBoxFor("messenger")).toBe("facebook");
    for (const platform of SIGNUP_PLATFORMS.filter((one) => one !== "messenger")) {
      expect(linkBoxFor(platform)).toBe(platform);
    }
  });

  test("a platform with an empty box is one the editor asks the merchant to fill", () => {
    expect(hasLinkFor("instagram", LINKS)).toBe(false);
    expect(hasLinkFor("messenger", LINKS)).toBe(true);
    expect(EDITOR).toContain('openPlace({ page: "footer", key: "social" }, { scroll: true })');
  });
});
