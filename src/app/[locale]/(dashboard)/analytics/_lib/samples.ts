import { addCalendarDaysYmd } from "@/utils/time";

import { dayCount, periodDays, type Period } from "./period";
import type {
  Card,
  CardUnit,
  CustomersReport,
  DeliveryReport,
  DistrictRow,
  DistrictsReport,
  DivisionRow,
  LiveReport,
  Parcels,
  PeriodInfo,
  ProductRow,
  ProductsReport,
  Report,
  TrafficReport,
} from "./types";

/**
 * The made-up numbers a Premium section is drawn with, blurred, on the Essential plan (owner,
 * 2026-10-03): the real section's own design, never the shop's data -- the API refuses those
 * reports on Essential, and the locked view asks for none. The same for every shop: plain names
 * ("Product 1"), real places and couriers, and the days the merchant picked, so the chart's axis
 * matches the date buttons. Anyone who lifts the blur in DevTools finds only these.
 */

function card<T extends number | string>(value: T, previous: T, change: number, unit: CardUnit = "percent"): Card<T> {
  return { value, previous, change, unit };
}

/** A gentle rise with a dip or two, for every chart. */
const WAVE = [0.62, 0.7, 0.66, 0.8, 0.74, 0.9, 1, 0.86, 0.94, 0.78, 0.88, 0.96];
const wave = (i: number, top: number) => Math.round(top * WAVE[i % WAVE.length]);

/** The picked days as the API would send them, with the days they are compared with. */
function samplePeriod(period: Period): PeriodInfo {
  const { start, end } = periodDays(period);
  const back = period.compare === "year" ? 365 : dayCount(start, end);
  return {
    preset: period.preset,
    start_date: start,
    end_date: end,
    compare: period.compare,
    compare_start_date: addCalendarDaysYmd(start, -back),
    compare_end_date: addCalendarDaysYmd(end, -back),
  };
}

/** The chart's points: each hour of a single day (as the API keys them), else each day. */
function chartDates(start: string, end: string): string[] {
  if (start === end) {
    return Array.from({ length: 24 }, (_, h) => `${start}T${String(h).padStart(2, "0")}:00:00+06:00`);
  }
  return Array.from({ length: dayCount(start, end) }, (_, i) => addCalendarDaysYmd(start, i));
}

function base(period: Period): Report {
  return { period: samplePeriod(period), cached_at: 0, cache_ttl_seconds: 0 };
}

const SOURCES = ["facebook", "google", "instagram", "(direct)", "tiktok"];

function district(key: string, name: string, name_bn: string, division: string, orders: number, delivered: number): DistrictRow {
  return {
    key,
    name,
    name_bn,
    division,
    orders,
    sales: String(orders * 2150),
    parcels_finished: orders,
    delivered_rate: delivered,
    returned_rate: 100 - delivered,
  };
}

const DISTRICTS: DistrictRow[] = [
  district("dhaka", "Dhaka", "ঢাকা", "dhaka", 64, 91),
  district("chattogram", "Chattogram", "চট্টগ্রাম", "chattogram", 31, 86),
  district("gazipur", "Gazipur", "গাজীপুর", "dhaka", 22, 89),
  district("narayanganj", "Narayanganj", "নারায়ণগঞ্জ", "dhaka", 17, 88),
  district("cumilla", "Cumilla", "কুমিল্লা", "chattogram", 13, 80),
  district("sylhet", "Sylhet", "সিলেট", "sylhet", 11, 84),
  district("rajshahi", "Rajshahi", "রাজশাহী", "rajshahi", 9, 87),
  district("khulna", "Khulna", "খুলনা", "khulna", 8, 85),
  district("bogura", "Bogura", "বগুড়া", "rajshahi", 6, 83),
  district("rangpur", "Rangpur", "রংপুর", "rangpur", 5, 82),
];

function division(key: string, name: string, name_bn: string, orders: number, delivered: number): DivisionRow {
  return { key, name, name_bn, orders, sales: String(orders * 2150), delivered_rate: delivered };
}

