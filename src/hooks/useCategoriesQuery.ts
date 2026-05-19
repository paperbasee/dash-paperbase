"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { AdminCategoryTreeNode } from "@/types";
import { categoriesQueryKey } from "@/lib/query-keys";

export async function fetchCategoriesTree(): Promise<AdminCategoryTreeNode[]> {
  const { data } = await api.get<AdminCategoryTreeNode[]>("admin/categories/?tree=1");
  return Array.isArray(data) ? data : [];
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: categoriesQueryKey,
    queryFn: fetchCategoriesTree,
  });
}
