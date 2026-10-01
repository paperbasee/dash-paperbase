/**
 * Copy integrity for Settings → Team & roles.
 *
 * The role cards are where a merchant reads who in their shop may download the
 * orders, delete customers or change the shop's settings, before inviting
 * someone. The people most likely to be handed a limited role -- staff, not
 * owners -- read Bangla as often as English.
 *
 * Two failures are invisible until a merchant hits them, so they are pinned
 * here instead:
 *
 *   1. next-intl answers a key it cannot find with the key itself, so a name
 *      missing from bn.json reaches a Bangla reader as "areaOrdersExport".
 *   2. `src/config/permissions.ts` carries only message names. A role or a card
 *      line added there without its two messages renders as its key.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import bn from "../../messages/bn.json";
import { ROLE_AREAS, ROLE_MESSAGES } from "@/config/permissions";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TEAM_DIR = path.join(ROOT, "src/app/[locale]/(dashboard)/settings/sections/team");
const COMPONENTS = ["TeamSection.tsx", "MemberCategoryScopeDialog.tsx"];
const SOURCES = COMPONENTS.map((file) => fs.readFileSync(path.join(TEAM_DIR, file), "utf8"));
const ALL_SOURCE = SOURCES.join("\n");

const enTeam = (en as Record<string, any>).settings.team as Record<string, string>;
const bnTeam = (bn as Record<string, any>).settings.team as Record<string, string>;

/** Values deliberately identical in both languages (an email example is not prose). */
const PASSTHROUGH = new Set(["inviteEmailPlaceholder"]);

/** Argument names in an ICU message: `{name}` and `{count, plural, …}` alike. */
function placeholdersIn(value: string): string[] {
  return [...new Set([...value.matchAll(/\{\s*(\w+)\s*[,}]/g)].map((m) => m[1]))].sort();
}

/** Does this message format a number for the reader (`{n, number}` or a plural `#`)? */
function formatsNumbers(value: string): boolean {
  return /,\s*number\s*\}/.test(value) || /,\s*plural\s*,/.test(value);
}

describe("team copy — English and Bengali stay in step", () => {
  it("has identical keys in both languages", () => {
    expect(Object.keys(bnTeam).sort()).toEqual(Object.keys(enTeam).sort());
  });

  it("translates every string", () => {
    const untranslated = Object.keys(enTeam).filter(
      (k) => !PASSTHROUGH.has(k) && enTeam[k] === bnTeam[k],
    );
    expect(untranslated).toEqual([]);
  });

  it("keeps the same placeholders in both languages", () => {
    // A dropped {email} turns "Remove sara@shop.com from the team?" into
    // "Remove from the team?" — the merchant confirms without seeing who.
    const mismatched = Object.keys(enTeam).filter(
      (k) => placeholdersIn(enTeam[k]).join() !== placeholdersIn(bnTeam[k]).join(),
    );
    expect(mismatched).toEqual([]);
  });

  it("never leaves an empty string", () => {
    const empty = Object.keys(enTeam).filter(
      (k) => enTeam[k].trim() === "" || bnTeam[k].trim() === "",
    );
    expect(empty).toEqual([]);
  });

  it("formats every count for a Bengali reader, so digits are Bangla", () => {
    // "3 selected" must render as "৩টি বেছে নেওয়া হয়েছে". A bare {count} in the
    // Bengali string prints a Western digit in the middle of Bangla text.
    const raw = Object.keys(enTeam).filter(
      (k) => formatsNumbers(enTeam[k]) && !formatsNumbers(bnTeam[k]),
    );
    expect(raw).toEqual([]);
  });

  it("keeps the <b> tag the member name is wrapped in", () => {
    // t.rich builds this one; a language missing the tag throws at render.
    for (const messages of [enTeam, bnTeam]) {
      expect(messages.categoryBody).toContain("<b>");
      expect(messages.categoryBody).toContain("</b>");
    }
  });
});

describe("team copy — the role cards name real messages", () => {
  /** Every role name, summary and card line the Roles tab renders with t(key). */
  const labelKeys = [
    ...Object.values(ROLE_MESSAGES).flatMap((role) => [role.name, role.summary]),
    ...ROLE_AREAS.map((area) => area.labelKey),
  ];

  it("covers every role and card line (guards against an empty sweep)", () => {
    expect(labelKeys.length).toBe(3 * 2 + ROLE_AREAS.length);
    expect(ROLE_AREAS.length).toBeGreaterThan(10);
  });

  it("every labelKey exists in English", () => {
    expect(labelKeys.filter((k) => !(k in enTeam)).sort()).toEqual([]);
  });

  it("every labelKey exists in Bengali", () => {
    expect(labelKeys.filter((k) => !(k in bnTeam)).sort()).toEqual([]);
  });

  it("no role word is left in English", () => {
    const english = labelKeys.filter((k) => enTeam[k] === bnTeam[k]);
    expect(english).toEqual([]);
  });
});

describe("team copy — the components and the messages agree", () => {
  /** Keys asked for by name: t("x"), t.rich("x"), tSettings is excluded by prefix. */
  const used = [
    ...new Set([...ALL_SOURCE.matchAll(/\bt(?:\.rich)?\(\s*["'](\w+)["']/g)].map((m) => m[1])),
  ];
  /** Keys sent to notify, which resolves against the whole message tree. */
  const notified = [
    ...new Set([...ALL_SOURCE.matchAll(/["']settings\.team\.(\w+)["']/g)].map((m) => m[1])),
  ];

  it("asks for keys by both routes (guards the regexes themselves)", () => {
    expect(used.length).toBeGreaterThan(20);
    expect(notified.length).toBeGreaterThan(5);
  });

  it("every key the components use exists in both languages", () => {
    const asked = [...new Set([...used, ...notified])];
    expect(asked.filter((k) => !(k in enTeam)).sort()).toEqual([]);
    expect(asked.filter((k) => !(k in bnTeam)).sort()).toEqual([]);
  });

  it("leaves no English sentence in the markup", () => {
    // A stray literal is how this section drifted back to English before: the
    // words live in messages/, so JSX text should only ever be an expression.
    const prose: string[] = [];
    for (const [i, source] of SOURCES.entries()) {
      for (const match of source.matchAll(/>\s*([A-Z][A-Za-z]+(?: [a-z][A-Za-z']*){2,})\s*</g)) {
        prose.push(`${COMPONENTS[i]}: ${match[1]}`);
      }
    }
    expect(prose).toEqual([]);
  });
});
