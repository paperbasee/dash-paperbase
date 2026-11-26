/**
 * The home page (owner's pick of 2026-11-26, direction 1 -- light, like Google Analytics' home;
 * round 5 of 2026-11-12 before it): one card of four numbers as tabs over one chart, the "right
 * now" card beside it, what to look at in words, the latest orders, what needs attention and the
 * courier's money. Every number links to the list it counts, colour means something or nothing,
 * and a part the member may not open is not drawn.
 */
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { HomeInsights } from "@/components/dashboard/HomeInsights";
import { CHART_MARGIN, HomeOrdersPanel, peakLabels, periodChange, squareGrid } from "@/components/dashboard/HomeOrdersPanel";
import { HomeRightNow } from "@/components/dashboard/HomeRightNow";
import { HomeAttention, HomeCourier } from "@/components/dashboard/HomeSidePanel";
import type { DashboardAnalyticsPoint } from "@/lib/basicAnalyticsService";
import { homeInsights, isOrderQueue, type HomeNumbers } from "@/lib/dashboard/home";

import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const NOW = Date.parse("2026-11-12T09:20:00Z");
const HOUR = 60 * 60 * 1000;

const flow: NonNullable<HomeNumbers["flow"]> = {
  pending: { count: 12, oldest_at: new Date(NOW - 50 * HOUR).toISOString(), over_day: 3 },
  payment_pending: { count: 3, oldest_at: new Date(NOW - 5 * HOUR).toISOString() },
  to_send: { count: 8, oldest_at: new Date(NOW - 26 * HOUR).toISOString() },
  in_transit: { count: 21, stuck: 2 },
  delivered_today: { count: 6 },
  returned_recently: { count: 3 },
};

const quiet: NonNullable<HomeNumbers["flow"]> = {
  pending: { count: 0, oldest_at: null, over_day: 0 },
  payment_pending: { count: 0, oldest_at: null },
  to_send: { count: 0, oldest_at: null },
  in_transit: { count: 0, stuck: 0 },
  delivered_today: { count: 0 },
  returned_recently: { count: 0 },
};

const attention: HomeNumbers["attention"] = {
  risky: 2,
  incomplete_checkouts: 5,
  messages: 0,
  reviews: 4,
  out_of_stock: 2,
  low_stock: 5,
};

const point = (label: string, orders: number, confirmed = 0, pending = 0, cancelled = 0): DashboardAnalyticsPoint => ({
  label,
  orders,
  confirmed,
  pending,
  cancelled,
});

function render(node: ReactNode, locale: "en" | "bn" = "en") {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : bn} timeZone="Asia/Dhaka" now={new Date(NOW)}>
      {node}
    </NextIntlClientProvider>
  );
}

function overview(overrides: Partial<Parameters<typeof HomeOrdersPanel>[0]> = {}, locale: "en" | "bn" = "en") {
  return render(
    <HomeOrdersPanel
      summary={{ orders: 184, confirmed: 121, pending: 41, cancelled: 22 }}
      previous={{ orders: 164, confirmed: 111, pending: 35, cancelled: 18 }}
      series={[point("2026-11-11", 22, 14, 5, 3), point("2026-11-12", 31, 21, 7, 3)]}
      previousSeries={[point("2026-11-09", 20), point("2026-11-10", 25)]}
      bucket="day"
      shopUrl="https://rupkotha.paperbase.me"
      {...overrides}
    />,
    locale
  );
}

