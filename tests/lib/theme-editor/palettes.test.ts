/**
 * The palettes the Style panel offers come from the API, a shop that never
 * chose is Porcelain, and the sketch's colours are the palette's -- written
 * the way the dashboard writes a colour, and never the editor's own marks.
 */

import { describe, expect, test } from "vitest";

import {
  DEFAULT_PALETTE,
  canvasColours,
  chosenPalette,
  fetchPalettes,
  hexToHslTriplet,
  paletteName,
  type ShopPalette,
} from "@/lib/theme-editor/palettes";

const navy: ShopPalette = {
  key: "navy",
  name: "Navy",
  name_bn: "নেভি নীল",
  tokens: {
    background: "#F7F5F0",
    foreground: "#141B2D",
    muted: "#ECE9E1",
    muted_foreground: "#5C6271",
    border: "#DDD9CE",
    card: "#ECE9E1",
    card_foreground: "#141B2D",
    primary: "#1F2B48",
    primary_foreground: "#F7F5F0",
    header: "#141B2D",
    header_foreground: "#F2EEE4",
  },
};

describe("fetchPalettes", () => {
  test("reads the API's presets, in its order", async () => {
    const asked: string[] = [];
    const http = {
      async get<T>(path: string) {
        asked.push(path);
        return { data: { presets: [navy] } as T };
      },
    };
    await expect(fetchPalettes(http)).resolves.toEqual([navy]);
    expect(asked).toEqual(["theming/presets/"]);
  });
});

describe("chosenPalette", () => {
  test("the document's own choice, else Porcelain", () => {
    expect(DEFAULT_PALETTE).toBe("porcelain");
    expect(chosenPalette({ settings: { palette: "sage" } })).toBe("sage");
    expect(chosenPalette({ settings: {} })).toBe("porcelain");
    expect(chosenPalette({ settings: { palette: "" } })).toBe("porcelain");
    expect(chosenPalette(null)).toBe("porcelain");
  });
});

describe("paletteName", () => {
  test("in the dashboard's language", () => {
    expect(paletteName(navy, "en")).toBe("Navy");
    expect(paletteName(navy, "bn")).toBe("নেভি নীল");
    expect(paletteName({ ...navy, name_bn: "" }, "bn")).toBe("Navy");
  });
});

describe("hexToHslTriplet", () => {
  test("as the dashboard's colour variables are written", () => {
    expect(hexToHslTriplet("#FFFFFF")).toBe("0 0% 100%");
    expect(hexToHslTriplet("#000000")).toBe("0 0% 0%");
    expect(hexToHslTriplet("#FF0000")).toBe("0 100% 50%");
    expect(hexToHslTriplet("#1F2B48")).toBe("222.4 39.8% 20.2%");
  });
});

describe("canvasColours", () => {
  test("paints the drawing's page, ink, panels, lines, brand and header", () => {
    const colours = canvasColours(navy.tokens);
    expect(colours["--background"]).toBe(hexToHslTriplet("#F7F5F0"));
    expect(colours["--foreground"]).toBe(hexToHslTriplet("#141B2D"));
    expect(colours["--shop-brand"]).toBe(hexToHslTriplet("#1F2B48"));
    expect(colours["--shop-brand-foreground"]).toBe(hexToHslTriplet("#F7F5F0"));
    expect(colours["--shop-header"]).toBe(hexToHslTriplet("#141B2D"));
    expect(colours["--border-subtle"]).toBe(colours["--border"]);
  });

  test("leaves the editor's own marks alone", () => {
    // The selection outline and the place chips are `primary`: the editor's,
    // not the shop's, so they must look the same whatever palette is chosen.
    const colours = canvasColours(navy.tokens);
    expect(colours).not.toHaveProperty("--primary");
    expect(colours).not.toHaveProperty("--ring");
  });

  test("a colour that is not a hex is skipped, not written broken", () => {
    const colours = canvasColours({ ...navy.tokens, muted: "not-a-colour" });
    expect(colours).not.toHaveProperty("--muted");
    expect(colours).toHaveProperty("--background");
  });
});