const DIVISIONS: DivisionRow[] = [
  division("dhaka", "Dhaka", "ঢাকা", 108, 90),
  division("chattogram", "Chattogram", "চট্টগ্রাম", 47, 84),
  division("rajshahi", "Rajshahi", "রাজশাহী", 17, 86),
  division("khulna", "Khulna", "খুলনা", 12, 85),
  division("barishal", "Barishal", "বরিশাল", 6, 81),
  division("sylhet", "Sylhet", "সিলেট", 11, 84),
  division("rangpur", "Rangpur", "রংপুর", 8, 82),
  division("mymensingh", "Mymensingh", "ময়মনসিংহ", 9, 83),
];

/** Parcels as the Overview's delivery list and the Delivery section count them. */
export const SAMPLE_PARCELS: Parcels = { not_dispatched: 6, in_transit: 18, delivered: 147, partial: 3, returned: 14, unknown: 0 };

function product(n: number, units: number, category: number): ProductRow {
  const views = units * 16;
  return {
    product_id: `sample_${n}`,
    product_name: `Product ${n}`,
    category: `Category ${category}`,
    views,
    add_to_cart: Math.round(views * 0.22),
    purchases: units,
    units,
    returned: Math.round(units * 0.05),
    revenue: String(units * 1150),
    conversion_rate: Math.round((units / views) * 1000) / 10,
  };
}

export function sampleTraffic(period: Period): TrafficReport {
  const report = base(period);
  const dates = chartDates(report.period.start_date, report.period.end_date);
  const compared = chartDates(report.period.compare_start_date, report.period.compare_end_date);
  const top = dates.length === 24 ? 40 : 700;
  return {
    ...report,
    cards: {
      visitors: card(4820, 4184, 15.2),
      visits: card(6100, 5300, 15.1),
      engaged: card(58.2, 55.1, 3.1, "points"),
      time_on_shop: card(102, 95, 7.4),
    },
    series: {
      data: dates.map((date, i) => ({ date, visitors: wave(i, top) })),
      comparison: compared.map((date, i) => ({ date, visitors: wave(i + 3, top * 0.85) })),
    },
    sources: SOURCES.map((source, i) => ({
      source,
      visitors: [2410, 1180, 640, 410, 180][i],
      paid_visitors: [900, 300, 120, 0, 60][i],
      orders: [98, 41, 22, 18, 7][i],
      sales: String([98, 41, 22, 18, 7][i] * 2100),
      conversion: [4.1, 3.5, 3.4, 4.4, 3.9][i],
    })),
    campaigns: [1, 2, 3].map((n) => ({
      campaign: `Campaign ${n}`,
      source: "facebook",
      channel: "paid_social",
      visitors: [900, 520, 260][n - 1],
      orders: [40, 19, 8][n - 1],
      sales: String([40, 19, 8][n - 1] * 2100),
      conversion: [4.4, 3.7, 3.1][n - 1],
    })),
    landing: [
      { path: "/", kind: "home", name: "", visitors: 1800, engaged_rate: 61, conversion: 3.2 },
      { path: "/c/1", kind: "category", name: "Category 1", visitors: 920, engaged_rate: 57, conversion: 2.9 },
      { path: "/p/1", kind: "product", name: "Product 1", visitors: 610, engaged_rate: 66, conversion: 5.1 },
    ],
    devices: [
      { device: "mobile", visitors: 4100, share: 85, conversion: 3.8 },
      { device: "desktop", visitors: 620, share: 13, conversion: 4.6 },
      { device: "tablet", visitors: 100, share: 2, conversion: 2.1 },
    ],
    visitor_mix: { new: 3900, returning: 920 },
    searches: [1, 2, 3].map((n) => ({ query: `search ${n}`, searches: [34, 21, 14][n - 1], results: [12, 6, 0][n - 1], bought: [5, 2, 0][n - 1] })),
  };
}

export function sampleProducts(period: Period): ProductsReport {
  return {
    ...base(period),
    data: [product(1, 41, 1), product(2, 33, 1), product(3, 27, 2), product(4, 19, 2), product(5, 12, 3)],
    categories: [
      { category: "Category 1", sales: "85100", share: 48 },
      { category: "Category 2", sales: "52900", share: 30 },
      { category: "Category 3", sales: "39000", share: 22 },
    ],
    needs_a_look: [
      { kind: "looked_not_bought", product_id: "sample_6", product_name: "Product 6", views: 420, units: 2, returned: 0, conversion_rate: 0.5, returned_rate: 0 },
      { kind: "came_back", product_id: "sample_7", product_name: "Product 7", views: 210, units: 10, returned: 3, conversion_rate: 4.8, returned_rate: 30 },
      { kind: "sold_out", product_id: "sample_8", product_name: "Product 8", views: 160, units: 0, returned: 0, conversion_rate: 0, returned_rate: 0 },
    ],
  };
}

