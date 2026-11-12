/**
 * The one pager every dashboard list uses (owner, 2026-11-12): where you are, how to get
 * elsewhere, and how many rows a page holds.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import { Pager } from "@/components/page/Pager";
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

const draw = (node: React.ReactNode, locale: "en" | "bn" = "en") =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : bn} timeZone="Asia/Dhaka">
      {node}
    </NextIntlClientProvider>
  );

const pager = (props: Partial<React.ComponentProps<typeof Pager>> = {}, locale: "en" | "bn" = "en") =>
  draw(
    <Pager
      page={1}
      pages={3}
      count={51}
      pageSize={24}
      onPage={() => {}}
      onPageSize={() => {}}
      {...props}
    />,
    locale
  );

describe("the pager", () => {
  it("draws nothing when there is nothing to page", () => {
    expect(pager({ pages: 1, count: 12 })).toBe("");
  });

  it("still draws on one page when a smaller size would make more", () => {
    // 30 rows at 96 a page: one page, but the merchant may want 24 back.
    expect(pager({ pages: 1, count: 30, pageSize: 96 })).not.toBe("");
  });

  it("says how many rows there are in all", () => {
    expect(pager()).toContain(en.pager.totalLabel);
    expect(pager()).toMatch(/>51</);
    // The total is the list's, not the page's: it does not move as pages turn.
    expect(pager({ page: 3 })).toMatch(/>51</);
  });

  it("marks the page being read, and no other", () => {
    const html = pager({ page: 2 });
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="page"[^>]*>2</);
  });

  it("closes the way back on the first page and the way on from the last", () => {
    const first = pager({ page: 1 });
    expect(first.match(/disabled=""/g)).toHaveLength(1); // previous
    expect(first).toContain(`aria-label="${en.pager.next}"`);

    const last = pager({ page: 3 });
    expect(last.match(/disabled=""/g)).toHaveLength(1); // next
  });

  it("has no first or last button: the numbers already reach both ends", () => {
    const html = pager({ page: 10, pages: 20, count: 480 });
    expect(html).toContain(`aria-label="${en.pager.goToPage.replace("{page}", "1")}"`);
    expect(html).toContain(`aria-label="${en.pager.goToPage.replace("{page}", "20")}"`);
    // Two step buttons in the row, not four.
    expect(html.match(/title="/g)).toHaveLength(2);
  });

  it("offers the three sizes, with the one in use chosen", () => {
    const html = pager({ pageSize: 48 });
    for (const size of [24, 48, 96]) expect(html).toContain(`value="${size}"`);
    expect(html).toContain(`selected=""`);
  });

  it("leaves out the middle of a long list, never a single page", () => {
    const html = pager({ page: 10, pages: 20, count: 480 });
    expect(html).toContain("…");
    expect(html).toContain(`aria-label="${en.pager.goToPage.replace("{page}", "20")}"`);
    expect(html).not.toContain(`aria-label="${en.pager.goToPage.replace("{page}", "15")}"`);
  });

  it("counts in Bangla, in Bangla", () => {
    const html = pager({ page: 2 }, "bn");
    expect(html).toContain(bn.pager.totalLabel);
    expect(html).toContain("৫১");
    expect(html).toContain(bn.pager.perPage);
    expect(html).toContain(`aria-label="${bn.pager.next}"`);
    // The page being read is drawn in Bangla too, not left in Western digits.
    expect(html).toMatch(/aria-current="page"[^>]*>২</);
  });
});
