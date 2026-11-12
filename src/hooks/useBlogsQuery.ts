"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Blog, PaginatedResponse } from "@/types";
import { blogsListQueryKey, type BlogsListParams } from "@/lib/query-keys";

export async function fetchBlogsList(params: BlogsListParams): Promise<PaginatedResponse<Blog>> {
  const searchParams = new URLSearchParams();
  if (params.q?.trim()) searchParams.set("q", params.q.trim());
  if (params.tag?.trim()) searchParams.set("tag", params.tag.trim());
  if (params.published_date?.trim()) {
    searchParams.set("published_date", params.published_date.trim());
  }
  if (params.page) searchParams.set("page", params.page);
  if (params.page_size) searchParams.set("page_size", params.page_size);
  const query = searchParams.toString();
  const { data } = await api.get<PaginatedResponse<Blog>>(
    `admin/blogs/${query ? `?${query}` : ""}`,
  );
  return data;
}

export function useBlogsQuery(params: BlogsListParams) {
  return useQuery({
    queryKey: blogsListQueryKey(params),
    queryFn: () => fetchBlogsList(params),
    // The posts stay on screen while the next page arrives.
    placeholderData: keepPreviousData,
  });
}