describe("the overview card", () => {
  it("shows the four numbers as tabs, each with its change on the period before", () => {
    const html = overview();
    expect(html.match(/role="tab"/g)).toHaveLength(4);
    expect(html).toMatch(/aria-selected="true"[^>]*>[\s\S]*?Orders/);
    for (const value of [">184<", ">121<", ">41<", ">22<"]) expect(html).toContain(value);
    expect(html).toContain("12.2%");
    expect(html).toContain("vs 164");
  });

  it("colours a change by what it means: more orders good, more cancelled bad, pending neither", () => {
    const html = overview();
    expect(html).toMatch(/text-emerald-700[^"]*">▲ 12\.2%/);
    expect(html).toMatch(/text-rose-600[^"]*">▲ 22\.2%/);
    expect(html).toMatch(/text-muted-foreground[^"]*">▲ 17\.1%/);
  });

  it("says when nothing moved, and when there was nothing before", () => {
    expect(overview({ previous: { orders: 184, confirmed: 121, pending: 41, cancelled: 22 } })).toContain("Same as before");
    expect(overview({ previous: { orders: 0, confirmed: 0, pending: 0, cancelled: 0 } })).toContain("+184");
  });

  it("asks for the first orders of a quiet period, with the shop's link", () => {
    const html = overview({ summary: { orders: 0, confirmed: 0, pending: 0, cancelled: 0 }, series: [point("2026-11-12", 0)] });
    expect(html).toContain("No orders in these days");
    expect(html).toContain("Copy shop link");
    expect(html).toContain(`href="https://wa.me/?text=`);
    expect(html).toContain(encodeURIComponent("https://rupkotha.paperbase.me"));
  });

  it("speaks Bangla in Bangla digits", () => {
    const html = overview({}, "bn");
    expect(html).toContain("১৮৪");
    expect(html).toContain("১২.২%");
  });
});

describe("a change on the period before", () => {
  it("is a share of the period before, to one decimal", () => {
    expect(periodChange(184, 164)).toEqual({ kind: "up", percent: 12.2 });
    expect(periodChange(10, 20)).toEqual({ kind: "down", percent: 50 });
    expect(periodChange(5, 5)).toEqual({ kind: "same" });
    expect(periodChange(7, 0)).toEqual({ kind: "new", added: 7 });
    expect(periodChange(0, 0)).toEqual({ kind: "same" });
  });
});

describe("the right now card", () => {
  it("says how many orders wait, and opens each step's own list", () => {
    const html = render(<HomeRightNow flow={flow} now={NOW} />);
    expect(html).toContain(">23<");
    expect(html).toContain('href="/orders?status=pending"');
    expect(html).toContain('href="/orders?status=payment_pending"');
    expect(html).toContain('href="/orders?status=confirmed&amp;delivery_status=not_dispatched"');
    expect(html).toContain('href="/orders?queue=stuck"');
    expect(html).toContain('href="/orders?queue=delivered_today"');
    expect(html).toContain('href="/orders?queue=returned_recently"');
    const calm = render(<HomeRightNow flow={{ ...flow, in_transit: { count: 21, stuck: 0 } }} now={NOW} />);
    expect(calm).toContain('href="/orders?delivery_status=in_transit"');
    expect(calm).not.toContain("stuck");
  });

  it("marks a step late only when its oldest order has waited a day", () => {
    const html = render(<HomeRightNow flow={flow} now={NOW} />);
    expect(html).toMatch(/text-orange-700[^"]*">Oldest 2 days ago/);
    expect(html).toMatch(/text-orange-700[^"]*">Oldest 1 day ago/);
    expect(html).not.toMatch(/text-orange-700[^"]*">Oldest 5 hours ago/);
    expect(html).toMatch(/text-rose-600[^"]*">· 2 stuck/);
  });

  it("says so when nothing waits", () => {
    const html = render(<HomeRightNow flow={quiet} now={NOW} />);
    expect(html).toContain("Nothing waits for you");
    expect(html).not.toContain("/orders?status=pending");
  });
});

describe("the insights", () => {
  it("are said only while true, most urgent first", () => {
    const summary = { orders: 184, confirmed: 121, pending: 41, cancelled: 22 };
    const before = { orders: 164, confirmed: 111, pending: 35, cancelled: 18 };
    expect(homeInsights(flow, summary, before)).toEqual([
      { kind: "late", count: 3 },
      { kind: "stuck", count: 2 },
      { kind: "cancelled", percent: 22, now: 22, before: 18 },
    ]);
    expect(homeInsights(quiet, summary, { ...before, cancelled: 21 })).toEqual([]);
    // A rise of one order is noise, however large a share; two or more and a fifth or more is news.
    expect(homeInsights(quiet, { ...summary, cancelled: 2 }, { ...before, cancelled: 1 })).toEqual([]);
    expect(homeInsights(quiet, { ...summary, cancelled: 3 }, { ...before, cancelled: 1 })).toEqual([
      { kind: "cancelled", percent: 200, now: 3, before: 1 },
    ]);
    expect(homeInsights(quiet, { ...summary, cancelled: 3 }, { ...before, cancelled: 0 })).toEqual([]);
    expect(homeInsights(null, summary, before)).toEqual([]);
  });

  it("each opens the orders it is about", () => {
    const html = render(
      <HomeInsights insights={homeInsights(flow, { orders: 1, confirmed: 0, pending: 0, cancelled: 22 }, { orders: 1, confirmed: 0, pending: 0, cancelled: 18 })} onShowCancelled={() => undefined} />
    );
    expect(html).toContain("3 orders have waited over a day");
    expect(html).toContain('href="/orders?queue=pending_over_day"');
    expect(html).toContain("2 parcels are stuck with the courier");
    expect(html).toContain("Cancellations rose 22%");
    expect(render(<HomeInsights insights={[]} onShowCancelled={() => undefined} />)).toBe("");
  });
});

describe("needs attention", () => {
  it("lists each count, opening its list, risky counts in red and nothing waiting quiet", () => {
    const html = render(<HomeAttention attention={attention} />);
    for (const href of ["/orders?queue=risky", "/orders/abandoned", "/support-tickets?status=new", "/reviews", "/inventory?stock=out_of_stock", "/inventory?stock=low_stock"]) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(html).toMatch(/text-rose-600[^"]*">2</);
    expect(html).toMatch(/text-muted-foreground\/70[^"]*">0</);
  });

  it("leaves out what the member may not open, and says all clear when nothing needs them", () => {
    const staff = render(<HomeAttention attention={{ ...attention, reviews: null, out_of_stock: null, low_stock: null }} />);
    expect(staff).not.toContain("/reviews");
    expect(staff).not.toContain("/inventory");
    const clear = render(<HomeAttention attention={{ risky: 0, incomplete_checkouts: 0, messages: 0, reviews: 0, out_of_stock: 0, low_stock: 0 }} />);
    expect(clear).toContain("All clear");
    const blank = { risky: null, incomplete_checkouts: null, messages: null, reviews: null, out_of_stock: null, low_stock: null };
    expect(render(<HomeAttention attention={blank} />)).toBe("");
  });
});

describe("the courier's money", () => {
  it("shows the money to whoever may see it, and asks for Steadfast where it is not connected", () => {
    const money = render(<HomeCourier courier={{ state: "ok", amount: "48250.00", checked_at: "" }} flow={flow} />);
    expect(money).toContain("৳48,250");
    expect(money).toContain("Collected by Steadfast, not paid to you yet");
    const none = render(<HomeCourier courier={{ state: "not_connected" }} flow={flow} />);
    expect(none).toContain("Connect a courier");
    expect(none).toContain('href="/settings?tab=integrations"');
    expect(render(<HomeCourier courier={{ state: "unauthorized" }} flow={flow} />)).toContain("Steadfast refused your saved keys");
    expect(render(<HomeCourier courier={undefined} flow={flow} />)).toBe("");
  });
});

describe("the orders chart's grid", () => {
  // Owner, 2026-11-12: "the squares of the graph is not equal (especially on right side)". The
  // columns had followed the date labels, which fall unevenly; the grid now comes first.
  it.each([
    [1280, 89, 28],
    [700, 23, 5],
    [330, 89, 7],
    [900, 6, 0],
  ])("draws square boxes at %ipx wide over %i buckets", (width, lastIndex, maxOrders) => {
    const grid = squareGrid(width, lastIndex, maxOrders);
    const columns = grid.xTicks.length - 1;
    const rows = grid.yTicks.length - 1;
    const plotWidth = width - CHART_MARGIN.left - CHART_MARGIN.right;
    const plotHeight = grid.height - CHART_MARGIN.top - CHART_MARGIN.bottom - 26;
    // The same space on both sides of the grid.
    expect(CHART_MARGIN.left).toBe(CHART_MARGIN.right);
    expect(Math.abs(plotWidth / columns - plotHeight / rows)).toBeLessThan(1);
    // Every column the same width, in buckets as in pixels.
    const steps = grid.xTicks.slice(1).map((x, i) => x - grid.xTicks[i]);
    for (const step of steps) expect(step).toBeCloseTo(steps[0], 9);
    // The first and the last line carry a date: the period's start and now.
    expect(grid.xTicks[0]).toBe(0);
    expect(grid.xTicks[columns]).toBe(grid.xMax);
    expect(columns % grid.labelEvery).toBe(0);
    // Whole numbers of orders on every row.
    for (const tick of grid.yTicks) expect(Number.isInteger(tick)).toBe(true);
    expect(grid.yTicks[rows]).toBeGreaterThanOrEqual(maxOrders);
  });
});

describe("the counts over the line", () => {
  // Owner, 2026-11-12: "no need to show the y axis number just show the number on top of the lines".
  it("marks the peaks and now, never a quiet day", () => {
    const values = [0, 0, 28, 0, 0, 4, 1, 7, 0, 6, 0, 3, 0, 0];
    expect([...peakLabels(values, 1)].sort((a, b) => a - b)).toEqual([2, 5, 7, 9, 11]);
    expect(peakLabels([0, 0, 0], 1).size).toBe(0);
    expect(peakLabels([0, 2, 5], 1)).toEqual(new Set([2]));
  });

  it("keeps the higher of two peaks too close to both be read", () => {
    const values = [0, 4, 0, 7, 0, 6, 0, 0, 0, 3];
    // Two buckets apart is too close: 7 stays, 4 and 6 beside it go; now (3) always shows.
    expect([...peakLabels(values, 3)].sort((a, b) => a - b)).toEqual([3, 9]);
  });

  it("marks a level run once, at its start", () => {
    expect(peakLabels([0, 5, 5, 5, 0, 0], 1)).toEqual(new Set([1]));
  });
});

describe("the order list's views", () => {
  it("knows the home page's views and nothing else", () => {
    for (const queue of ["pending_over_day", "stuck", "delivered_today", "returned_recently", "risky"]) {
      expect(isOrderQueue(queue)).toBe(true);
    }
    for (const other of ["", "pending", "nonsense", null, undefined]) expect(isOrderQueue(other)).toBe(false);
  });
});
