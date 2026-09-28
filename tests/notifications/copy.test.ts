/**
 * Every dashboard toast and every confirm dialog goes through these five files, so one
 * English word left in any of them is a word a Bangla shop reads on screen -- above its own
 * language, on a toast it did not ask for. They used to hold nine: SUCCESS / ERROR DIALOG /
 * WARNING / INFO / NOTICE in the toast's coloured bar, "Notification" where a title was
 * missing, "Confirm" on a button that only closed, "Notifications" read out to a screen
 * reader, and three sentences the confirm dialog printed in place of the caller's own.
 *
 * So the first test reads the files and fails on any user-facing English literal, and the
 * second proves every key they ask for is in en AND bn. A new fallback has to pass both.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { hasOwnText } from "@/context/ConfirmDialogContext";
import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const SOURCES = [
  "src/components/notifications/Toast.tsx",
  "src/components/notifications/NotificationViewport.tsx",
  "src/notifications/NotificationProvider.tsx",
  "src/components/ui/ConfirmDialog.tsx",
  "src/context/ConfirmDialogContext.tsx",
];

/**
 * Not merchant copy: a keyboard key name compared with `event.key`. Anything added here has
 * to be text no merchant can ever see.
 */
const NOT_MERCHANT_COPY = new Set(["Enter"]);

const enCommon = (en as Record<string, any>).common as Record<string, string>;
const bnCommon = (bn as Record<string, any>).common as Record<string, string>;

/** Comments, and the descriptor `fallback:` net, which the key test below keeps unreachable. */
function strippable(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/fallback:\s*(?:"[^"\n]*"|`[^`]*`)/g, "fallback: KEPT_AS_LAST_RESORT");
}

/** A literal a merchant could read: starts capitalised and has lowercase, or is SHOUTED. */
function looksLikeEnglishCopy(literal: string): boolean {
  if (NOT_MERCHANT_COPY.has(literal)) return false;
  if (/^[A-Z]{3,}$/.test(literal)) return true;
  return /^[A-Z]/.test(literal) && /[a-z]/.test(literal);
}

function englishLiterals(source: string): string[] {
  const code = strippable(source);
  const found: string[] = [];
  for (const match of code.matchAll(/"([^"\n]{1,120})"|'([^'\n]{1,120})'|`([^`\n]{1,120})`/g)) {
    const literal = match[1] ?? match[2] ?? match[3] ?? "";
    if (looksLikeEnglishCopy(literal)) found.push(literal);
  }
  // Plain text written straight into the markup, e.g. <p>Notification</p>. The closing "</"
  // keeps a generic like Promise<boolean> out of it.
  for (const match of code.matchAll(/>\s*([A-Z][A-Za-z'’,.!?\- ]{2,})\s*<\//g)) {
    found.push(match[1]);
  }
  return found;
}

function usedCommonKeys(source: string): string[] {
  const keys = new Set<string>();
  for (const m of strippable(source).matchAll(/\btCommon\(\s*"([\w.]+)"/g)) keys.add(m[1]);
  for (const m of strippable(source).matchAll(/(?:\bt\(|key:)\s*"common\.([\w]+)"/g)) keys.add(m[1]);
  return [...keys];
}

const placeholders = (value: string) =>
  [...value.matchAll(/\{(\w+)(?:\s*,[^}]*)?\}/g)].map((m) => m[1]).sort().join();

describe("notification and confirm copy", () => {
  it("has no English written into the components", () => {
    const offenders: Record<string, string[]> = {};
    for (const rel of SOURCES) {
      const found = englishLiterals(fs.readFileSync(path.join(ROOT, rel), "utf8"));
      if (found.length > 0) offenders[rel] = found;
    }
    expect(offenders).toEqual({});
  });

  it("asks only for keys that exist in English and Bangla", () => {
    const used = new Set<string>();
    for (const rel of SOURCES) {
      for (const key of usedCommonKeys(fs.readFileSync(path.join(ROOT, rel), "utf8"))) used.add(key);
    }
    // The toasts' screen-reader name, Close, the two dialog buttons and the two dialog
    // fallbacks, the unknown error, the rate limit pair, Loading. (The five labels of the
    // toast's coloured bar went with the bar, 2026-09-29: its icon names the kind.)
    expect(used.size).toBeGreaterThanOrEqual(10);
    expect([...used].filter((k) => !enCommon[k]?.trim())).toEqual([]);
    expect([...used].filter((k) => !bnCommon[k]?.trim())).toEqual([]);
    // A Bangla value copied from English is English on screen.
    expect([...used].filter((k) => enCommon[k] === bnCommon[k])).toEqual([]);
  });

  it("keeps common in step across the two languages", () => {
    expect(Object.keys(bnCommon).sort()).toEqual(Object.keys(enCommon).sort());
    expect(Object.keys(enCommon).filter((k) => placeholders(enCommon[k]) !== placeholders(bnCommon[k]))).toEqual([]);
  });

  it("counts the seconds in Bangla digits when it asks the merchant to wait", () => {
    // A plain {seconds} would print 12, not ১২. The `, number` is what makes it Bangla.
    expect(enCommon.toastRateLimitBody).toContain("{seconds, number}");
    expect(bnCommon.toastRateLimitBody).toContain("{seconds, number}");
  });
});

describe("the confirm dialog shows the caller's own words", () => {
  it("treats anything the caller passed as its words", () => {
    expect(hasOwnText("Remove this section?")).toBe(true);
    expect(hasOwnText("ড্রাফট বাদ দেবেন?")).toBe(true);
    expect(hasOwnText(0)).toBe(true);
    expect(hasOwnText(createElement("span", null, "in my own markup"))).toBe(true);
    // Only a slot with nothing in it falls back, and it falls back to translated copy.
    expect(hasOwnText("")).toBe(false);
    expect(hasOwnText("   ")).toBe(false);
    expect(hasOwnText(undefined)).toBe(false);
    expect(hasOwnText(null)).toBe(false);
    expect(hasOwnText(false)).toBe(false);
  });

  it("no longer compares the message with the title", () => {
    // The old rule threw the caller's sentence away when it shared 60% of the title's words,
    // or was a short question -- which is what a plain Bangla confirm message looks like.
    const source = fs.readFileSync(path.join(ROOT, "src/context/ConfirmDialogContext.tsx"), "utf8");
    for (const gone of ["isDescriptionTooSimilar", "overlapRatio", "descriptiveFallbackByVariant", "resolveDialogDescription"]) {
      expect(source).not.toContain(gone);
    }
  });

  it("never leaves a confirm message blank in either language", () => {
    // Nothing reaches the fallback if every confirm message actually says something.
    const blanks: string[] = [];
    const walk = (enNode: any, bnNode: any, trail: string) => {
      for (const [key, value] of Object.entries(enNode ?? {})) {
        const here = trail ? `${trail}.${key}` : key;
        if (value && typeof value === "object") {
          walk(value, (bnNode ?? {})[key], here);
        } else if (/^confirm.*message$/i.test(key) || /confirm\w*Message$/.test(key)) {
          if (!String(value ?? "").trim()) blanks.push(`en:${here}`);
          if (!String((bnNode ?? {})[key] ?? "").trim()) blanks.push(`bn:${here}`);
        }
      }
    };
    walk(en, bn, "");
    expect(blanks).toEqual([]);
  });
});
