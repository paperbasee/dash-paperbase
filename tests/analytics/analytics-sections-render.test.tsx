/**
 * Every section of the analytics page drawn from a report, in English and in
 * Bangla: no word missing, no sentence that cannot be put together, and the
 * numbers where the merchant reads them.
 */
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test, vi } from "vitest";

import { AnalyticsProvider } from "@/app/[locale]/(dashboard)/analytics/_lib/context";
import { makeFormat } from "@/app/[locale]/(dashboard)/analytics/_lib/format";
import type {
  Card,
  CustomersReport,
  DeliveryReport,
  DistrictRow,
  DistrictsReport,
  LiveReport,
  OverviewReport,
  PeriodInfo,
  ProductRow,
  ProductsReport,
  SalesReport,
  TrafficReport,
} from "@/app/[locale]/(dashboard)/analytics/_lib/types";
import { Customers } from "@/app/[locale]/(dashboard)/analytics/_sections/Customers";
import { Delivery } from "@/app/[locale]/(dashboard)/analytics/_sections/Delivery";
import { Districts } from "@/app/[locale]/(dashboard)/analytics/_sections/Districts";
import { Live } from "@/app/[locale]/(dashboard)/analytics/_sections/Live";
import { Overview } from "@/app/[locale]/(dashboard)/analytics/_sections/Overview";
import { Products } from "@/app/[locale]/(dashboard)/analytics/_sections/Products";
import { Sales } from "@/app/[locale]/(dashboard)/analytics/_sections/Sales";
import { Traffic } from "@/app/[locale]/(dashboard)/analytics/_sections/Traffic";
import { TooltipProvider } from "@/components/ui/tooltip";
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

// The dashboard's links need Next's router; a plain link draws the same.
// (The dashboard's layout gives the page its TooltipProvider; here the test does.)
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const period: PeriodInfo = {
  preset: "7",
  start_date: "2026-09-21",
  end_date: "2026-09-27",
  compare: "previous",
  compare_start_date: "2026-09-14",
  compare_end_date: "2026-09-20",
};
const base = { period, cached_at: 1_790_500_000, cache_ttl_seconds: 300 };

function card<T extends number | string>(value: T, previous: T, change: number, unit: Card["unit"] = "percent"): Card<T> {
  return { value, previous, change, unit };
}

const days = ["21", "22", "23", "24", "25", "26", "27"];
const series = {
  data: days.map((d, i) => ({ date: `2026-09-${d}`, sales: String(48200 + i * 3000), orders: 24 + i, visitors: 610 + i * 20 })),
  comparison: days.map((_, i) => ({ date: `2026-09-${14 + i}`, sales: String(44100 + i * 2500), orders: 22 + i, visitors: 540 + i * 15 })),
};

function district(key: string, name: string, orders: number, sales: string, delivered: number): DistrictRow {
  return { key, name, name_bn: name, division: "dhaka", orders, sales, parcels_finished: orders, delivered_rate: delivered, returned_rate: 100 - delivered };
}
const districts = [
  district("dhaka", "Dhaka", 64, "142300.00", 91),
  district("chattogram", "Chattogram", 21, "44800.00", 84),
  district("cumilla", "Cumilla", 9, "17300.00", 80),
];
const product: ProductRow = {
  product_id: "prd_1", product_name: "Heavyweight Pocket Tee", category: "Men", views: 620, add_to_cart: 148,
  purchases: 38, units: 41, returned: 2, revenue: "45100.00", conversion_rate: 6.1,
};
const source = { source: "facebook", visitors: 2410, paid_visitors: 900, orders: 98, sales: "205300.00", conversion: 4.1 };
const parcels = { not_dispatched: 5, in_transit: 4, delivered: 147, partial: 3, returned: 14, unknown: 0 };

const overview: OverviewReport = {
  ...base,
  cards: {
    sales: card("384250.00", "341860.00", 12.4),
    orders: card(186, 172, 8.1),
    visitors: card(4820, 4184, 15.2),
    conversion: card(3.9, 3.7, 0.2, "points"),
  },
  steps: {
    placed: { orders: 248, sales: "512400.00" },
    confirmed: { orders: 186, sales: "384250.00" },
    delivered: { orders: 147, sales: "301900.00" },
    not_confirmed: 62,
    not_delivered: 39,
  },
  series,
  journey: { visitors: 4820, viewed_product: 2960, added_to_cart: 690, started_checkout: 412, placed: 248, confirmed: 186 },
  sources: [source, { ...source, source: "(not tracked)", orders: 20, sales: "900000.00" }],
  campaigns: [{ campaign: "eid-sale", source: "facebook", channel: "paid_social", visitors: 900, orders: 40, sales: "80000.00", conversion: 4.4 }],
  landing: [{ path: "/en", kind: "home", name: "", visitors: 1800, engaged_rate: 61, conversion: 3.2 }],
  districts,
  divisions: [{ key: "dhaka", name: "Dhaka", name_bn: "ঢাকা", orders: 73, sales: "159600.00", delivered_rate: 90 }],
  parcels,
  best_sellers: [product],
  categories: [{ category: "Men", sales: "300000.00", share: 78 }],
};

