import { describe, expect, it, vi } from "vitest";
import {
  InfiniteQueryObserver,
  QueriesObserver,
  QueryClient,
  QueryObserver,
} from "@tanstack/react-query";
import * as variantsQueries from "@/lib/variants/variants-queries";
import type { VariantsHttp } from "@/lib/variants/variants-queries";
import {
  inventoryStatusQueryKey,
  productsListQueryKeyRoot,
  variantsAttributesQueryKey,
  variantsQueryKeyRoot,
} from "@/lib/query-keys";
import { orderEditorVariantsQueryKey } from "@/lib/orders/order-editor-variants";
import type { Product, ProductVariant } from "@/types";

const {
  fetchProductVariants,
  variantMutationInvalidationKeys,
  variantProductSearchQueryOptions,
} = variantsQueries;

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

const flush = () => new Promise((r) => setTimeout(r, 0));

/** Admin products list in 100-row cursor pages, the most it serves per page. */
function fakeProductsHttp(total: number) {
  const get = vi.fn(async (_url: string, config?: { params?: Record<string, string> }) => {
    const size = Math.min(Number(config?.params?.page_size ?? 24), 100);
    const offset = Number(config?.params?.cursor?.slice(1) ?? 0);
    const results = Array.from({ length: Math.max(0, Math.min(size, total - offset)) }, (_, i) => ({
      public_id: `p${offset + i}`,
      name: `Product ${offset + i}`,
    })) as Product[];
    const next = offset + size < total ? `https://x/api/v1/admin/products/?cursor=c${offset + size}` : null;
    return { data: { results, next, previous: null } };
  });
  return { http: { get } as unknown as VariantsHttp, get };
}

/** Admin product-variants list: page-number pagination, page_size honoured up to 100. */
function fakeVariantsHttp(total: number) {
  const get = vi.fn(async (_url: string, config?: { params?: Record<string, string> }) => {
    const size = Math.min(Number(config?.params?.page_size ?? 24), 100);
    const page = Number(config?.params?.page ?? 1);
    const offset = (page - 1) * size;
    const results = Array.from({ length: Math.max(0, Math.min(size, total - offset)) }, (_, i) => ({
      public_id: `v${offset + i}`,
      product_public_id: "p1",
      sku: `SKU-${offset + i}`,
      is_active: true,
    })) as ProductVariant[];
    const next =
      offset + size < total
        ? `https://x/api/v1/admin/product-variants/?page=${page + 1}&page_size=${size}`
        : null;
    return { data: { count: total, results, next, previous: page > 1 ? "https://x/" : null } };
  });
  return { http: { get } as unknown as VariantsHttp, get };
}

describe("variants page product picker", () => {
  it.each([250, 4000])(
    "loads one page of products, not the catalogue (%i products in the store)",
    async (total) => {
      const fake = fakeProductsHttp(total);
      const rows = await newClient().fetchQuery(variantProductSearchQueryOptions("", fake.http));
      expect(fake.get).toHaveBeenCalledTimes(1);
      const [url, config] = fake.get.mock.calls[0] as unknown as [
        string,
        { params: Record<string, string> },
      ];
      expect(url).toBe("admin/products/");
      expect(config.params.page_size).toBe("24");
      expect(config.params).not.toHaveProperty("search");
      expect(rows).toHaveLength(24);
    },
  );

  it("sends what the merchant typed as a server search", async () => {
    const fake = fakeProductsHttp(10);
    await newClient().fetchQuery(variantProductSearchQueryOptions("  shirt ", fake.http));
    const [, config] = fake.get.mock.calls[0] as unknown as [string, { params: Record<string, string> }];
    expect(config.params.search).toBe("shirt");
  });

  it("loads a deep-linked product by id in one request", async () => {
    const get = vi.fn(async () => ({ data: { public_id: "p9", name: "Nine", price: "10.00" } }));
    const product = await newClient().fetchQuery(
      variantsQueries.variantProductDetailQueryOptions("p9", { get } as unknown as VariantsHttp),
    );
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith("admin/products/p9/");
    expect(product.name).toBe("Nine");
  });
});

describe("variants of one product", () => {
  it("returns every variant of the product, past the first page", async () => {
    const fake = fakeVariantsHttp(130);
    const rows = await fetchProductVariants("p1", fake.http);
    expect(rows).toHaveLength(130);
    expect(fake.get).toHaveBeenCalledTimes(2);
    const [, config] = fake.get.mock.calls[0] as unknown as [string, { params: Record<string, string> }];
    expect(config.params).toMatchObject({
      product_public_id: "p1",
      include_inactive: "true",
      page_size: "100",
    });
  });
});

