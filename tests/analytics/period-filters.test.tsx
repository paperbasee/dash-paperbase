/**
 * The analytics days sit behind the filter button (owner, 2026-10-04): the quick choices and
 * Custom in its panel, in English and in Bangla, with the chosen days named and Clear beside them.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test, vi } from "vitest";

import { PeriodFilters } from "@/app/[locale]/(dashboard)/analytics/_components/PeriodControls";
import { AnalyticsProvider } from "@/app/[locale]/(dashboard)/analytics/_lib/context";
import { makeFormat } from "@/app/[locale]/(dashboard)/analytics/_lib/format";
import type { Period } from "@/app/[locale]/(dashboard)/analytics/_lib/period";
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

// The analytics kit's links need Next's router; this panel draws none.
vi.mock("@/i18n/navigation", () => ({ Link: () => null }));

const draw = (period: Period, locale: "en" | "bn" = "en") =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : bn} timeZone="Asia/Dhaka">
      <AnalyticsProvider value={{ format: makeFormat(locale, "৳"), compare: period.compare, goTo: () => {} }}>
        <PeriodFilters period={period} onChange={() => {}} onClear={() => {}} />
      </AnalyticsProvider>
    </NextIntlClientProvider>
  );

describe("the analytics days panel", () => {
  test("offers every choice, marks the one shown, and can be cleared", () => {
    const html = draw({ preset: "30", compare: "previous" });
    for (const word of [en.analyticsPage.period.today, en.analyticsPage.period.yesterday, en.analyticsPage.period.month]) {
      expect(html).toContain(word);
    }
    expect(html).toContain(en.analyticsPage.period.custom);
    expect(html).toMatch(/aria-pressed="true"[^>]*>30 days</);
    expect(html).toContain(`aria-label="${en.analyticsPage.period.pickTitle}"`);
    expect(html).toContain(en.pages.filtersClear);
  });

  test("names the days once chosen, in Bangla too", () => {
    const html = draw({ preset: "custom", start: "2026-09-01", end: "2026-09-10", compare: "year" }, "bn");
    expect(html).not.toContain(bn.analyticsPage.period.custom);
    expect(html).toContain(bn.pages.filtersClear);
    expect(html).toContain(bn.analyticsPage.period.today);
  });
});