const reports = {
  overview,
  sales: {
    ...base,
    cards: {
      sales: card("384250.00", "341860.00", 12.4),
      average_order: card("2066.00", "1988.00", 3.9),
      items_per_order: card(1.6, 1.5, 0.1, "plain"),
      discounts: card("21000.00", "18000.00", 16.7),
    },
    made_of: { full_price: "405250.00", discounts: "21000.00", discount_share: 5.2, sales: "384250.00", delivery_charges: "22000.00" },
    series,
    hours: Array.from({ length: 24 }, (_, h) => (h === 21 ? 9 : h % 5)),
    payments: [{ method: "cod", orders: 170, share: 91.4, sales: "350000.00" }],
    coupons: [{ code: "EID10", kind: "percent", value: "10", orders: 12, sales: "24000.00", given: "2400.00" }],
  } satisfies SalesReport,
  traffic: {
    ...base,
    cards: {
      visitors: card(4820, 4184, 15.2),
      visits: card(6100, 5300, 15.1),
      engaged: card(58.2, 55.1, 3.1, "points"),
      time_on_shop: card(102, 95, 7.4),
    },
    series: { data: series.data.map((p) => ({ date: p.date, visitors: p.visitors })), comparison: series.comparison.map((p) => ({ date: p.date, visitors: p.visitors })) },
    sources: [source],
    campaigns: overview.campaigns!,
    landing: overview.landing!,
    devices: [{ device: "mobile", visitors: 4100, share: 85, conversion: 3.8 }],
    visitor_mix: { new: 3900, returning: 920 },
    searches: [{ query: "hoodie", searches: 14, results: 0, bought: 0 }],
  } satisfies TrafficReport,
  products: {
    ...base,
    data: [product],
    categories: overview.categories!,
    needs_a_look: [{ kind: "sold_out", product_id: "prd_1", product_name: "Denim Work Shirt", views: 80, units: 0, returned: 0, conversion_rate: 0, returned_rate: 0 }],
  } satisfies ProductsReport,
  districts: {
    ...base,
    divisions: [
      { key: "dhaka", name: "Dhaka", name_bn: "ঢাকা", orders: 73, sales: "159600.00", delivered_rate: 90 },
      { key: "chattogram", name: "Chattogram", name_bn: "চট্টগ্রাম", orders: 30, sales: "62100.00", delivered_rate: 84 },
      { key: "rajshahi", name: "Rajshahi", name_bn: "রাজশাহী", orders: 0, sales: "0.00", delivered_rate: 0 },
      { key: "khulna", name: "Khulna", name_bn: "খুলনা", orders: 0, sales: "0.00", delivered_rate: 0 },
      { key: "barishal", name: "Barishal", name_bn: "বরিশাল", orders: 0, sales: "0.00", delivered_rate: 0 },
      { key: "sylhet", name: "Sylhet", name_bn: "সিলেট", orders: 4, sales: "7800.00", delivered_rate: 75 },
      { key: "rangpur", name: "Rangpur", name_bn: "রংপুর", orders: 0, sales: "0.00", delivered_rate: 0 },
      { key: "mymensingh", name: "Mymensingh", name_bn: "ময়মনসিংহ", orders: 0, sales: "0.00", delivered_rate: 0 },
    ],
    districts,
    not_recognised: { orders: 3, sales: "4200.00" },
  } satisfies DistrictsReport,
  delivery: {
    ...base,
    cards: {
      delivered: card(90, 88, 2, "points"),
      returned: card(8.5, 9.9, -1.4, "points"),
      days_to_deliver: card(2.4, 2.6, -0.2, "plain"),
      not_sent: card(5, 7, -2, "plain"),
    },
    parcels,
    couriers: [{ courier: "steadfast", parcels: 120, days_to_deliver: 2.3, delivered_rate: 91, returned_rate: 9 }],
    speed: [{ days: "0-1", share: 30 }, { days: "2", share: 45 }, { days: "3", share: 15 }, { days: "4+", share: 10 }],
    most_returns: [{ key: "cumilla", name: "Cumilla", name_bn: "কুমিল্লা", division: "chattogram", parcels: 9, returned_rate: 20 }],
  } satisfies DeliveryReport,
  customers: {
    ...base,
    cards: { customers: card(170, 150, 13.3), came_back: card(18.2, 16, 2.2, "points") },
    new: { customers: 140, per_order: "1900.00" },
    returning: { customers: 30, per_order: "2600.00" },
    top: [{ name: "Rahim", phone: "01711000000", district: "Dhaka", district_bn: "ঢাকা", spent: "12000.00", orders: 5 }],
    cohorts: [{ month: "2026-07-01", customers: 90, came_back: [12, 8] }],
  } satisfies CustomersReport,
};

