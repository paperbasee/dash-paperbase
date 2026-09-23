/**
 * What the theme editor looks like the moment a merchant opens it.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const EDITOR = path.join(ROOT, "src/components/theme-editor/slots/SlotEditor.tsx");

describe("the editor opens on the shop, not on a pop-up", () => {
  it("has nothing open to begin with", () => {
    /*
      It opened straight into one place's pop-up until 2026-09-23 -- a leftover
      from the day the slot design was drawn with nothing wired, when opening
      on a place was convenient for whoever was building it. Once that place
      was real it met every merchant with a dialog over their own shop.
    */
    const source = fs.readFileSync(EDITOR, "utf8");
    const opened = source.match(/const \[open, setOpen\] = useState<string \| null>\(([^)]*)\)/);
    expect(opened?.[1]).toBe("null");
  });
});
