/**
 * A theme's name and category in the viewer's language. (The grouped gallery of
 * themes these once also ordered went on 2026-09-25: the shop has one theme.)
 */

import { describe, expect, test } from "vitest";

import en from "../../../messages/en.json";
import bn from "../../../messages/bn.json";
import type { ThemeSummary } from "@/lib/theme-editor/api";
import {
  CATEGORY_MESSAGE_KEYS,
  categoryLabel,
  themeName,
  themeNameByKey,
} from "@/lib/theme-editor/theme-groups";

const theme = (key: string, category: string | null, name_bn = `${key}-bn`): ThemeSummary => ({
  key,
  name: key.charAt(0).toUpperCase() + key.slice(1),
  name_bn,
  category,
  available: true,
  card_styles: true,
});

const BASIC = theme("basic", null, "বেসিক");

describe("names by locale", () => {
  test("Bangla viewers get name_bn, everyone else the English name", () => {
    expect(themeName(BASIC, "bn")).toBe("বেসিক");
    expect(themeName(BASIC, "en")).toBe("Basic");
  });

  test("an empty Bangla name falls back to English", () => {
    expect(themeName({ name: "Minimal", name_bn: "  " }, "bn")).toBe("Minimal");
  });

  test("by key; a theme that is gone reads the caller's words, never the English key", () => {
    expect(themeNameByKey([BASIC], "basic", "bn", "অন্য একটি থিম")).toBe("বেসিক");
    expect(themeNameByKey([BASIC], "retired", "bn", "অন্য একটি থিম")).toBe("অন্য একটি থিম");
    expect(themeNameByKey([BASIC], null, "en", "Another theme")).toBe("");
  });
});

describe("categoryLabel", () => {
  test("known categories use a message, case and spaces ignored", () => {
    expect(categoryLabel("fashion")).toEqual({ key: "categoryFashion" });
    expect(categoryLabel(" Electronics ")).toEqual({ key: "categoryElectronics" });
    expect(categoryLabel(null)).toEqual({ key: "categoryOther" });
  });

  test("a category added later shows its own word until it gets a message", () => {
    expect(categoryLabel("beauty")).toEqual({ text: "Beauty" });
  });

  test("every category message exists in English and Bangla", () => {
    const enNs = (en as Record<string, any>).settings.customization;
    const bnNs = (bn as Record<string, any>).settings.customization;
    const all = [...Object.values(CATEGORY_MESSAGE_KEYS), "categoryOther"];
    expect(all.filter((k) => !enNs[k] || !bnNs[k] || enNs[k] === bnNs[k])).toEqual([]);
  });
});
