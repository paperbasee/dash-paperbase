/**
 * The dashboard's fonts live in this repository (src/app/fonts/, declared in
 * src/app/fonts.css), so a build never fetches Google Fonts.
 *
 * Until 2026-10-08 `next/font/google` downloaded them during every build, and
 * about 1 in 60 times Google answers with a font address Next.js cannot read
 * (`/l/font?kit=...&...`, vercel/next.js#99114): the build failed with "next/font/
 * google queries have exactly one entry", on Vercel too. The files here are the
 * ones Google served, kept as they were.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "..", "..");
const APP = join(ROOT, "src", "app");
const FONTS_DIR = join(APP, "fonts");
const FONTS_CSS = join(APP, "fonts.css");

function css(): string {
  return readFileSync(FONTS_CSS, "utf8");
}

function faces(): string[] {
  return css().match(/@font-face\s*{[^}]*}/g) ?? [];
}

function prop(face: string, name: string): string | undefined {
  return face.match(new RegExp(`${name}\\s*:\\s*([^;]+);`))?.[1].trim();
}

function family(face: string): string {
  return (prop(face, "font-family") ?? "").replace(/^["']|["']$/g, "");
}

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

/** Each family the dashboard draws, with the weights it asked Google for. */
const FAMILIES: Record<string, string[]> = {
  Poppins: ["400", "500", "600", "700"],
  "Noto Sans Bengali": ["400", "500", "600", "700"],
  "Instrument Serif": ["400"],
  Archivo: ["400", "600"],
  "Playfair Display": ["400", "600"],
  Cinzel: ["400", "600"],
};

/** The CSS variables the pages read, each naming its family and that family's fallback. */
const VARIABLES: Record<string, string> = {
  "--font-noto-sans-bengali": "Noto Sans Bengali",
  "--font-instrument-serif": "Instrument Serif",
  "--font-archivo": "Archivo",
  "--font-playfair": "Playfair Display",
  "--font-cinzel": "Cinzel",
};

describe("the dashboard's fonts", () => {
  it("are never fetched from Google during a build", () => {
    const sources = filesUnder(join(ROOT, "src")).filter((path) => /\.(ts|tsx)$/.test(path));
    const fetching = sources.filter((path) => readFileSync(path, "utf8").includes("next/font/google"));
    expect(fetching.map((path) => relative(ROOT, path))).toEqual([]);
  });

  it("are loaded by the root layout, before the rest of the styles", () => {
    const layout = readFileSync(join(APP, "layout.tsx"), "utf8");
    expect(layout).toContain('import "./fonts.css";');
    expect(layout.indexOf('import "./fonts.css";')).toBeLessThan(layout.indexOf('import "./globals.css";'));
  });

  it("point only at files that exist and are real woff2 fonts", () => {
    const urls = [...css().matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      const path = resolve(dirname(FONTS_CSS), url);
      expect(existsSync(path), url).toBe(true);
      expect(readFileSync(path).subarray(0, 4).toString("latin1"), url).toBe("wOF2");
    }
  });

  it("keep no file that nothing uses", () => {
    const used = new Set(
      [...css().matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((m) => resolve(dirname(FONTS_CSS), m[1])),
    );
    const unused = filesUnder(FONTS_DIR).filter((path) => !used.has(path));
    expect(unused.map((path) => relative(ROOT, path))).toEqual([]);
  });

  it("declare every family in every weight the dashboard draws, swapping in when ready", () => {
    for (const [name, weights] of Object.entries(FAMILIES)) {
      const own = faces().filter((face) => family(face) === name);
      expect(own.length, name).toBeGreaterThan(0);
      expect([...new Set(own.map((face) => prop(face, "font-weight")))].sort(), name).toEqual([...weights].sort());
      for (const face of own) {
        expect(prop(face, "font-display"), name).toBe("swap");
        expect(prop(face, "font-style"), name).toBe("normal");
        expect(prop(face, "unicode-range"), name).toBeTruthy();
      }
    }
  });

  it("give each family a sized fallback, so the page does not jump when the font arrives", () => {
    for (const name of Object.keys(FAMILIES)) {
      const fallback = faces().find((face) => family(face) === `${name} Fallback`);
      expect(fallback, name).toBeDefined();
      expect(prop(fallback!, "src"), name).toMatch(/^local\(/);
      expect(prop(fallback!, "size-adjust"), name).toMatch(/%$/);
      expect(prop(fallback!, "ascent-override"), name).toMatch(/%$/);
    }
  });

  it("set the page in Poppins and keep the variables the pages read", () => {
    expect(css()).toMatch(/html\s*{[^}]*font-family:\s*"Poppins",\s*"Poppins Fallback"/);
    for (const [variable, name] of Object.entries(VARIABLES)) {
      expect(css(), variable).toContain(`${variable}: "${name}", "${name} Fallback";`);
    }
  });
});
