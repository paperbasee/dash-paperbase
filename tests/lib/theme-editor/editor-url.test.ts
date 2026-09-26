/**
 * The editor's page lives in its address (owner, 2026-09-26: a refresh on the checkout went back
 * to the home page).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { pageFromSearch, searchWithPage } from "@/lib/theme-editor/editor-url";
import { SLOT_PAGES } from "@/lib/theme-editor/slot-catalogue";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("the page in the address", () => {
  test("every page the editor has can be named there, and comes back as itself", () => {
    for (const page of SLOT_PAGES) {
      expect(pageFromSearch(searchWithPage("", page))).toBe(page);
    }
  });

  test("no page, or one the editor does not have, is the home page", () => {
    expect(pageFromSearch("")).toBe("home");
    expect(pageFromSearch("?page=nope")).toBe("home");
    expect(pageFromSearch("?page=header")).toBe("home");
  });

  test("anything else the address carries stays", () => {
    expect(searchWithPage("?tab=style&page=home", "checkout")).toBe("?tab=style&page=checkout");
  });
});

describe("the editor reads it and writes it", () => {
  const editor = fs.readFileSync(path.join(ROOT, "src/components/theme-editor/slots/SlotEditor.tsx"), "utf8");
  const route = fs.readFileSync(path.join(ROOT, "src/app/[locale]/(dashboard)/settings/customize/page.tsx"), "utf8");

  test("it opens on the page the address names", () => {
    expect(route).toContain("initialPage={pageFromSearch(searchParams.toString())}");
    expect(editor).toContain("useState<SlotPageKey>(initialPage)");
  });

  test("every change of page is written back, replacing the entry rather than adding one", () => {
    expect(editor).toMatch(/window\.history\.replaceState\(null, "", next\)/);
    expect(editor).not.toMatch(/window\.history\.pushState/);
  });
});
