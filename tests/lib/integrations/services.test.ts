/**
 * The Integrations page's card switch: what it shows, what turning it changes,
 * and that one refused request never stops the rest. And every logo the page
 * draws is a file that really exists.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

import {
  AD_SERVICES,
  AD_SERVICES_COMING_SOON,
  DELIVERY_SERVICES_COMING_SOON,
  MAX_PIXELS_PER_SERVICE,
  PLATFORM_MARK_SRC,
  SERVICE_LOGO_FILES,
  courierPath,
  disconnectPath,
  marketingIntegrationPath,
  pixelsLeft,
  serviceState,
  setServiceActive,
  switchTargets,
} from "@/lib/integrations/services";

const on = (id: string) => ({ public_id: id, is_active: true, is_connected: true });
const off = (id: string) => ({ public_id: id, is_active: false, is_connected: true });
/** Disconnected: credentials forgotten, settings kept, and off. */
const gone = (id: string) => ({ public_id: id, is_active: false, is_connected: false });

describe("serviceState", () => {
  test("nothing connected", () => {
    expect(serviceState([])).toEqual({ count: 0, connected: 0, disconnected: 0, active: 0, on: false, shape: "none" });
  });

  test("only disconnected connections: the card has nothing to switch", () => {
    expect(serviceState([gone("a"), gone("b")])).toMatchObject({
      count: 2,
      connected: 0,
      disconnected: 2,
      on: false,
      shape: "disconnected",
    });
  });

  test("a disconnected connection is counted apart from the switchable ones", () => {
    expect(serviceState([on("a"), gone("b")])).toMatchObject({
      count: 2,
      connected: 1,
      disconnected: 1,
      active: 1,
      shape: "all_on",
    });
  });

  test("the card reads on while any connection is on", () => {
    expect(serviceState([on("a"), on("b")])).toMatchObject({ on: true, shape: "all_on", active: 2 });
    expect(serviceState([on("a"), off("b")])).toMatchObject({ on: true, shape: "some_on", active: 1 });
    expect(serviceState([off("a"), off("b")])).toMatchObject({ on: false, shape: "all_off", active: 0 });
  });
});

describe("switchTargets", () => {
  test("turning off touches only what is on, turning on only what is off", () => {
    const all = [on("a"), off("b"), on("c")];
    expect(switchTargets(all, false).map((one) => one.public_id)).toEqual(["a", "c"]);
    expect(switchTargets(all, true).map((one) => one.public_id)).toEqual(["b"]);
  });

  test("a disconnected connection is never switched on: only reconnecting can", () => {
    expect(switchTargets([gone("a"), off("b")], true).map((one) => one.public_id)).toEqual(["b"]);
    expect(switchTargets([gone("a")], true)).toEqual([]);
  });
});

describe("pixelsLeft", () => {
  test("counts down to zero and never below; a disconnected pixel still takes its place", () => {
    expect(MAX_PIXELS_PER_SERVICE).toBe(3);
    expect(pixelsLeft([])).toBe(3);
    expect(pixelsLeft([1, 2])).toBe(1);
    expect(pixelsLeft([1, 2, 3, 4])).toBe(0);
  });
});

describe("setServiceActive", () => {
  function fakeHttp(refuse: string[] = []) {
    const calls: { path: string; body: unknown }[] = [];
    const http = {
      async patch<T>(p: string, body: unknown) {
        calls.push({ path: p, body });
        if (refuse.some((id) => p.includes(id))) throw new Error(`refused ${p}`);
        return { data: {} as T };
      },
    };
    return { http, calls };
  }

  test("sends is_active to each connection that has to change, at its own path", async () => {
    const { http, calls } = fakeHttp();
    const result = await setServiceActive(http, marketingIntegrationPath, [on("a"), off("b"), on("c")], false);
    expect(result.failed).toEqual([]);
    expect(calls).toEqual([
      { path: "admin/marketing-integrations/a/", body: { is_active: false } },
      { path: "admin/marketing-integrations/c/", body: { is_active: false } },
    ]);
  });

  test("a refusal is reported and the others still go", async () => {
    const { http, calls } = fakeHttp(["b"]);
    const result = await setServiceActive(http, courierPath, [off("a"), off("b"), off("c")], true);
    expect(calls.map((call) => call.path)).toEqual([
      "admin/couriers/a/",
      "admin/couriers/b/",
      "admin/couriers/c/",
    ]);
    expect(result.failed).toEqual(["b"]);
    expect(result.errors).toHaveLength(1);
  });

  test("nothing to change sends nothing, and a disconnected one is left alone", async () => {
    const { http, calls } = fakeHttp();
    await setServiceActive(http, courierPath, [on("a"), gone("b")], true);
    expect(calls).toEqual([]);
  });

  test("the disconnect address sits under the connection's own", () => {
    expect(disconnectPath(marketingIntegrationPath("a"))).toBe("admin/marketing-integrations/a/disconnect/");
    expect(disconnectPath(courierPath("b"))).toBe("admin/couriers/b/disconnect/");
  });
});

describe("the page's services", () => {
  test("Meta and TikTok are the ad services that work; Google Analytics is coming", () => {
    expect(AD_SERVICES).toEqual(["facebook", "tiktok"]);
    expect(AD_SERVICES_COMING_SOON).toEqual(["google_analytics"]);
  });

  test("every courier we have a logo for, except Steadfast, shows as coming soon", () => {
    expect([...DELIVERY_SERVICES_COMING_SOON].sort()).toEqual(
      ["carrybee", "paperfly", "parceldex", "pathao", "redx"].sort(),
    );
  });

  test("every logo is a real file in public/", () => {
    const publicDir = path.resolve(__dirname, "../../../public");
    const files = [PLATFORM_MARK_SRC, ...Object.values(SERVICE_LOGO_FILES).map((logo) => logo!.src)];
    for (const src of files) {
      expect(existsSync(path.join(publicDir, src)), src).toBe(true);
    }
  });

  test("every picture-logo service on the page has a file (Meta and TikTok are drawn)", () => {
    for (const key of [...AD_SERVICES_COMING_SOON, "steadfast" as const, ...DELIVERY_SERVICES_COMING_SOON]) {
      expect(SERVICE_LOGO_FILES[key], key).toBeTruthy();
    }
  });
});