export function sampleDistricts(period: Period): DistrictsReport {
  return { ...base(period), divisions: DIVISIONS, districts: DISTRICTS, not_recognised: { orders: 3, sales: "6450" } };
}

export function sampleDelivery(period: Period): DeliveryReport {
  return {
    ...base(period),
    cards: {
      delivered: card(90, 88, 2, "points"),
      returned: card(8.5, 9.9, -1.4, "points"),
      days_to_deliver: card(2.4, 2.6, -0.2, "plain"),
      not_sent: card(6, 8, -2, "plain"),
    },
    parcels: SAMPLE_PARCELS,
    couriers: [
      { courier: "steadfast", parcels: 120, days_to_deliver: 2.3, delivered_rate: 91, returned_rate: 9 },
      { courier: "pathao", parcels: 48, days_to_deliver: 2.6, delivered_rate: 88, returned_rate: 12 },
      { courier: "redx", parcels: 14, days_to_deliver: 3.1, delivered_rate: 84, returned_rate: 16 },
    ],
    speed: [
      { days: "0-1", share: 30 },
      { days: "2", share: 45 },
      { days: "3", share: 15 },
      { days: "4+", share: 10 },
    ],
    most_returns: DISTRICTS.slice(4, 7).map((row, i) => ({
      key: row.key,
      name: row.name,
      name_bn: row.name_bn,
      division: row.division,
      parcels: [13, 11, 9][i],
      returned_rate: [20, 16, 13][i],
    })),
  };
}

export function sampleCustomers(period: Period): CustomersReport {
  const report = base(period);
  const [year, monthNo] = [Number(report.period.end_date.slice(0, 4)), Number(report.period.end_date.slice(5, 7))];
  const month = (back: number) => new Date(Date.UTC(year, monthNo - 1 - back, 1)).toISOString().slice(0, 10);
  return {
    ...report,
    cards: { customers: card(170, 150, 13.3), came_back: card(18.2, 16, 2.2, "points") },
    new: { customers: 140, per_order: "1900" },
    returning: { customers: 30, per_order: "2600" },
    top: [1, 2, 3, 4, 5].map((n, i) => ({
      name: `Customer ${n}`,
      phone: "01700000000",
      district: DISTRICTS[i].name,
      district_bn: DISTRICTS[i].name_bn,
      spent: String([12000, 9400, 7800, 6100, 5200][i]),
      orders: [5, 4, 4, 3, 3][i],
    })),
    cohorts: [3, 2, 1].map((back, i) => ({ month: month(back), customers: [90, 110, 130][i], came_back: [[12, 8, 5], [14, 9], [16]][i] })),
  };
}

export function sampleLive(): LiveReport {
  const at = Math.floor(Date.now() / 1000);
  const ago = (minutes: number) => new Date((at - minutes * 60) * 1000).toISOString();
  return {
    right_now: 12,
    minutes: Array.from({ length: 30 }, (_, i) => wave(i, 9)),
    pages: [
      { path: "/", kind: "home", name: "", visitors: 5 },
      { path: "/p/1", kind: "product", name: "Product 1", visitors: 4 },
      { path: "/c/1", kind: "category", name: "Category 1", visitors: 3 },
    ],
    sources: [
      { source: "facebook", visitors: 7 },
      { source: "google", visitors: 3 },
      { source: "(direct)", visitors: 2 },
    ],
    orders_last_hour: 3,
    latest_orders: [1, 2, 3].map((n, i) => ({
      order_number: String(1000 + n),
      placed_at: ago([4, 17, 41][i]),
      total: String([2450, 1890, 3200][i]),
      status: "pending",
      district: DISTRICTS[i].name,
      district_bn: DISTRICTS[i].name_bn,
      source: SOURCES[i],
    })),
    at,
  };
}
