/**
 * The pop-up notes, small and minimal (owner, 2026-09-29: "like shopify uses and other big tech
 * uses"): an icon, the words, an action where there is one, a close mark -- at the bottom, centred
 * in the area being worked in, and full width at the bottom of a phone.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";

import { Toast } from "@/components/notifications/Toast";
import en from "../../messages/en.json";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

const note = (props: Partial<Parameters<typeof Toast>[0]> = {}) =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en}>
      <Toast variant="success" message="Product saved" {...props} />
    </NextIntlClientProvider>,
  );

describe("one note", () => {
  test("an icon, the words and a close mark -- nothing else", () => {
    const html = note();
    expect(html).toContain("Product saved");
    expect(html).toContain("lucide-circle-check");
    expect(html).toContain(`aria-label="${en.common.close}"`);
    // The old card's coloured bar named the kind, and its footer had a Close button in words.
    expect(html).not.toContain("uppercase");
    expect(html.match(/<button/g)).toHaveLength(1);
  });

  test("thin-line icons, one per kind", () => {
    expect(note({ variant: "error", message: "Couldn't save" })).toContain("lucide-circle-alert");
    expect(note({ variant: "warning", message: "Slow down" })).toContain("lucide-triangle-alert");
    expect(note({ variant: "info", message: "Heads up" })).toContain("lucide-info");
    expect(note({ iconName: "trash", message: "Moved to trash" })).toContain("lucide-trash");
    expect(note()).toContain('stroke-width="1.75"');
  });

  test("an error interrupts a screen reader; good news waits its turn", () => {
    expect(note({ variant: "error", message: "Couldn't save" })).toContain('role="alert"');
    expect(note()).toContain('role="status"');
  });

  test("an action only where the caller offers one", () => {
    const html = note({ message: "2 products moved to trash", action: { label: "Undo", onClick: () => {} } });
    expect(html).toContain(">Undo<");
    expect(html.match(/<button/g)).toHaveLength(2);
  });

  test("a title, when given, above a softer line", () => {
    const html = note({ variant: "error", title: "Couldn't save the product", message: "The name is already used." });
    expect(html.indexOf("Couldn&#x27;t save the product")).toBeLessThan(html.indexOf("The name is already used."));
    expect(html).toContain("text-muted-foreground");
  });
});

describe("how long, how many, and where", () => {
  test("done notes go after 3 seconds, errors after 8 -- errors no longer stay until closed", () => {
    const provider = read("src/notifications/NotificationProvider.tsx");
    expect(provider).toMatch(/success: 3000,/);
    expect(provider).toMatch(/error: 8000,/);
    expect(provider).not.toContain("error: Number.POSITIVE_INFINITY");
  });

  test("three at most, at the bottom centre, full width on a phone", () => {
    const viewport = read("src/components/notifications/NotificationViewport.tsx");
    expect(viewport).toContain('position="bottom-center"');
    expect(viewport).toContain("visibleToasts={3}");
    expect(viewport).toContain('mobileOffset={{ bottom: `calc(${LIFT} + 12px)`, left: "12px", right: "12px" }}');
  });

  test("they rise above the phone's keyboard and the editor's sheet", () => {
    const viewport = read("src/components/notifications/NotificationViewport.tsx");
    expect(viewport).toContain('const LIFT = "max(var(--toast-keyboard, 0px), var(--toast-sheet, 0px))";');
    expect(viewport).toContain("window.visualViewport");
  });

  test("centred in the working area on a computer: beside the sidebar, or beside the editor's panel", () => {
    const css = read("src/app/globals.css");
    const rule = css.slice(css.indexOf('html [data-sonner-toaster][data-x-position="center"]'));
    expect(rule).toContain("var(--toast-area-left, var(--dashboard-main-left-inset, 0px))");
    expect(rule).toContain("var(--toast-area-right, 0px)");
    // Outside every layer: the library's own stylesheet is unlayered and would win otherwise.
    const before = css.slice(0, css.indexOf('html [data-sonner-toaster][data-x-position="center"]'));
    expect(before.lastIndexOf("@layer")).toBeLessThan(before.lastIndexOf("}\n"));

    const editor = read("src/components/theme-editor/slots/SlotEditor.tsx");
    expect(editor).toContain('useToastAreaLeft("0px");');
    expect(editor).toContain('useToastAvoid(panelRef, "right", wide);');
    expect(editor).toContain('useToastAvoid(sheetRef, "bottom", sheetOpen);');
    expect(editor).toContain("ref={panelRef}");
    expect(editor).toContain("ref={sheetRef}");
  });
});
