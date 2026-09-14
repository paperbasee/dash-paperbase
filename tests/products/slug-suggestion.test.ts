import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scheduleSlugSuggestion, type SlugCheckHttp } from "@/lib/products/slug-suggestion";

type Pending = { slug: string; resolve: () => void; reject: (err: unknown) => void };

/**
 * Fake GET admin/products/check-slug/ answering like the API: `available` for the slug asked
 * about and `suggested_slug`, the first free one of slug, slug-2, slug-3 ... Requests stay pending
 * until the test settles them (or settle at once with `autoResolve`).
 */
function fakeCheckSlug(taken: string[], opts: { autoResolve?: boolean } = {}) {
  const takenSet = new Set(taken);
  const pending: Pending[] = [];
  const get = vi.fn(
    (url: string, config?: { params?: Record<string, string>; signal?: AbortSignal }) => {
      const query = new URL(url, "https://x/").searchParams;
      const slug = config?.params?.slug ?? query.get("slug") ?? "";
      let suggested = slug;
      for (let n = 2; takenSet.has(suggested); n++) suggested = `${slug}-${n}`;
      const data = { available: !takenSet.has(slug), suggested_slug: suggested };
      return new Promise<{ data: typeof data }>((resolve, reject) => {
        const entry: Pending = { slug, resolve: () => resolve({ data }), reject };
        config?.signal?.addEventListener("abort", () =>
          reject(Object.assign(new Error("canceled"), { name: "AbortError" })),
        );
        if (opts.autoResolve) entry.resolve();
        else pending.push(entry);
      });
    },
  );
  return { http: { get } as unknown as SlugCheckHttp, get, pending };
}

const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

describe("product slug suggestion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([1, 9])("finds a free slug in one request when %i candidates are taken", async (k) => {
    const taken = ["t-shirt", ...Array.from({ length: k - 1 }, (_, i) => `t-shirt-${i + 2}`)];
    const fake = fakeCheckSlug(taken, { autoResolve: true });
    const onResult = vi.fn();
    scheduleSlugSuggestion({
      http: fake.http,
      baseSlug: "t-shirt",
      onChecking: () => {},
      onResult,
    });
    await vi.advanceTimersByTimeAsync(400);
    await flush();
    expect(fake.get).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith({ slug: `t-shirt-${k + 1}`, usesFallback: true });
  });

  it("keeps the typed slug when it is free", async () => {
    const fake = fakeCheckSlug([], { autoResolve: true });
    const onResult = vi.fn();
    scheduleSlugSuggestion({ http: fake.http, baseSlug: "mug", onChecking: () => {}, onResult });
    await vi.advanceTimersByTimeAsync(400);
    await flush();
    expect(onResult).toHaveBeenCalledWith({ slug: "mug", usesFallback: false });
  });

  it("sends the edited product's id so its own slug does not count as taken", async () => {
    const fake = fakeCheckSlug([], { autoResolve: true });
    scheduleSlugSuggestion({
      http: fake.http,
      baseSlug: "mug",
      excludePublicId: "prd_1",
      onChecking: () => {},
      onResult: () => {},
    });
    await vi.advanceTimersByTimeAsync(400);
    const [url, config] = fake.get.mock.calls[0] as unknown as [
      string,
      { params?: Record<string, string> } | undefined,
    ];
    const query = new URL(url, "https://x/").searchParams;
    expect(config?.params?.exclude_public_id ?? query.get("exclude_public_id")).toBe("prd_1");
  });

  it("a check that is replaced before it answers never reports its result", async () => {
    const fake = fakeCheckSlug(["shirt", "shirt-2"]);
    const onResult = vi.fn();
    const cancelFirst = scheduleSlugSuggestion({
      http: fake.http,
      baseSlug: "shirt",
      onChecking: () => {},
      onResult,
    });
    await vi.advanceTimersByTimeAsync(400);
    expect(fake.pending).toHaveLength(1);
    // The merchant keeps typing: the effect cleans up and schedules the new name.
    cancelFirst();
    scheduleSlugSuggestion({ http: fake.http, baseSlug: "shirts", onChecking: () => {}, onResult });
    await vi.advanceTimersByTimeAsync(400);
    // The new check answers first, then the old one.
    for (const entry of [...fake.pending].reverse()) entry.resolve();
    for (let i = 0; i < 10; i++) {
      await flush();
      for (const entry of fake.pending.splice(0)) entry.resolve();
    }
    expect(onResult.mock.calls.map(([r]) => r.slug)).toEqual(["shirts"]);
  });

  it("a check replaced while it is running turns the checking state off", async () => {
    const fake = fakeCheckSlug([]);
    const onChecking = vi.fn();
    const cancel = scheduleSlugSuggestion({
      http: fake.http,
      baseSlug: "cup",
      onChecking,
      onResult: () => {},
    });
    await vi.advanceTimersByTimeAsync(400);
    cancel();
    await flush();
    expect(onChecking.mock.calls.map(([v]) => v)).toEqual([true, false]);
  });

  it("a check cancelled before its timer fires never reports checking", async () => {
    const fake = fakeCheckSlug([]);
    const onChecking = vi.fn();
    const cancel = scheduleSlugSuggestion({
      http: fake.http,
      baseSlug: "cup",
      onChecking,
      onResult: () => {},
    });
    cancel();
    await vi.advanceTimersByTimeAsync(400);
    await flush();
    expect(onChecking).not.toHaveBeenCalled();
    expect(fake.get).not.toHaveBeenCalled();
  });

  it("falls back to the typed slug when the check fails", async () => {
    const fake = fakeCheckSlug([]);
    const onResult = vi.fn();
    const onChecking = vi.fn();
    scheduleSlugSuggestion({ http: fake.http, baseSlug: "cup", onChecking, onResult });
    await vi.advanceTimersByTimeAsync(400);
    fake.pending[0].reject(new Error("boom"));
    await flush();
    expect(onResult).toHaveBeenCalledWith({ slug: "cup", usesFallback: false });
    expect(onChecking.mock.calls.map(([v]) => v)).toEqual([true, false]);
  });
});
