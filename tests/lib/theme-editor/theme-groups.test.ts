/**
 * The theme list: Basic is the free default outside every group, Fashion leads
 * (owner decision), other categories keep the API's order, and names follow the
 * viewer's language.
 */

import { describe, expect, test } from "vitest";

import en from "../../../messages/en.json";
import bn from "../../../messages/bn.json";
import type { ThemeSummary } from "@/lib/theme-editor/api";
import {
  CATEGORY_MESSAGE_KEYS,
  categoryLabel,
  groupThemes,
  themeName,
  themeNameByKey,
} from "@/lib/theme-editor/theme-groups";

const theme = (key: string, category: string | null, name_bn = `${key}-bn`): ThemeSummary => ({
  key,
  name: key.charAt(0).toUpperCase() + key.slice(1),
  name_bn,
  category,
});

const BASIC = theme("basic", null, "বেসিক");
const keys = (list: ThemeSummary[]) => list.map((t) => t.key);

describe("groupThemes", () => {
  test("only Basic: no groups and no headings", () => {
    expect(groupThemes([BASIC])).toEqual({ basic: BASIC, groups: [], showHeadings: false });
  });

  test("one category needs no heading", () => {
    const out = groupThemes([BASIC, theme("minimal", "fashion"), theme("bold", "fashion")]);
    expect(out.basic).toBe(BASIC);
    expect(out.groups.map((g) => [g.category, keys(g.themes)])).toEqual([
      ["fashion", ["minimal", "bold"]],
    ]);
    expect(out.showHeadings).toBe(false);
  });

  test("Fashion leads, other categories keep the API's order, uncategorised last", () => {
    const out = groupThemes([
      BASIC,
      theme("volt", "electronics"),
      theme("loose", null),
      theme("toybox", "toys"),
      theme("minimal", "Fashion"),
      theme("circuit", "electronics"),
      theme("bold", " fashion "),
    ]);
    expect(out.groups.map((g) => [g.category, keys(g.themes)])).toEqual([
      ["fashion", ["minimal", "bold"]],
      ["electronics", ["volt", "circuit"]],
      ["toys", ["toybox"]],
      [null, ["loose"]],
    ]);
    expect(out.showHeadings).toBe(true);
  });

  test("Basic is found wherever the API puts it, and never inside a group", () => {
    const out = groupThemes([theme("minimal", "fashion"), BASIC]);
    expect(out.basic).toBe(BASIC);
    expect(out.groups.flatMap((g) => keys(g.themes))).toEqual(["minimal"]);
  });

  test("no Basic in the list", () => {
    expect(groupThemes([theme("minimal", "fashion")]).basic).toBeNull();
  });

  test("does not reorder the caller's array", () => {
    const list = [BASIC, theme("volt", "electronics"), theme("minimal", "fashion")];
    groupThemes(list);
    expect(keys(list)).toEqual(["basic", "volt", "minimal"]);
  });
});

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
