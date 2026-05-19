"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type {
  PaginatedResponse,
  Product,
  ProductAttributeAdmin,
  ProductVariant,
} from "@/types";
import { cursorFromLink } from "@/lib/cursor-from-link";
import {
  variantsAttributesQueryKey,
  variantsListQueryKey,
  variantsProductsQueryKey,
} from "@/lib/query-keys";

export async function fetchAllProducts(): Promise<Product[]> {
  const out: Product[] = [];
  let cursor: string | null = null;
  while (true) {
    const params: Record<string, string> = { page_size: "100" };
    if (cursor) params.cursor = cursor;
    const { data } = await api.get<PaginatedResponse<Product>>("admin/products/", {
      params,
    });
    out.push(...data.results);
    const next = data.next ? cursorFromLink(data.next) : null;
    if (!next) break;
    cursor = next;
  }
  return out;
}

export async function fetchAllAttributes(): Promise<ProductAttributeAdmin[]> {
  const out: ProductAttributeAdmin[] = [];
  let page = 1;
  while (true) {
    const { data } = await api.get<PaginatedResponse<ProductAttributeAdmin>>(
      "admin/product-attributes/",
      { params: { page, page_size: 100 } },
    );
    out.push(...data.results);
    if (!data.next) break;
    page += 1;
  }
  return out;
}

export async function fetchVariantsList(productId: string): Promise<ProductVariant[]> {
  const acc: ProductVariant[] = [];
  let page = 1;
  while (true) {
    const { data } = await api.get<PaginatedResponse<ProductVariant>>(
      "admin/product-variants/",
      {
        params: {
          product_public_id: productId,
          page,
          page_size: 100,
          include_inactive: true,
        },
      },
    );
    acc.push(...data.results);
    if (!data.next) break;
    page += 1;
  }
  return acc;
}

export function useVariantProductsQuery() {
  return useQuery({
    queryKey: variantsProductsQueryKey,
    queryFn: fetchAllProducts,
  });
}

export function useVariantAttributesQuery() {
  return useQuery({
    queryKey: variantsAttributesQueryKey,
    queryFn: fetchAllAttributes,
  });
}

export function useVariantsListQuery(productId: string) {
  return useQuery({
    queryKey: variantsListQueryKey(productId),
    queryFn: () => fetchVariantsList(productId),
    enabled: !!productId,
  });
}
