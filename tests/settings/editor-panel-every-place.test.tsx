/**
 * Every place on every page of the editor opens in the side panel (2026-09-26).
 *
 * The redesign moved every place's settings from a pop-up into the panel and
 * drew them from the kit. This opens each wired place, on a document built from
 * the real theme file, and fails if one throws, draws nothing, or draws a
 * control the kit does not make -- so a place added later is checked the day it
 * is added, not the day a merchant opens it.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";

import type { ThemeDocument, ThemeManifest } from "@/lib/theme-editor/api";
import { newSection, pageSections, withPageSections } from "@/lib/theme-editor/document-ops";
import { SLOTS, type SlotPageKey } from "@/lib/theme-editor/slot-catalogue";
import { ownerOf, sectionFor, sectionTypesOf, wiringFor } from "@/lib/theme-editor/slot-sections";
import { SlotPanel } from "@/components/theme-editor/slots/SlotPanel";
import en from "../../messages/en.json";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const THEME = path.resolve(ROOT, "../api-paperbase/engine/apps/theming/themes/storefront.json");

/** A document holding every page's and group's default sections, as a fresh shop has. */
function documentOf(manifest: ThemeManifest): ThemeDocument {
  const raw = manifest as unknown as {
    groups: Record<string, { default: { type: string }[] }>;
    templates: Record<string, { default: { type: string }[] }>;
  };
  const taken: string[] = [];
  const build = (list: { type: string }[]) =>
    list.map((one) => {
      const section = newSection(manifest, one.type, taken);
      taken.push(section.id);
      return section;
    });
  return {
    theme: "storefront",
    settings: {},
    header: { sections: build(raw.groups.header.default) },
    footer: { sections: build(raw.groups.footer.default) },
    templates: Object.fromEntries(Object.entries(raw.templates).map(([name, spec]) => [name, { sections: build(spec.default) }])),
  } as unknown as ThemeDocument;
}

describe.skipIf(!fs.existsSync(THEME))("every place opens in the side panel", () => {
  const manifest = JSON.parse(fs.readFileSync(THEME, "utf8")) as ThemeManifest;

  const places = (Object.keys(SLOTS) as SlotPageKey[]).flatMap((page) =>
    SLOTS[page].map((slot) => ({ page, slot })),
  );

  for (const { page, slot } of places) {
    const owner = ownerOf(page, slot);
    const wiring = wiringFor(owner.page, owner.key);
    if (!wiring) continue;

    test(`${page}:${slot.key}`, () => {
      // The section this place edits, added where a fresh shop does not have it.
      let document = documentOf(manifest);
      if (!sectionFor(document, wiring)) {
        const type = sectionTypesOf(wiring)[0];
        const sections = pageSections(document, wiring.page);
        const section = newSection(manifest, type, sections.map((one) => one.id));
        document = withPageSections(document, wiring.page, [...sections, section]);
      }

      const html = renderToStaticMarkup(
        <NextIntlClientProvider locale="en" messages={en}>
          <SlotPanel
            slot={slot}
            page={owner.page}
            wiring={wiring}
            manifest={manifest}
            document={document}
            premiumSections
            pictures={[]}
            pictureUrl={() => ""}
            productName={(id) => id}
            departments={[{ value: "cat_men", label: "Men" }]}
            onChoose={() => {}}
            onSet={() => {}}
            onSetBlock={() => {}}
            onSetBlocks={() => {}}
            onAddBlock={() => {}}
            onRemoveBlock={() => {}}
            onMoveBlock={() => {}}
            onClose={() => {}}
          />
        </NextIntlClientProvider>,
      );

      // The place's own name heads it, and the way back to Style is there.
      const label = (en.themeEditor.slots as Record<string, string>)[slot.label];
      expect(html).toContain(label.replace(/&/g, "&amp;").replace(/'/g, "&#x27;"));
      expect(html).toContain(`aria-label="${en.themeEditor.kit.close}"`);
      // Nothing from before the kit: the old dialog's footer button, or a plain select.
      expect(html).not.toContain(">Done</button>");
      expect(html).not.toMatch(/<select(?![^>]*rounded-input)/);
    });
  }
});
