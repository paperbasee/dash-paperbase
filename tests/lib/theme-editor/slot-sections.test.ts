/**
 * Which place on the canvas is which section of the shop's document.
 *
 * This is the file that decides whether a merchant's click reaches their shop
 * or only this screen's own state, so getting it wrong is silent in the worst
 * way: the editor looks like it worked and the shop never changes.
 */

import { describe, expect, test } from "vitest";

import { sectionFor, slotValueFor, wiringFor, WIRED_SLOTS } from "@/lib/theme-editor/slot-sections";
import { document, section } from "./fixtures";

describe("which places are wired", () => {
  test("the notice on the Header entry is the announcement bar", () => {
    const wiring = wiringFor("header", "notice");
    expect(wiring).toEqual({ page: "header", type: "announcement_bar", on: "message", off: "off" });
  });

  test("a place that is still a drawing answers null", () => {
    // Its own key on another entry, and another key on this one: neither is the
    // announcement bar, and reading either as wired would write to the wrong
    // section.
    expect(wiringFor("home", "notice")).toBeNull();
    expect(wiringFor("header", "layout")).toBeNull();
  });

  test("every wired place names a section, on and off", () => {
    for (const [page, slots] of Object.entries(WIRED_SLOTS)) {
      for (const [key, wiring] of Object.entries(slots ?? {})) {
        const where = `${page}.${key}`;
        expect(wiring.type, where).toBeTruthy();
        expect(wiring.on, where).not.toBe(wiring.off);
      }
    }
  });
});

describe("reading the document", () => {
  const notice = wiringFor("header", "notice")!;

  test("finds the section by type, whatever its id", () => {
    const doc = document();
    doc.header.sections[0].id = "written-by-an-older-build";
    expect(sectionFor(doc, notice)?.type).toBe("announcement_bar");
  });

  test("a hidden bar reads as off, a shown one as on", () => {
    const doc = document();
    expect(slotValueFor(doc, notice)).toBe("off");

    doc.header.sections[0].hidden = false;
    expect(slotValueFor(doc, notice)).toBe("message");
  });

  test("a document that has no bar at all reads as off, not as broken", () => {
    // Every document written before a section existed is this one. The shop
    // draws its theme's default; the editor must offer to put it back rather
    // than throwing.
    const doc = document();
    doc.header.sections = [section("header", "header")];
    expect(sectionFor(doc, notice)).toBeNull();
    expect(slotValueFor(doc, notice)).toBe("off");
  });

  test("the bar is read from the header, never from a page that draws one", () => {
    const doc = document();
    doc.header.sections[0].hidden = true;
    doc.templates.home.sections.unshift(
      section("home-bar", "announcement_bar", { hidden: false, settings: { text: "Not this one" } }),
    );
    expect(slotValueFor(doc, notice)).toBe("off");
  });
});
