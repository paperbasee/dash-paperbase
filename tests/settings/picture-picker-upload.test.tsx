/**
 * The picture picker always offers an upload (owner, 2026-09-26).
 *
 * "I can't see the option to upload an image -- only the uploaded images are
 * showing." The upload frame was there, but the picker was one element: a column
 * of fixed height that also scrolled. A column that runs out of room shrinks what
 * it may, and the frame clips its own content, so it was allowed to shrink to
 * nothing -- four pixels of border once twelve pictures were placed, measured in a
 * browser with the picker's own layout. The scrolling area is a plain box now,
 * with the column inside it.
 */
import fs from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";

import { PicturePicker } from "@/components/theme-editor/PicturePicker";
import en from "../../messages/en.json";

const TWELVE = Array.from({ length: 12 }, (_, i) => ({ key: `tenants/s/themes/p${i}.jpg`, url: `https://cdn.example.com/p${i}.jpg` }));

const picker = () =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en}>
      <PicturePicker open onClose={() => {}} used={TWELVE} current="" onPick={() => {}} />
    </NextIntlClientProvider>,
  );

describe("the picture picker", () => {
  test("offers the upload however many pictures the shop has placed", () => {
    const html = picker();
    expect(html).toContain(en.themeEditor.pictureUpload);
    expect(html.indexOf(en.themeEditor.pictureUpload)).toBeLessThan(html.indexOf("p0.jpg"));
  });

  test("scrolls in a plain box, with the column inside it", () => {
    const html = picker();
    const outer = html.match(/^<div class="([^"]*)"><div class="([^"]*)">/);
    expect(outer?.[1]).toContain("overflow-y-auto");
    expect(outer?.[1]).not.toContain("flex-col");
    expect(outer?.[2]).toContain("flex-col");
  });
});

describe("no scrolling column anywhere in the editor", () => {
  /*
    The same trap waits for any element that is both: a column that scrolls
    shrinks the children that clip, and a merchant loses them without a word.
  */
  test("an element that scrolls is not also a flex column", () => {
    const root = path.join(__dirname, "../../src/components/theme-editor");
    const files = (fs.readdirSync(root, { recursive: true }) as string[]).filter((name) => name.endsWith(".tsx"));
    const both: string[] = [];
    for (const file of files) {
      const text = fs.readFileSync(path.join(root, file), "utf8");
      for (const m of text.matchAll(/className="([^"]*)"/g)) {
        if (/\boverflow-y-auto\b/.test(m[1]) && /\bflex-col\b/.test(m[1])) both.push(`${file}: ${m[1]}`);
      }
    }
    expect(both).toEqual([]);
  });
});
