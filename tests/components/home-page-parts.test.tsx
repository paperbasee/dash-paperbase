/**
 * The home page (owner, 2026-11-12, round 5 of the designs): the orders in the period, where
 * every order is now, what needs attention and the courier's money. Every number links to the
 * list it counts, colour means late or risky and nothing else, and a part the member may not
 * open is not drawn.
 */
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { HomeOrdersPanel, squareGrid } from "@/components/dashboard/HomeOrdersPanel";
import { HomeSidePanel } from "@/components/dashboard/HomeSidePanel";
import { isOrderQueue, type HomeNumbers } from "@/lib/dashboard/home";

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
  pending: { count: 12, oldest_at: new Date(NOW - 50 * HOUR).toISOString() },
  payment_pending: { count: 3, oldest_at: new Date(NOW - 5 * HOUR).toISOString() },
  to_send: { count: 8, oldest_at: new Date(NOW - 26 * HOUR).toISOString() },
  in_transit: { count: 21, stuck: 2 },
  delivered_today: { count: 6 },
  returned_recently: { count: 3 },
};

const attention: HomeNumbers["attention"] = {
  risky: 2,
  incomplete_checkouts: 5,
  messages: 0,
  reviews: 4,
  out_of_stock: 2,
  low_stock: 5,
};

function render(node: ReactNode, locale: "en" | "bn" = "en") {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : bn} timeZone="Asia/Dhaka" now={new Date(NOW)}>
      {node}
    </NextIntlClientProvider>
  );
}

function panel(overrides: Partial<Parameters<typeof HomeOrdersPanel>[0]> = {}, locale: "en" | "bn" = "en") {
  return render(
    <HomeOrdersPanel
      summary={{ orders: 24, confirmed: 11, pending: 10, cancelled: 3 }}
      previousOrders={18}
      series={[
        { label: "2026-11-12T13:00:00+06:00", orders: 3 },
        { label: "2026-11-12T14:00:00+06:00", orders: 5 },
      ]}
      bucket="hour"
      flow={flow}
      now={NOW}
      {...overrides}
    />,
    locale
  );
}

describe("the orders panel", () => {
  it("counts the period's orders, their split, and the change on the period before", () => {
    const html = panel();
    expect(html).toContain(">24<");
    expect(html).toContain(">11<");
    expect(html).toContain(">10<");
    expect(html).toContain(">3<");
    expect(html).toMatch(/\+6<\/span> vs the period before/);
    expect(panel({ previousOrders: 24 })).toContain("Same as the period before");
    expect(panel({ previousOrders: 30 })).toContain("−6");
  });

  it("opens each step's own list", () => {
    const html = panel();
    expect(html).toContain('href="/orders?status=pending"');
    expect(html).toContain('href="/orders?status=payment_pending"');
    expect(html).toContain('href="/orders?status=confirmed&amp;delivery_status=not_dispatched"');
    expect(html).toContain('href="/orders?queue=stuck"');
    expect(html).toContain('href="/orders?queue=delivered_today"');
    expect(html).toContain('href="/orders?queue=returned_recently"');
    // With nothing stuck, On the way opens every parcel on the way.
    const calm = panel({ flow: { ...flow, in_transit: { count: 21, stuck: 0 } } });
    expect(calm).toContain('href="/orders?delivery_status=in_transit"');
    expect(calm).not.toContain("stuck over 5 days");
  });

  it("marks a step late only when its oldest order has waited a day", () => {
    const html = panel();
    expect(html).toMatch(/text-orange-700[^"]*">Oldest 2 days ago/);
    expect(html).toMatch(/text-orange-700[^"]*">Oldest 1 day ago/);
    expect(html).not.toMatch(/text-orange-700[^"]*">Oldest 5 hours ago/);
    expect(html).toContain("2 stuck over 5 days");
  });

  it("draws no order flow for a member who may not open orders", () => {
    const html = panel({ flow: null });
    expect(html).not.toContain("/orders?status=pending");
    expect(html).toContain(">24<");
  });

  it("speaks Bangla in Bangla digits", () => {
    const html = panel({}, "bn");
    expect(html).toContain("২৪");
    expect(html).toContain("আগের সময়ের তুলনায়");
    expect(html).toContain("৫ দিনের বেশি আটকে");
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
    const plotWidth = width - 30 - 0 - 10;
    const plotHeight = grid.height - 12 - 0 - 26;
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

describe("the side panel", () => {
  it("lists what needs attention, each opening its list, risky counts in red", () => {
    const html = render(<HomeSidePanel attention={attention} flow={flow} courier={undefined} />);
    expect(html).toContain('href="/orders?queue=risky"');
    expect(html).toContain('href="/orders/abandoned"');
    expect(html).toContain('href="/support-tickets?status=new"');
    expect(html).toContain('href="/reviews"');
    expect(html).toContain('href="/inventory?stock=out_of_stock"');
    expect(html).toContain('href="/inventory?stock=low_stock"');
    expect(html).toMatch(/text-rose-600[^"]*">2</);
    // Nothing waiting is quiet, never red.
    expect(html).toMatch(/text-muted-foreground\/70[^"]*">0</);
  });

  it("leaves out what the member may not open", () => {
    const staff = { ...attention, reviews: null, out_of_stock: null, low_stock: null };
    const html = render(<HomeSidePanel attention={staff} flow={flow} courier={undefined} />);
    expect(html).not.toContain("/reviews");
    expect(html).not.toContain("/inventory");
    expect(html).toContain("/orders?queue=risky");
  });

  it("shows the courier's money to whoever may see it, and nothing without Steadfast", () => {
    const money = render(
      <HomeSidePanel attention={attention} flow={flow} courier={{ state: "ok", amount: "46800.00", checked_at: "" }} />
    );
    expect(money).toContain("৳46,800");
    expect(money).toContain("Collected by Steadfast, not paid to you yet");
    expect(money).toContain('href="/orders?queue=stuck"');
    const none = render(<HomeSidePanel attention={attention} flow={flow} courier={{ state: "not_connected" }} />);
    expect(none).not.toContain("With the courier");
    const refused = render(<HomeSidePanel attention={attention} flow={flow} courier={{ state: "unauthorized" }} />);
    expect(refused).toContain("Steadfast refused your saved keys");
  });

  it("draws nothing at all when nothing in it is the member's", () => {
    const blank = { risky: null, incomplete_checkouts: null, messages: null, reviews: null, out_of_stock: null, low_stock: null };
    expect(render(<HomeSidePanel attention={blank} flow={null} courier={undefined} />)).toBe("");
  });
});

describe("the order list's views", () => {
  it("knows the home page's views and nothing else", () => {
    for (const queue of ["stuck", "delivered_today", "returned_recently", "risky"]) expect(isOrderQueue(queue)).toBe(true);
    for (const other of ["", "pending", "nonsense", null, undefined]) expect(isOrderQueue(other)).toBe(false);
  });
});
