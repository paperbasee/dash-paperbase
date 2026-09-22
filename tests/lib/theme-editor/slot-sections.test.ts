/**
 * Which place on the canvas is which section of the shop's document.
 *
 * This is the file that decides whether a merchant's click reaches their shop
 * or only this screen's own state, so getting it wrong is silent in the worst
 * way: the editor looks like it worked and the shop never changes.
 */

import { describe, expect, test } from "vitest";

import {
  ownerOf,
  sectionFor,
  sectionOfType,
  sectionTypesOf,
  slotValueFor,
  wiringFor,
  WIRED_SLOTS,
} from "@/lib/theme-editor/slot-sections";
import { SLOTS } from "@/lib/theme-editor/slot-catalogue";
import { document, section } from "./fixtures";

describe("which places are wired", () => {
  test("the notice on the Header entry is the announcement bar", () => {
    expect(wiringFor("header", "notice")).toEqual({
      page: "header",
      sections: { message: "announcement_bar" },
      off: "off",
    });
  });

  test("the hero is two different sections, one per choice", () => {
    // The first place where a value picks the SECTION rather than just showing
    // one. Choosing the video hides the pictures; it never removes them.
    expect(wiringFor("home", "hero")).toEqual({
      page: "templates.home",
      sections: { slider: "banner_slider", video: "video" },
    });
  });

  test("a place that is still a drawing answers null", () => {
    // Its own key on another entry, and another key on this one: neither is the
    // announcement bar, and reading either as wired would write to the wrong
    // section.
    expect(wiringFor("home", "notice")).toBeNull();
    expect(wiringFor("header", "layout")).toBeNull();
  });

  test("every wired place names at least one section, and no value twice", () => {
    for (const [page, slots] of Object.entries(WIRED_SLOTS)) {
      for (const [key, wiring] of Object.entries(slots ?? {})) {
        const where = `${page}.${key}`;
        const values = Object.keys(wiring.sections);
        expect(values.length, where).toBeGreaterThan(0);
        expect(values, where).not.toContain(wiring.off);
      }
    }
  });
});

describe("reading the document", () => {
  const notice = wiringFor("header", "notice")!;

  test("finds the section by type, whatever its id", () => {
    // Ids are the editor's, not the theme's: a document written by an older
    // build names them differently and is still this shop's bar.
    const doc = document();
    doc.header.sections[0].id = "written-by-an-older-build";
    expect(sectionOfType(doc, notice, "announcement_bar")?.type).toBe("announcement_bar");
  });

  test("a hidden section is not the one this place is showing", () => {
    // What the dialog draws fields for. A hidden bar has no fields, so a
    // merchant switches it on and then writes -- rather than typing into
    // something invisible and wondering why their shop never changed.
    const doc = document();
    expect(doc.header.sections[0].hidden).toBe(true);
    expect(sectionFor(doc, notice)).toBeNull();

    doc.header.sections[0].hidden = false;
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

describe("where a place is edited", () => {
  test("the notice clicked on any page is the header group's bar", () => {
    // It used to send the merchant to the Header entry to change the strip they
    // were looking at -- a detour through a filing decision they should never
    // have to know about. The pop-up opens where they clicked, and this is what
    // makes it edit the right section anyway.
    for (const page of ["home", "product", "cart"] as const) {
      const slot = SLOTS[page].find((entry) => entry.key === "notice")!;
      const owner = ownerOf(page, slot);

      expect(owner).toEqual({ page: "header", key: "notice" });
      expect(wiringFor(owner.page, owner.key)).not.toBeNull();
    }
  });

  test("a place nobody else owns is its own", () => {
    const slot = SLOTS.home.find((entry) => !entry.inheritedFrom)!;
    expect(ownerOf("home", slot)).toEqual({ page: "home", key: slot.key });
  });
});

describe("the three product bands", () => {
  test("the one a merchant fills is its own section", () => {
    expect(wiringFor("home", "featured")).toEqual({
      page: "templates.home",
      sections: { row: "featured_products" },
      off: "off",
    });
  });

  test("the two that fill themselves are one section each, and off", () => {
    // No settings to tell values apart: there is one shape, and the shop reads
    // its own numbers. A merchant sets nothing here but the heading.
    for (const [key, type] of [
      ["bestsellers", "best_sellers"],
      ["arrivals", "new_arrivals"],
    ] as const) {
      const wiring = wiringFor("home", key)!;
      expect(sectionTypesOf(wiring)).toEqual([type]);
      expect(wiring.off).toBe("off");
    }
  });

  test("every band is its own section, so two of them never fight", () => {
    /*
      Three places on one page, each adding and hiding by section TYPE. Two
      sharing a type would mean one place hiding the other's band -- which is
      exactly why the category band's two shapes are one section with a setting
      and these three are not.
    */
    const home = WIRED_SLOTS.home ?? {};
    const types = Object.values(home).flatMap((wiring) => sectionTypesOf(wiring));
    expect(types.length).toBe(new Set(types).size);
  });
});
