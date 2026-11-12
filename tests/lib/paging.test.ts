import { describe, expect, it } from "vitest";
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, pageButtons, parsePageSize } from "@/lib/paging";

describe("parsePageSize — only the sizes the API serves", () => {
  it("takes the three sizes as they are", () => {
    for (const size of PAGE_SIZES) {
      expect(parsePageSize(String(size))).toBe(size);
    }
  });

  it("falls back to the default for anything else", () => {
    // The dashboard never asks for a size the API would snap: it asks for one of the three or
    // for the default, so what the address says and what comes back always agree.
    for (const asked of ["50", "37", "1000", "0", "-5", "abc", "", null, undefined]) {
      expect(parsePageSize(asked)).toBe(DEFAULT_PAGE_SIZE);
    }
  });
});

describe("pageButtons — what the pager draws", () => {
  it("draws every page while there are few", () => {
    expect(pageButtons(1, 1)).toEqual([1]);
    expect(pageButtons(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("draws one page for an empty list", () => {
    expect(pageButtons(1, 0)).toEqual([1]);
  });

  it("keeps both ends, the page being read and its neighbours", () => {
    expect(pageButtons(10, 20)).toEqual([1, "gap", 9, 10, 11, "gap", 20]);
  });

  it("holds its width near either end", () => {
    expect(pageButtons(1, 20)).toEqual([1, 2, 3, 4, 5, "gap", 20]);
    expect(pageButtons(20, 20)).toEqual([1, "gap", 16, 17, 18, 19, 20]);
  });

  it("never puts a gap where a single number would do", () => {
    // Widening the row near the ends is what guarantees this: a gap always stands for two
    // pages or more, wherever the merchant is reading from.
    for (let pages = 8; pages <= 40; pages += 1) {
      for (let page = 1; page <= pages; page += 1) {
        const drawn = pageButtons(page, pages);
        drawn.forEach((one, index) => {
          if (one !== "gap") return;
          const before = drawn[index - 1] as number;
          const after = drawn[index + 1] as number;
          expect(after - before).toBeGreaterThan(2);
        });
      }
    }
  });

  it("never draws a page that is not there, wherever it is asked from", () => {
    for (let pages = 1; pages <= 30; pages += 1) {
      for (let page = 1; page <= pages; page += 1) {
        const drawn = pageButtons(page, pages);
        const numbers = drawn.filter((one): one is number => one !== "gap");
        expect(numbers.every((one) => one >= 1 && one <= pages)).toBe(true);
        expect([...numbers]).toEqual([...numbers].sort((a, b) => a - b));
        expect(new Set(numbers).size).toBe(numbers.length);
        expect(numbers).toContain(page);
        expect(numbers).toContain(1);
        expect(numbers).toContain(pages);
      }
    }
  });
});
