/**
 * A Staff member limited to categories edits a whole order, but another department's line stays
 * as it is (owner, 2026-10-02): greyed, with a line saying why, and no quantity, variant or
 * remove control. The API refuses a change to it too.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test, vi } from "vitest";

import { OrderLineProductCard } from "@/components/orders/order-line-product-card";
import type { OrderItem } from "@/types";
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

vi.mock("@/components/ui/clickable-text", () => ({
  ClickableText: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

const line = (in_your_categories?: boolean): OrderItem => ({
  public_id: "oit_1",
  product: { public_id: "prd_1", name: "Tote" },
  product_public_id: "prd_1",
  product_name: "Tote",
  product_image: null,
  quantity: 2,
  unit_price: "800.00",
  original_price: "800.00",
  discount_amount: "0.00",
  line_subtotal: "1600.00",
  line_total: "1600.00",
  in_your_categories,
} as OrderItem);

function card(item: OrderItem, editing: boolean, locale: "en" | "bn" = "en") {
  const noop = () => {};
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : bn}>
      <OrderLineProductCard
        item={item}
        editing={editing}
        currencySymbol="৳"
        edit={undefined}
        variants={[]}
        variantsLoading={false}
        onQuantityChange={noop}
        onVariantChange={noop}
        onVariantFocus={noop}
        onRemove={noop}
      />
    </NextIntlClientProvider>,
  );
}

describe("another department's line on an order being edited", () => {
  test("stays as it is, and says why", () => {
    const html = card(line(false), true);
    expect(html).toContain("Outside your categories, so it stays as it is.");
    expect(html).not.toContain('type="number"');
    expect(html).not.toContain("<select");
    expect(html).not.toContain("Remove line item");
  });

  test("in Bangla too", () => {
    expect(card(line(false), true, "bn")).toContain("আপনার ক্যাটাগরির বাইরে");
  });

  test("their own line, and everyone's with no limit, can be changed", () => {
    for (const item of [line(true), line(undefined)]) {
      const html = card(item, true);
      expect(html).toContain('type="number"');
      expect(html).toContain("Remove line item");
      expect(html).not.toContain("Outside your categories");
    }
  });

  test("when nobody is editing, it reads like any other line", () => {
    expect(card(line(false), false)).not.toContain("Outside your categories");
  });
});
