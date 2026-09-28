/**
 * Three things the owner met on 2026-09-29:
 *
 *   a category with products        a rule, said as a notice before asking -- not a red error
 *   Send to courier                 a send that ends without a parcel says so, and why
 *   "Blocked aria-hidden ..."       a dialog takes focus when it opens, and gives it back
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

describe("deleting a category that still has products", () => {
  const page = read("src/app/[locale]/(dashboard)/categories/page.tsx");

  test("counts the whole branch -- a delete takes the subcategories with it", () => {
    expect(page).toContain("(node.product_count ?? 0) + (node.children ?? []).reduce((sum, child) => sum + productsInBranch(child), 0)");
  });

  test("says what to do as a notice, before asking anything", () => {
    const handler = page.slice(page.indexOf("async function deleteCategory"));
    expect(handler.indexOf("notify.warning(")).toBeLessThan(handler.indexOf("await confirm({"));
    expect(handler).toContain('{ key: "pages.categoriesNotEmpty", values: { count: inBranch, name: node.name } }');
  });

  test("the server's refusal is the same notice, not a red error", () => {
    const handler = page.slice(page.indexOf("async function deleteCategory"));
    expect(handler).toContain('if (code === "category_not_empty") {');
    expect(handler.indexOf('code === "category_not_empty"')).toBeLessThan(handler.indexOf("notify.error("));
  });

  test("its words in both languages, counted in Bangla digits there", () => {
    for (const key of ["categoriesNotEmpty", "categoriesNotEmptyTitle", "categoriesNotEmptyUnknown"] as const) {
      expect(en.pages[key], key).toBeTruthy();
      expect(bn.pages[key], key).toBeTruthy();
    }
    expect(bn.pages.categoriesNotEmpty).toContain("{count, number}");
  });
});

describe("Send to courier", () => {
  const page = read("src/app/[locale]/(dashboard)/orders/page.tsx");

  test("a send that ends without a parcel says so, with the order's own reason", () => {
    const poll = page.slice(page.indexOf("async function pollOrder"));
    expect(poll).toContain("if (!data.sent_to_courier) {");
    expect(poll).toContain('notify.error(data.courier_dispatch_error || tPages("ordersSendToCourierErrorFallback"), {');
    expect(poll).toContain('title: tPages("toastTitleCourierSendFailed", { number: data.order_number }),');
  });

  test("its title in both languages", () => {
    expect(en.pages.toastTitleCourierSendFailed).toContain("{number}");
    expect(bn.pages.toastTitleCourierSendFailed).toContain("{number}");
  });
});

describe("dialogs and focus", () => {
  test("a dialog or a sheet takes focus when it opens, so none is left behind what it hides", () => {
    for (const file of ["src/components/ui/dialog.tsx", "src/components/ui/sheet.tsx"]) {
      const source = read(file);
      expect(source, file).toContain(";(event.target as HTMLElement | null)?.focus({ preventScroll: true })");
    }
  });

  test("the confirm dialog gives focus back to the button that asked", () => {
    const context = read("src/context/ConfirmDialogContext.tsx");
    expect(context).toContain("opener: active instanceof HTMLElement ? active : null");
    expect(context).toContain("returnFocusTo={entry.opener}");
    const dialog = read("src/components/ui/ConfirmDialog.tsx");
    expect(dialog).toContain("returnFocusTo.focus({ preventScroll: true });");
  });
});
