import { describe, expect, it } from "vitest";
import { fetchShippingZones } from "@/hooks/useShippingZonesQuery";
import type { PaginatedResponse, ShippingZone } from "@/types";

function zone(id: string): ShippingZone {
  return { public_id: id, name: `Zone ${id}` } as ShippingZone;
}

describe("fetchShippingZones", () => {
  it("reads every page so an order's zone is always in the list", async () => {
    const pages: Record<string, PaginatedResponse<ShippingZone>> = {
      "1": { count: 3, next: "next", previous: null, results: [zone("a"), zone("b")] },
      "2": { count: 3, next: null, previous: "prev", results: [zone("c")] },
    };
    const calls: Array<{ url: string; params: unknown }> = [];
    const http = {
      get: async (url: string, config?: { params?: Record<string, string> }) => {
        calls.push({ url, params: config?.params });
        return { data: pages[config?.params?.page ?? ""] };
      },
    };
    const zones = await fetchShippingZones(http as never);
    expect(zones.map((z) => z.public_id)).toEqual(["a", "b", "c"]);
    expect(calls).toEqual([
      { url: "admin/shipping-zones/", params: { page: "1" } },
      { url: "admin/shipping-zones/", params: { page: "2" } },
    ]);
  });

  it("still accepts a plain array response", async () => {
    const http = { get: async () => ({ data: [zone("a")] }) };
    const zones = await fetchShippingZones(http as never);
    expect(zones.map((z) => z.public_id)).toEqual(["a"]);
  });
});
