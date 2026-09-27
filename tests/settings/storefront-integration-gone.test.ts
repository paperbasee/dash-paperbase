/**
 * The Storefront integration block is gone (2026-09-27): a storefront address
 * and a signing secret, from the days one shop ran its own storefront. The API
 * sent that storefront its cache purges; the storefront was retired on
 * 2026-09-26, and the API dropped both fields the day after. The block only ever
 * appeared in single-store mode, which no live shop runs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

describe("the Storefront integration block", () => {
  test("Settings neither shows nor sends the two fields", () => {
    for (const file of [
      "src/app/[locale]/(dashboard)/settings/sections/StoreInfoSection.tsx",
      "src/app/[locale]/(dashboard)/settings/useStoreSettings.ts",
      "src/hooks/useStoreSettingsCurrentQuery.ts",
    ]) {
      const source = read(file);
      expect(source, file).not.toContain("storefront_url");
      expect(source, file).not.toContain("revalidate_secret");
    }
  });

  test("its words are gone in both languages", () => {
    for (const messages of [en, bn]) {
      const words = Object.keys(messages.settings.store);
      expect(words.filter((key) => /^(storefrontIntegration|storefrontUrl|revalidateSecret)/.test(key))).toEqual([]);
    }
  });
});
