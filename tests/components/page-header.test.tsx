/**
 * Every page's header (owner, 2026-10-04): the title and its ? on the left, the page's buttons, its
 * filter button and its main button on the right; what the page is for lives in the ?, and the
 * filters stay inside the filter button, which wears a dot while one is on.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { FilterPills } from "@/components/filters/FilterPills";
import { FilterToggle } from "@/components/filters/FilterToggle";
import { PageHeader } from "@/components/page/PageHeader";
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ back: vi.fn() }) }));

const draw = (node: React.ReactNode, locale: "en" | "bn" = "en") =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : bn} timeZone="Asia/Dhaka">
      {node}
    </NextIntlClientProvider>
  );

describe("the page header", () => {
  it("draws the title with its ?, and the buttons in the order given", () => {
    const html = draw(
      <PageHeader title="Orders" hint="Every order your shop receives.">
        <FilterToggle open={false} active={false} onToggle={() => {}} />
        <a href="/orders/new">Add order</a>
      </PageHeader>
    );
    expect(html).toMatch(/<h1[^>]*>Orders<\/h1>/);
    expect(html).toContain(`aria-label="${en.pages.aboutThisPage}"`);
    // The sentence waits in the ?, not under the title.
    expect(html).not.toContain("Every order your shop receives.");
    expect(html.indexOf(en.pages.filtersToggleAria)).toBeLessThan(html.indexOf("Add order"));
  });

  it("says so in Bangla too", () => {
    expect(draw(<PageHeader title="অর্ডার" hint="…" />, "bn")).toContain(`aria-label="${bn.pages.aboutThisPage}"`);
  });

  it("every page asks only for words that exist", () => {
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const full = path.join(dir, name);
        return statSync(full).isDirectory() ? files(full) : full.endsWith(".tsx") ? [full] : [];
      });
    const asked = new Set<string>();
    for (const file of files(path.resolve(__dirname, "../../src"))) {
      for (const call of readFileSync(file, "utf8").matchAll(/tHints(?:\.rich)?\(([^)]*)\)/g)) {
        // The words' names; not a value compared on the way (`mode === "new" ? "blogNew" : ...`).
        for (const key of call[1].matchAll(/(?<!=== )"(\w+)"/g)) asked.add(key[1]);
      }
    }
    expect(asked.size).toBeGreaterThan(25);
    for (const key of asked) expect(en.pageHints, key).toHaveProperty(key);
  });

  it("every page's words are there in both languages", () => {
    expect(Object.keys(bn.pageHints).sort()).toEqual(Object.keys(en.pageHints).sort());
    for (const words of [en.pageHints, bn.pageHints]) {
      for (const [page, line] of Object.entries(words)) expect(String(line).trim(), page).not.toBe("");
    }
  });
});

describe("the filter button", () => {
  it("wears a dot, and says so, only while a filter is on", () => {
    const off = draw(<FilterToggle open={false} active={false} onToggle={() => {}} />);
    const on = draw(<FilterToggle open={false} active onToggle={() => {}} />);
    expect(off).toContain(`aria-label="${en.pages.filtersToggleAria}"`);
    expect(off).not.toContain("rounded-full bg-primary");
    expect(on).toContain(`aria-label="${en.pages.filtersToggleActiveAria}"`);
    expect(on).toContain("rounded-full bg-primary");
    expect(draw(<FilterToggle open active={false} onToggle={() => {}} />)).toContain('aria-expanded="true"');
  });

  it("the one-tap choices inside the panel mark the one picked", () => {
    const html = draw(
      <FilterPills
        label="Delivery"
        options={[
          { value: "", label: "All" },
          { value: "in_transit", label: "In Transit" },
        ]}
        value="in_transit"
        onChange={() => {}}
      />
    );
    expect(html).toContain('aria-label="Delivery"');
    expect(html).toMatch(/aria-pressed="false"[^>]*>All</);
    expect(html).toMatch(/aria-pressed="true"[^>]*>In Transit</);
  });
});