const live: LiveReport = {
  right_now: 12,
  minutes: Array.from({ length: 30 }, (_, i) => i % 4),
  pages: [{ path: "/en", kind: "home", name: "", visitors: 5 }],
  sources: [{ source: "facebook", visitors: 7 }],
  orders_last_hour: 3,
  latest_orders: [
    { order_number: "PB-1042", placed_at: "2026-09-27T14:02:00+00:00", total: "2450.00", status: "pending", district: "Dhaka", district_bn: "ঢাকা", source: "facebook" },
  ],
  at: 1_790_520_000,
};

function draw(locale: "en" | "bn", section: ReactNode, full = true): string {
  const view = { format: makeFormat(locale, "৳"), compare: "previous" as const, full, goTo: () => {} };
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : bn} timeZone="Asia/Dhaka" onError={(error) => { throw error; }}>
      <TooltipProvider>
        <AnalyticsProvider value={view}>{section}</AnalyticsProvider>
      </TooltipProvider>
    </NextIntlClientProvider>,
  );
}

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe.each(["en", "bn"] as const)("every section, in %s", (locale) => {
  test.each([
    ["overview", <Overview key="o" report={reports.overview} />],
    ["sales", <Sales key="s" report={reports.sales} />],
    ["traffic", <Traffic key="t" report={reports.traffic} />],
    ["products", <Products key="p" report={reports.products} />],
    ["districts", <Districts key="d" report={reports.districts} />],
    ["delivery", <Delivery key="v" report={reports.delivery} />],
    ["customers", <Customers key="c" report={reports.customers} />],
    ["live", <Live key="l" report={live} />],
  ])("%s draws", (_, section) => {
    expect(draw(locale, section).length).toBeGreaterThan(500);
  });

  test("a Basic plan's Overview: the core sales, and the rest locked", () => {
    const basic: OverviewReport = { ...base, cards: { sales: overview.cards.sales, orders: overview.cards.orders }, steps: overview.steps, series };
    expect(draw(locale, <Overview report={basic} />, false).length).toBeGreaterThan(500);
  });
});

describe("the Overview reads as a story", () => {
  const page = text(draw("en", <Overview report={reports.overview} />));

  test("the days in one sentence", () => {
    expect(page).toContain("You made ৳384,250 from 186 confirmed orders — 12.4% more than the 7 days before.");
  });

  test("what moved the numbers, never a source the API could not name", () => {
    expect(page).toContain("Facebook brought 98 of your 186 orders , ৳205,300 in sales.");
    expect(page).toContain("Dhaka ordered the most, with 64 orders .");
    expect(page).toContain("Cumilla had the lowest delivery rate, 80% .");
  });

  test("what needs a look", () => {
    expect(page).toContain("62 orders were placed but not confirmed");
    expect(page).toContain("39 orders are confirmed but not delivered yet");
  });

  test("in Bangla, with Bangla digits", () => {
    expect(text(draw("bn", <Overview report={reports.overview} />))).toContain("আপনি ১৮৬টি কনফার্ম অর্ডার থেকে ৳৩৮৪,২৫০ আয় করেছেন");
  });
});

describe("the Districts map", () => {
  const html = draw("bn", <Districts report={reports.districts} />);

  test("all eight divisions on their borders, named in the page's language", () => {
    expect(html.match(/<path d="M/g)?.length).toBe(8);
    expect(text(html)).toContain("ময়মনসিংহ");
    expect(text(html)).toContain("মানচিত্র: geoBoundaries");
  });

  test("the division with the most is the darkest; one with no orders is left grey", () => {
    const fills = [...html.matchAll(/<path d="M[^"]*" fill="([^"]+)"/g)].map((match) => match[1]);
    expect(fills).toContain("hsl(var(--accent-blue) / 0.900)");
    expect(fills.filter((fill) => fill === "hsl(var(--muted-foreground) / 0.14)").length).toBe(5);
  });
});