describe("store-wide variant search", () => {
  it.each([30, 3000])("loads one page per request (%i matches)", async (total) => {
    const fake = fakeVariantsHttp(total);
    const client = newClient();
    const data = await client.fetchInfiniteQuery(
      variantsQueries.variantSearchInfiniteQueryOptions("ab", "", fake.http),
    );
    expect(fake.get).toHaveBeenCalledTimes(1);
    expect(data.pages[0].count).toBe(total);
    const [, config] = fake.get.mock.calls[0] as unknown as [string, { params: Record<string, string> }];
    expect(config.params).toMatchObject({ search: "ab", include_inactive: "true", page: "1" });
    expect(config.params).not.toHaveProperty("product_public_id");
    expect(config.params).not.toHaveProperty("is_active");
  });

  it("Load more fetches exactly the next page", async () => {
    const fake = fakeVariantsHttp(120);
    const client = newClient();
    const observer = new InfiniteQueryObserver(
      client,
      variantsQueries.variantSearchInfiniteQueryOptions("ab", "", fake.http),
    );
    const unsubscribe = observer.subscribe(() => {});
    await vi.waitFor(() => expect(observer.getCurrentResult().isSuccess).toBe(true));
    expect(observer.getCurrentResult().hasNextPage).toBe(true);
    await observer.fetchNextPage();
    expect(fake.get).toHaveBeenCalledTimes(2);
    const [, config] = fake.get.mock.calls[1] as unknown as [string, { params: Record<string, string> }];
    expect(config.params.page).toBe("2");
    expect(observer.getCurrentResult().data?.pages.flatMap((p) => p.results)).toHaveLength(100);
    unsubscribe();
  });

  it("filters by status on the server", async () => {
    const fake = fakeVariantsHttp(5);
    await newClient().fetchInfiniteQuery(
      variantsQueries.variantSearchInfiniteQueryOptions("ab", "inactive", fake.http),
    );
    const [, config] = fake.get.mock.calls[0] as unknown as [string, { params: Record<string, string> }];
    expect(config.params.is_active).toBe("false");
  });
});

describe("after a variant save, delete or status change", () => {
  it("does not reload the product picker or the attributes", async () => {
    const client = newClient();
    const searchFn = vi.fn(async () => [] as Product[]);
    const attributesFn = vi.fn(async () => []);
    const listFn = vi.fn(async () => [] as ProductVariant[]);
    const observers = new QueriesObserver(client, [
      { queryKey: variantProductSearchQueryOptions("").queryKey, queryFn: searchFn },
      { queryKey: variantsAttributesQueryKey, queryFn: attributesFn },
      { queryKey: [...variantsQueryKeyRoot, "list", "p1"], queryFn: listFn },
    ]);
    const unsubscribe = observers.subscribe(() => {});
    await flush();
    expect(searchFn).toHaveBeenCalledTimes(1);
    expect(attributesFn).toHaveBeenCalledTimes(1);
    expect(listFn).toHaveBeenCalledTimes(1);

    await Promise.all(
      variantMutationInvalidationKeys("p1").map((queryKey) => client.invalidateQueries({ queryKey })),
    );
    await flush();
    expect(searchFn).toHaveBeenCalledTimes(1);
    expect(attributesFn).toHaveBeenCalledTimes(1);
    // The variants themselves do reload.
    expect(listFn).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it("still refreshes what a variant change affects", () => {
    const keys = variantMutationInvalidationKeys("p1").map((k) => JSON.stringify(k));
    const covers = (key: readonly unknown[]) =>
      keys.some((prefix) => JSON.stringify(key).startsWith(prefix.slice(0, -1)));
    expect(covers(variantsQueries.variantsProductVariantsQueryKey("p1"))).toBe(true);
    expect(covers(variantsQueries.variantSearchInfiniteQueryOptions("ab", "").queryKey)).toBe(true);
    expect(covers(variantsQueries.variantProductDetailQueryOptions("p1").queryKey)).toBe(true);
    expect(covers(orderEditorVariantsQueryKey("p1"))).toBe(true);
    expect(covers([...productsListQueryKeyRoot, {}])).toBe(true);
    expect(covers(inventoryStatusQueryKey)).toBe(true);
    expect(covers(variantsAttributesQueryKey)).toBe(false);
    expect(covers(variantProductSearchQueryOptions("x").queryKey)).toBe(false);
  });

  it("patches a toggled variant in the product list and in search results", async () => {
    const client = newClient();
    const row = { public_id: "v1", is_active: true } as ProductVariant;
    const other = { public_id: "v2", is_active: true } as ProductVariant;
    const listKey = variantsQueries.variantsProductVariantsQueryKey("p1");
    const searchKey = variantsQueries.variantSearchInfiniteQueryOptions("ab", "").queryKey;
    client.setQueryData(listKey, [row, other]);
    client.setQueryData(searchKey, {
      pages: [{ count: 2, next: null, previous: null, results: [row, other] }],
      pageParams: [1],
    });
    variantsQueries.patchVariantInCaches(client, "v1", { is_active: false });
    expect(client.getQueryData<ProductVariant[]>(listKey)?.map((v) => v.is_active)).toEqual([
      false,
      true,
    ]);
    expect(
      client.getQueryData(searchKey)?.pages[0].results.map((v: ProductVariant) => v.is_active),
    ).toEqual([false, true]);
  });
});

describe("attributes on the variants page", () => {
  it("stay fresh for 10 minutes but reload whenever the page opens", () => {
    const options = variantsQueries.variantAttributesQueryOptions();
    expect(options.staleTime).toBe(10 * 60 * 1000);
    expect(options.refetchOnMount).toBe("always");
  });

  it("observer mount always reloads, window focus inside 10 minutes does not", async () => {
    const client = newClient();
    const get = vi.fn(async () => ({ data: { count: 1, next: null, previous: null, results: [] } }));
    const options = variantsQueries.variantAttributesQueryOptions({ get } as unknown as VariantsHttp);
    const first = new QueryObserver(client, options);
    const un1 = first.subscribe(() => {});
    await flush();
    expect(get).toHaveBeenCalledTimes(1);
    // Focus events refetch only stale queries.
    client.getQueryCache().onFocus();
    await flush();
    expect(get).toHaveBeenCalledTimes(1);
    un1();
    const second = new QueryObserver(client, options);
    const un2 = second.subscribe(() => {});
    await flush();
    expect(get).toHaveBeenCalledTimes(2);
    un2();
  });
});
