/**
 * Every place in the editor draws something, in every state it can be in.
 *
 * The canvas IS the editor: a merchant clicks the thing they recognise. A slot
 * whose renderer is missing does not fail loudly -- `ShopChrome`'s switch falls
 * through to two grey placeholder bars, which look enough like a preview of
 * something to be scrolled past. Two coupon cases were deleted by an edit that
 * sliced a wider region than its author meant, shipped, and sat in the editor
 * rendering those bars until a merchant said the box was missing.
 *
 * So: render every slot of every page at every value it offers, and refuse the
 * fallback. Nothing here asserts what a preview should look like -- only that
 * one exists and came from a case written for it.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import { ShopChrome } from "@/components/theme-editor/slots/ShopChrome";
import {
  SLOT_GROUPS,
  SLOT_PAGES,
  SLOTS,
  initialChoices,
  type Slot,
  type SlotPageKey,
} from "@/lib/theme-editor/slot-catalogue";
import en from "../../messages/en.json";

const ALL_PAGES = [...SLOT_PAGES, ...SLOT_GROUPS] as SlotPageKey[];

/** Every page's starting choices, so a slot that reads a sibling's gets one. */
const CHOICES = Object.fromEntries(ALL_PAGES.map((page) => [page, initialChoices(page)])) as Record<
  SlotPageKey,
  Record<string, string>
>;

function draw(page: SlotPageKey, slot: Slot, variant: string | undefined) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en}>
      <ShopChrome page={page} slotKey={slot.key} variant={variant} settings={CHOICES[page]} />
    </NextIntlClientProvider>,
  );
}

/** Each slot once per value it can hold, plus undefined for "not chosen yet". */
function states(slot: Slot): (string | undefined)[] {
  const values = (slot.options ?? []).map((option) => option.value);
  return values.length ? [undefined, ...values] : [undefined, slot.initial];
}

describe("theme editor previews", () => {
  it("draws every slot of every page, at every value", () => {
    const missing: string[] = [];
    for (const page of ALL_PAGES) {
      for (const slot of SLOTS[page]) {
        for (const variant of states(slot)) {
          if (draw(page, slot, variant).includes('data-fallback="1"')) {
            missing.push(`${page}:${slot.key}${variant === undefined ? "" : `=${variant}`}`);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("renders the coupon control on both pages that offer it", () => {
    // The two that went missing. Named, so the regression has a name.
    for (const page of ["cart", "checkout"] as const) {
      const slot = SLOTS[page].find((s) => s.key === "coupon");
      expect(slot, `${page} should still offer a coupon`).toBeTruthy();
      for (const variant of states(slot!)) {
        const html = draw(page, slot!, variant);
        expect(html, `${page}:coupon=${variant}`).not.toContain('data-fallback="1"');
      }
    }
  });

  /**
   * A slot with no empty state must never be hatched over by the canvas, or the
   * only control for it disappears at exactly the value a merchant needs to
   * click to change. Both coupon slots are in that position: the box they
   * switch on is drawn inside the summary panel, not here.
   */
  it("keeps the coupon control visible when it is switched off", () => {
    for (const page of ["cart", "checkout"] as const) {
      const slot = SLOTS[page].find((s) => s.key === "coupon")!;
      expect(slot.emptyValues ?? [], `${page}:coupon must not hatch away`).toEqual([]);
    }
  });
});

describe("a wired place draws the merchant's own", () => {
  /**
   * The canvas is how a merchant knows their click worked. Ticking four
   * promises and still seeing "FAST DELIVERY · EASY RETURNS · SECURE PAYMENT"
   * says the editor did nothing -- which is what the owner reported the day
   * the place was wired.
   */
  const promises = {
    id: "promises",
    type: "promises",
    hidden: false,
    settings: { layout: "marks" },
    blocks: [
      { id: "promise-1", type: "promise", settings: { promise: "cash_on_delivery" } },
      { id: "promise-2", type: "promise", settings: { promise: "easy_returns" } },
    ],
  };
  const words: Record<string, string> = {
    cash_on_delivery: "Cash on delivery",
    easy_returns: "Easy returns",
  };
  const drawPromises = (variant: string, live?: typeof promises) =>
    renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={en}>
        <ShopChrome
          page="home"
          slotKey="trust"
          variant={variant}
          settings={CHOICES.home}
          live={live as never}
          promiseWords={(name) => words[name] ?? name}
        />
      </NextIntlClientProvider>,
    );

  it("shows the promises that were ticked, with marks", () => {
    const html = drawPromises("icons", promises);
    expect(html).toContain("Cash on delivery");
    expect(html).toContain("Easy returns");
    expect(html).not.toContain(en.themeEditor.slots.trustDelivery);
    expect((html.match(/<svg/g) ?? []).length).toBe(2);
  });

  it("shows them as one line when that is the shape", () => {
    const html = drawPromises("line", promises);
    expect(html).toContain("Cash on delivery · Easy returns");
    expect(html).not.toContain("<svg");
  });

  it("falls back to an example while nothing is ticked", () => {
    // A merchant who has picked none still sees what the place is FOR.
    const html = drawPromises("icons");
    expect(html).toContain(en.themeEditor.slots.trustDelivery);
  });

  it("draws the same words on the product page", () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={en}>
        <ShopChrome
          page="product"
          slotKey="trust"
          variant="on"
          settings={CHOICES.product}
          live={promises as never}
          promiseWords={(name) => words[name] ?? name}
        />
      </NextIntlClientProvider>,
    );
    expect(html).toContain("Cash on delivery · Easy returns");
  });
});

