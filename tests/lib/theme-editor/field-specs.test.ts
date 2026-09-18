import { describe, expect, it } from "vitest";

import type { ThemeManifest, ThemeSettingSpec } from "@/lib/theme-editor/api";
import {
  blockChoices,
  blockFields,
  fieldSpecs,
  fieldValue,
  sectionFields,
} from "@/lib/theme-editor/field-specs";

import { manifest } from "./fixtures";

const labels = (label: string) => ({ label, label_bn: `${label} (bn)` });

/** One setting of every kind the API validates, plus one it does not. */
const SPECS: ThemeSettingSpec[] = [
  { id: "message", type: "text", ...labels("Message"), default: "", help: "One line", help_bn: "এক লাইন" },
  { id: "body", type: "textarea", ...labels("Body"), default: "" },
  { id: "link", type: "url", ...labels("Link"), default: "" },
  { id: "wide", type: "boolean", ...labels("Full width"), default: false },
  { id: "rows", type: "number", ...labels("Rows"), default: 2, min: 1, max: 6 },
  {
    id: "align",
    type: "select",
    ...labels("Alignment"),
    default: "center",
    options: ["left", "center"],
    option_labels: { left: { en: "Left", bn: "বাঁ দিকে" }, center: { en: "Center", bn: "মাঝখানে" } },
  },
  { id: "picture", type: "image", ...labels("Picture"), default: "" },
  // A kind no theme ships and this dashboard cannot draw.
  { id: "clip", type: "video", ...labels("Clip"), default: "" },
];

describe("fieldSpecs", () => {
  it("describes every kind the API validates", () => {
    expect(fieldSpecs(SPECS, "en").map((f) => [f.id, f.kind, f.maxLength, f.min, f.max])).toEqual([
      ["message", "text", 200, null, null],
      ["body", "textarea", 2000, null, null],
      ["link", "url", 500, null, null],
      ["wide", "boolean", null, null, null],
      ["rows", "number", null, 1, 6],
      ["align", "select", null, null, null],
      ["picture", "image", null, null, null],
    ]);
  });

  it("leaves out a kind this dashboard cannot draw", () => {
    expect(fieldSpecs(SPECS, "en").map((f) => f.id)).not.toContain("clip");
  });

  it("names the field, its help and its choices in the reader's language", () => {
    const [message] = fieldSpecs(SPECS, "bn");
    expect(message.label).toBe("Message (bn)");
    expect(message.help).toBe("এক লাইন");
    const align = fieldSpecs(SPECS, "bn").find((f) => f.id === "align");
    expect(align?.options).toEqual([
      { value: "left", label: "বাঁ দিকে" },
      { value: "center", label: "মাঝখানে" },
    ]);
  });

  it("falls back to English when a theme leaves Bangla out", () => {
    const only: ThemeSettingSpec[] = [{ id: "a", type: "text", label: "A", label_bn: "", default: "" }];
    expect(fieldSpecs(only, "bn")[0].label).toBe("A");
    expect(fieldSpecs(only, "bn")[0].help).toBeNull();
  });

  it("has no fields for a section, block or theme that offers none", () => {
    expect(fieldSpecs(undefined, "en")).toEqual([]);
    expect(sectionFields(manifest, "header", "en")).toEqual([]);
    expect(sectionFields(manifest, "not_a_section", "en")).toEqual([]);
    expect(blockFields(manifest, "product_details", "title", "en")).toEqual([]);
    expect(blockFields(manifest, "product_details", "not_a_block", "en")).toEqual([]);
  });

  it("reads a section's and a block's own settings", () => {
    expect(sectionFields(manifest, "announcement_bar", "en").map((f) => f.kind)).toEqual(["text", "url"]);
    expect(blockFields(manifest, "product_details", "custom_text", "en").map((f) => f.kind)).toEqual([
      "textarea",
    ]);
  });
});

describe("fieldValue", () => {
  const [spec] = fieldSpecs(SPECS, "en");

  it("shows what is stored", () => {
    expect(fieldValue(spec, { message: "Free delivery" })).toBe("Free delivery");
  });

  it("falls back to the theme's default, which is what the API fills in", () => {
    expect(fieldValue(spec, {})).toBe("");
    expect(fieldValue(spec, undefined)).toBe("");
    expect(fieldValue(fieldSpecs(SPECS, "en")[4], {})).toBe(2);
  });

  it("keeps a stored value the theme would not default to, including false", () => {
    const wide = fieldSpecs(SPECS, "en")[3];
    expect(fieldValue(wide, { wide: true })).toBe(true);
    expect(fieldValue(wide, { wide: false })).toBe(false);
  });
});

describe("blockChoices", () => {
  it("lists a section's blocks in the theme's order, in the reader's language", () => {
    expect(blockChoices(manifest.sections.product_details, "bn")).toEqual([
      { type: "title", label: "Title (bn)" },
      { type: "buy_buttons", label: "Buy buttons (bn)" },
      { type: "custom_text", label: "Custom text (bn)" },
    ]);
  });

  it("is empty for a section that takes none", () => {
    expect(blockChoices(manifest.sections.header, "en")).toEqual([]);
    expect(blockChoices(undefined as unknown as ThemeManifest["sections"][string], "en")).toEqual([]);
  });
});
