/**
 * The invoice's terms and conditions sit on Settings -> Policies, with the shop's other policies
 * (owner, 2026-09-29), not on Store Info, which is the shop and its Identity.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "vitest";

const PAGE = fs.readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src/app/[locale]/(dashboard)/settings/page.tsx"),
  "utf8",
);

test("the invoice terms panel is drawn on the Policies tab, and only there", () => {
  const drawn = [...PAGE.matchAll(/activeSection === "([a-z]+)" && \(\s*<div className="mt-6">\s*<InvoiceSettingsPanel \/>/g)];
  expect(drawn.map((match) => match[1])).toEqual(["policies"]);
});
