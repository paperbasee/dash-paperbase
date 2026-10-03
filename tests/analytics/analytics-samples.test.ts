/**
 * The made-up numbers behind a locked Premium section (_lib/samples.ts): each list's rows are told
 * apart by the same field the section keys them by, so every one must be different -- two sample
 * customers with one phone made React warn of duplicate keys (2026-10-03).
 */
import { describe, expect, test } from "vitest";

import {
  sampleCustomers,
  sampleDelivery,
  sampleDistricts,
  sampleLive,
  sampleProducts,
  sampleTraffic,
} from "@/app/[locale]/(dashboard)/analytics/_lib/samples";

const week = { preset: "7", compare: "previous" } as const;
const distinct = (values: string[]) => new Set(values).size === values.length;

describe("each sample list keys its rows uniquely, as its section does", () => {
  const traffic = sampleTraffic(week);
  const products = sampleProducts(week);
  const districts = sampleDistricts(week);
  const delivery = sampleDelivery(week);
  const customers = sampleCustomers(week);
  const live = sampleLive();

  test.each([
    ["traffic sources", traffic.sources.map((r) => r.source)],
    ["campaigns", traffic.campaigns.map((r) => r.campaign)],
    ["landing pages", traffic.landing.map((r) => r.path)],
    ["devices", traffic.devices.map((r) => r.device)],
    ["searches", traffic.searches.map((r) => r.query)],
    ["products", products.data.map((r) => r.product_id)],
    ["categories", products.categories.map((r) => r.category)],
    ["districts", districts.districts.map((r) => r.key)],
    ["divisions", districts.divisions.map((r) => r.key)],
    ["couriers", delivery.couriers.map((r) => r.courier)],
    ["most returns", delivery.most_returns.map((r) => r.key)],
    ["top customers", customers.top.map((r) => r.phone)],
    ["cohorts", customers.cohorts.map((r) => r.month)],
    ["live pages", live.pages.map((r) => r.path)],
    ["live sources", live.sources.map((r) => r.source)],
    ["latest orders", live.latest_orders.map((r) => r.order_number)],
  ])("%s", (_, keys) => {
    expect(keys.length).toBeGreaterThan(1);
    expect(distinct(keys)).toBe(true);
  });
});
