/**
 * A part is named for what it is (owner, 2026-09-25).
 *
 * The dialog's add button, part numbers and remove buttons said "picture" for
 * every place, so the home page's questions and the product page's fold-out
 * rows offered to "Add a picture". Each kind of part a dialog LISTS -- one with
 * more than one field, so it is a form rather than a tick -- has its own words,
 * in both languages.
 */
import { describe, expect, test } from "vitest";

import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

// The top bar's `message` joined on 2026-09-25 -- found by the owner as a
// MISSING_MESSAGE the moment its dialog opened, because this list had not.
// And the header menu's `item` -- a link -- with step 3 of the header redesign.
// And the footer's `column` (2026-09-25), when the columns became the merchant's.
const LISTED = ["slide", "question", "row", "message", "item", "column"] as const;
const WORDS = ["Add", "Number", "Remove"] as const;
const slots = (messages: typeof en) => messages.themeEditor.slots as unknown as Record<string, string>;

describe("the words for a dialog's parts", () => {
  for (const [locale, messages] of [["en", en], ["bn", bn]] as const) {
    test(`every listed kind has its own words in ${locale}`, () => {
      const words = slots(messages as typeof en);
      for (const kind of LISTED) {
        for (const word of WORDS) {
          expect(words[`${kind}Part${word}`], `${kind}Part${word}`).toBeTruthy();
        }
        expect(words[`${kind}PartNumber`]).toContain("{number}");
        expect(words[`${kind}PartRemove`]).toContain("{number}");
      }
    });
  }

  test("a row is not called a picture", () => {
    expect(slots(en).rowPartAdd.toLowerCase()).not.toContain("picture");
    expect(slots(en).questionPartAdd.toLowerCase()).not.toContain("picture");
    expect(slots(en).messagePartAdd.toLowerCase()).not.toContain("picture");
  });
});
