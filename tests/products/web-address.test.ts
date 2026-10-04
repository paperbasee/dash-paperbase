import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkAddress, scheduleAddressCheck, type AddressCheckHttp } from "@/lib/web-address";

type Pending = { resolve: () => void; reject: (err: unknown) => void };

/**
 * A fake check answering like the API (products.addresses): `address` is what the words become
 * (lower-case, spaces to hyphens -- the real maker also writes Bangla in English letters),
 * `available`, and `suggested_slug`, the first free of address, -2, -3 ...
 */
function fakeCheck(taken: string[], opts: { autoResolve?: boolean } = {}) {
  const takenSet = new Set(taken);
  const pending: Pending[] = [];
  const get = vi.fn((url: string, config?: { params?: Record<string, string>; signal?: AbortSignal }) => {
    const words = config?.params?.slug ?? config?.params?.name ?? "";
    const address = words.trim().toLowerCase().replace(/\s+/g, "-");
    let suggested = address;
    for (let n = 2; takenSet.has(suggested); n++) suggested = `${address}-${n}`;
    const data = { available: !takenSet.has(address), suggested_slug: suggested, address };
    return new Promise<{ data: typeof data }>((resolve, reject) => {
      const entry: Pending = { resolve: () => resolve({ data }), reject };
      config?.signal?.addEventListener("abort", () =>
        reject(Object.assign(new Error("canceled"), { name: "AbortError" })),
      );
      if (opts.autoResolve) entry.resolve();
      else pending.push(entry);
    });
  });
  return { http: { get } as unknown as AddressCheckHttp, get, pending };
}

const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

describe("checkAddress", () => {
  it("asks the product check by name for a new product's first address", async () => {
    const fake = fakeCheck(["blue-cap"], { autoResolve: true });
    const check = await checkAddress(fake.http, "product", { name: "Blue Cap" });
    expect(fake.get.mock.calls[0][0]).toBe("admin/products/check-slug/");
    expect(fake.get.mock.calls[0][1]?.params).toEqual({ name: "Blue Cap" });
    expect(check).toEqual({ address: "blue-cap", available: false, suggested: "blue-cap-2" });
  });

  it("asks the category check with a typed address and leaves the edited one out", async () => {
    const fake = fakeCheck([], { autoResolve: true });
    const check = await checkAddress(fake.http, "category", { address: "Kurta" }, { excludePublicId: "cat_1" });
    expect(fake.get.mock.calls[0][0]).toBe("admin/categories/check-slug/");
    expect(fake.get.mock.calls[0][1]?.params).toEqual({ slug: "Kurta", exclude_public_id: "cat_1" });
    expect(check).toEqual({ address: "kurta", available: true, suggested: "kurta" });
  });
});

describe("scheduleAddressCheck", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([1, 9])("finds a free address in one request when %i are taken", async (k) => {
    const taken = ["t-shirt", ...Array.from({ length: k - 1 }, (_, i) => `t-shirt-${i + 2}`)];
    const fake = fakeCheck(taken, { autoResolve: true });
    const onResult = vi.fn();
    scheduleAddressCheck({ http: fake.http, kind: "product", question: { name: "T Shirt" }, onChecking: () => {}, onResult });
    await vi.advanceTimersByTimeAsync(400);
    await flush();
    expect(fake.get).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith({ address: "t-shirt", available: false, suggested: `t-shirt-${k + 1}` });
  });

  it("a check replaced before it answers never reports its result", async () => {
    const fake = fakeCheck(["shirt", "shirt-2"]);
    const onResult = vi.fn();
    const cancelFirst = scheduleAddressCheck({
      http: fake.http,
      kind: "product",
      question: { address: "shirt" },
      onChecking: () => {},
      onResult,
    });
    await vi.advanceTimersByTimeAsync(400);
    expect(fake.pending).toHaveLength(1);
    // The merchant keeps typing: the effect cleans up and asks about the new words.
    cancelFirst();
    scheduleAddressCheck({ http: fake.http, kind: "product", question: { address: "shirts" }, onChecking: () => {}, onResult });
    await vi.advanceTimersByTimeAsync(400);
    for (const entry of [...fake.pending].reverse()) entry.resolve();
    for (let i = 0; i < 10; i++) {
      await flush();
      for (const entry of fake.pending.splice(0)) entry.resolve();
    }
    expect(onResult.mock.calls.map(([r]) => r.address)).toEqual(["shirts"]);
  });

  it("a check replaced while it is running turns the checking state off", async () => {
    const fake = fakeCheck([]);
    const onChecking = vi.fn();
    const cancel = scheduleAddressCheck({ http: fake.http, kind: "category", question: { name: "Cup" }, onChecking, onResult: () => {} });
    await vi.advanceTimersByTimeAsync(400);
    cancel();
    await flush();
    expect(onChecking.mock.calls.map(([v]) => v)).toEqual([true, false]);
  });

  it("a check cancelled before its timer fires never asks", async () => {
    const fake = fakeCheck([]);
    const onChecking = vi.fn();
    const cancel = scheduleAddressCheck({ http: fake.http, kind: "product", question: { name: "Cup" }, onChecking, onResult: () => {} });
    cancel();
    await vi.advanceTimersByTimeAsync(400);
    await flush();
    expect(onChecking).not.toHaveBeenCalled();
    expect(fake.get).not.toHaveBeenCalled();
  });

  it("a failed check answers nothing rather than a guess", async () => {
    const fake = fakeCheck([]);
    const onResult = vi.fn();
    const onChecking = vi.fn();
    scheduleAddressCheck({ http: fake.http, kind: "product", question: { address: "cup" }, onChecking, onResult });
    await vi.advanceTimersByTimeAsync(400);
    fake.pending[0].reject(new Error("boom"));
    await flush();
    expect(onResult).toHaveBeenCalledWith(null);
    expect(onChecking.mock.calls.map(([v]) => v)).toEqual([true, false]);
  });
});
