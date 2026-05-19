"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Blog, PaginatedResponse } from "@/types";
import { blogsListQueryKey, type BlogsListParams } from "@/lib/query-keys";

export async function fetchBlogsList(params: BlogsListParams): Promise<Blog[]> {
  const searchParams = new URLSearchParams();
  if (params.q?.trim()) searchParams.set("q", params.q.trim());
  if (params.tag?.trim()) searchParams.set("tag", params.tag.trim());
  if (params.published_date?.trim()) {
    searchParams.set("published_date", params.published_date.trim());
  }
  const query = searchParams.toString();
  const { data } = await api.get<PaginatedResponse<Blog> | Blog[]>(
    `admin/blogs/${query ? `?${query}` : ""}`,
  );
  return Array.isArray(data) ? data : data.results;
}

export function useBlogsQuery(params: BlogsListParams) {
  return useQuery({
    queryKey: blogsListQueryKey(params),
    queryFn: () => fetchBlogsList(params),
  });
}
