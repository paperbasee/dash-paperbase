/**
 * The fraud check's "Paperbase history": how a number's parcels went in every shop on
 * Paperbase, counts only (owner, 2026-09-29: the in-house fraud check's own history).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";

import { HistoryPanel } from "@/app/[locale]/(dashboard)/orders/_components/FraudCheckDialog";
import type { PhoneHistory } from "@/app/[locale]/(dashboard)/orders/_components/types";
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

function render(history: PhoneHistory, locale: "en" | "bn" = "en") {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : bn}>
      <HistoryPanel history={history} />
    </NextIntlClientProvider>,
  );
}

describe("Paperbase history", () => {
  test("shows delivered, returned and how many shops said wrong number", () => {
    const html = render({ delivered: 7, returned: 2, wrong_number_shops: 1 });
    expect(html).toContain("Paperbase history");
    expect(html).toContain(">7<");
    expect(html).toContain(">2<");
    expect(html).toContain("1 shop");
    expect(html).not.toContain("1 shops");
  });

  test("a number with nothing on Paperbase says so instead of three zeros", () => {
    const html = render({ delivered: 0, returned: 0, wrong_number_shops: 0 });
    expect(html).toContain("No parcels to this number on Paperbase yet.");
    expect(html).not.toContain("Delivered");
  });

  test("reads in Bangla", () => {
    const html = render({ delivered: 3, returned: 0, wrong_number_shops: 2 }, "bn");
    expect(html).toContain("Paperbase-এর হিসাব");
    expect(html).toContain("2টি দোকান");
  });

  test("every word has both languages", () => {
    expect(Object.keys(bn.fraudCheck).sort()).toEqual(Object.keys(en.fraudCheck).sort());
  });
});
