import { infiniteQueryOptions, queryOptions, type QueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { orderEditorVariantsQueryKeyRoot } from "@/lib/orders/order-editor-variants";
import {
  inventoryStatusQueryKey,
  productsListQueryKeyRoot,
  variantsAttributesQueryKey,
  variantsListQueryKey,
  variantsListQueryKeyRoot,
  variantsProductQueryKey,
  variantsProductSearchQueryKey,
  variantsSearchQueryKey,
  variantsSearchQueryKeyRoot,
} from "@/lib/query-keys";
import type {
  PaginatedResponse,
  Product,
  ProductAttributeAdmin,
  ProductVariant,
} from "@/types";

export type VariantsHttp = Pick<typeof api, "get">;

/** An admin variant row; the API also sends the product's name. */
export type AdminProductVariant = ProductVariant & { product_name?: string };

/** Products shown by the picker per search (newest first when nothing is typed). */
export const VARIANT_PRODUCT_PICKER_PAGE_SIZE = 24;

/** Store-wide variant search rows per "Load more". */
export const VARIANT_SEARCH_PAGE_SIZE = 50;

/** Largest page the variants endpoint serves. */
const VARIANTS_MAX_PAGE_SIZE = 100;

/**
 * Product picker options: ONE page of admin/products/, filtered on the server by what the merchant
 * typed. Never the whole catalogue.
 */
export function variantProductSearchQueryOptions(search: string, http: VariantsHttp = api) {
  const term = search.trim();
  return queryOptions({
    queryKey: variantsProductSearchQueryKey(term),
    queryFn: async () => {
      const params: Record<string, string> = {
        page_size: String(VARIANT_PRODUCT_PICKER_PAGE_SIZE),
      };
      if (term) params.search = term;
      const { data } = await http.get<PaginatedResponse<Product>>("admin/products/", { params });
      return data.results ?? [];
    },
  });
}

/** The selected product (also a deep-linked one that is not in the picker's first page). */
export function variantProductDetailQueryOptions(productId: string, http: VariantsHttp = api) {
  return queryOptions({
    queryKey: variantsProductQueryKey(productId),
    queryFn: async () => {
      const { data } = await http.get<Product>(`admin/products/${productId}/`);
      return data;
    },
    enabled: !!productId,
  });
}

/** All pages of admin/product-attributes/ (a store has few; 100 per page). */
export async function fetchAllAttributes(http: VariantsHttp = api): Promise<ProductAttributeAdmin[]> {
  const out: ProductAttributeAdmin[] = [];
  for (let page = 1; ; page += 1) {
    const { data } = await http.get<PaginatedResponse<ProductAttributeAdmin>>(
      "admin/product-attributes/",
      { params: { page: String(page), page_size: String(VARIANTS_MAX_PAGE_SIZE) } },
    );
    out.push(...(data.results ?? []));
    if (!data.next) return out;
  }
}

/**
 * Attributes only change on the Attributes page, so window focus and reconnects do not reload them
 * for 10 minutes, and variant edits never do. Opening the Variants page always reloads them, so
 * values added on the Attributes page show up at once.
 */
export function variantAttributesQueryOptions(http: VariantsHttp = api) {
  return queryOptions({
    queryKey: variantsAttributesQueryKey,
    queryFn: () => fetchAllAttributes(http),
    staleTime: 10 * 60 * 1000,
    refetchOnMount: "always",
  });
}

/**
 * Every variant of one product, active or not: the editor needs them all to filter locally and
 * to work out which attribute types the product uses. Bounded by that product's variant count.
 */
export async function fetchProductVariants(
  productId: string,
  http: VariantsHttp = api,
): Promise<AdminProductVariant[]> {
  const out: AdminProductVariant[] = [];
  for (let page = 1; ; page += 1) {
    const { data } = await http.get<PaginatedResponse<AdminProductVariant>>(
      "admin/product-variants/",
      {
        params: {
          product_public_id: productId,
          include_inactive: "true",
          page: String(page),
          page_size: String(VARIANTS_MAX_PAGE_SIZE),
        },
      },
    );
    out.push(...(data.results ?? []));
    if (!data.next) return out;
  }
}

export function variantsProductVariantsQueryKey(productId: string) {
  return variantsListQueryKey(productId);
}

export function productVariantsQueryOptions(productId: string, http: VariantsHttp = api) {
  return queryOptions({
    queryKey: variantsProductVariantsQueryKey(productId),
    queryFn: () => fetchProductVariants(productId, http),
    enabled: !!productId,
  });
}

/** "active" / "inactive" status filter as the API's is_active value. */
function isActiveParam(status: string): string | null {
  if (status === "active") return "true";
  if (status === "inactive") return "false";
  return null;
}

/**
 * Store-wide variant search by SKU or option value: one page per request, the next page only when
 * the merchant asks for more. The status filter runs on the server so the total is right.
 */
export function variantSearchInfiniteQueryOptions(
  search: string,
  status: string,
  http: VariantsHttp = api,
) {
  const term = search.trim();
  const isActive = isActiveParam(status);
  return infiniteQueryOptions({
    queryKey: variantsSearchQueryKey(term, isActive ?? ""),
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string> = {
        search: term,
        include_inactive: "true",
        page: String(pageParam),
        page_size: String(VARIANT_SEARCH_PAGE_SIZE),
      };
      if (isActive) params.is_active = isActive;
      const { data } = await http.get<PaginatedResponse<AdminProductVariant>>(
        "admin/product-variants/",
        { params },
      );
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.next ? lastPageParam + 1 : undefined,
    enabled: !!term,
  });
}

/**
 * What a variant create, update, delete or status change can make stale: the variant lists, the
 * selected product (variant count), the order editors' variants, the products grid (variant counts
 * and stock) and inventory counts. Not the product picker and not the attributes.
 */
export function variantMutationInvalidationKeys(productId: string): readonly (readonly unknown[])[] {
  const keys: (readonly unknown[])[] = [
    variantsListQueryKeyRoot,
    variantsSearchQueryKeyRoot,
    orderEditorVariantsQueryKeyRoot,
    productsListQueryKeyRoot,
    inventoryStatusQueryKey,
  ];
  if (productId) keys.push(variantsProductQueryKey(productId));
  return keys;
}

type VariantSearchData = { pages: PaginatedResponse<AdminProductVariant>[]; pageParams: unknown[] };

/** Apply a change to one variant row wherever the Variants page shows it. */
export function patchVariantInCaches(
  queryClient: QueryClient,
  variantPublicId: string,
  patch: Partial<ProductVariant>,
): void {
  const apply = (row: AdminProductVariant) =>
    row.public_id === variantPublicId ? { ...row, ...patch } : row;
  queryClient.setQueriesData<AdminProductVariant[]>({ queryKey: variantsListQueryKeyRoot }, (old) =>
    old ? old.map(apply) : old,
  );
  queryClient.setQueriesData<VariantSearchData>({ queryKey: variantsSearchQueryKeyRoot }, (old) =>
    old
      ? { ...old, pages: old.pages.map((page) => ({ ...page, results: page.results.map(apply) })) }
      : old,
  );
}
