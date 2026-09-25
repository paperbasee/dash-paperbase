/**
 * The palettes the Style panel offers come from the API, and a shop that never
 * chose is Porcelain.
 */

import { describe, expect, test } from "vitest";

import {
  DEFAULT_PALETTE,
  chosenPalette,
  fetchPalettes,
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
