import { describe, expect, it } from "vitest";

import bn from "../../messages/bn.json";
import en from "../../messages/en.json";
import { isOrderNoteChanged, orderNoteCharactersLeft } from "@/lib/orders/order-note";

describe("isOrderNoteChanged", () => {
  it("sees new words", () => {
    expect(isOrderNoteChanged("Call first", "")).toBe(true);
  });

  it("sees the note being emptied", () => {
    expect(isOrderNoteChanged("", "Call first")).toBe(true);
  });

  it("does not count spaces the API would trim", () => {
    expect(isOrderNoteChanged("  Call first \n", "Call first")).toBe(false);
  });

  it("treats an order with no note yet as empty", () => {
    expect(isOrderNoteChanged("   ", undefined)).toBe(false);
  });
});

describe("orderNoteCharactersLeft", () => {
  it("stays quiet while there is plenty of room", () => {
    expect(orderNoteCharactersLeft("x".repeat(899))).toBeNull();
  });

  it("counts down for the last hundred", () => {
    expect(orderNoteCharactersLeft("x".repeat(900))).toBe(100);
    expect(orderNoteCharactersLeft("x".repeat(1000))).toBe(0);
  });
});

describe("the note's words", () => {
  it("exist in English and Bangla, and are really translated", () => {
    const english = en.orderNote as Record<string, string>;
    const bangla = bn.orderNote as Record<string, string>;

    expect(Object.keys(bangla).sort()).toEqual(Object.keys(english).sort());
    for (const key of Object.keys(english)) {
      if (key === "by") continue; // only placeholders and a dot
      expect(bangla[key], key).not.toBe(english[key]);
    }
  });
});
