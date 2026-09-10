/**
 * Copy integrity for the Domains tab.
 *
 * This is the highest-stakes copy in the product: it walks a merchant through
 * repointing the domain their business runs on. A key that exists in English but
 * not in Bengali renders the raw key to most of this platform's merchants, and a
 * missing placeholder silently drops the hostname out of a confirmation. Worse,
 * a half-translated fallbackWhy is what pushes a merchant onto the IP-pinned A
 * record -- the exact outcome the copy exists to prevent.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const COMPONENT = path.join(
  ROOT,
  "src/app/[locale]/(dashboard)/settings/sections/DomainsSection.tsx",
);
const SOURCE = fs.readFileSync(COMPONENT, "utf8");

const enDomains = (en as Record<string, any>).settings.domains as Record<string, string>;
const bnDomains = (bn as Record<string, any>).settings.domains as Record<string, string>;

/** Values deliberately identical in both languages (a domain example is not prose). */
const PASSTHROUGH = new Set(["hostnamePlaceholder"]);

function placeholdersIn(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

describe("domains copy — English and Bengali stay in step", () => {
  it("has identical keys in both languages", () => {
    expect(Object.keys(bnDomains).sort()).toEqual(Object.keys(enDomains).sort());
  });

  it("translates every string", () => {
    const untranslated = Object.keys(enDomains).filter(
      (k) => !PASSTHROUGH.has(k) && enDomains[k] === bnDomains[k],
    );
    expect(untranslated).toEqual([]);
  });

  it("keeps the same placeholders in both languages", () => {
    // A dropped {hostname} turns "Remove shop.com?" into "Remove ?" -- the
    // merchant then confirms a destructive action without seeing what it targets.
    const mismatched = Object.keys(enDomains).filter(
      (k) => placeholdersIn(enDomains[k]).join() !== placeholdersIn(bnDomains[k]).join(),
    );
    expect(mismatched).toEqual([]);
  });

  it("never leaves an empty string", () => {
    const empty = Object.keys(enDomains).filter(
      (k) => enDomains[k].trim() === "" || bnDomains[k].trim() === "",
    );
    expect(empty).toEqual([]);
  });
});

describe("domains copy — the component and the messages agree", () => {
  /** Every t("domains.X") literal the component actually asks for. */
  const used = [...SOURCE.matchAll(/\bt\(\s*["']domains\.([\w]+)["']/g)].map((m) => m[1]);

  it("asks for at least a few keys (guards the regex itself)", () => {
    expect(used.length).toBeGreaterThan(5);
  });

  it("every key the component uses exists in English", () => {
    const missing = [...new Set(used)].filter((k) => !(k in enDomains)).sort();
    expect(missing).toEqual([]);
  });

  it("every key the component uses exists in Bengali", () => {
    const missing = [...new Set(used)].filter((k) => !(k in bnDomains)).sort();
    expect(missing).toEqual([]);
  });
});
