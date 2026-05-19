"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { BlogTag, PaginatedResponse } from "@/types";
import { blogTagsQueryKey } from "@/lib/query-keys";

export async function fetchBlogTags(): Promise<BlogTag[]> {
  const { data } = await api.get<PaginatedResponse<BlogTag> | BlogTag[]>(
    "admin/blog-tags/",
  );
  return Array.isArray(data) ? data : data.results;
}

export function useBlogTagsQuery() {
  return useQuery({
    queryKey: blogTagsQueryKey,
    queryFn: fetchBlogTags,
  });
}
