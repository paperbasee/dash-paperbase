"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Blog } from "@/types";
import { blogDetailQueryKey } from "@/lib/query-keys";

export async function fetchBlogDetail(publicId: string): Promise<Blog> {
  const { data } = await api.get<Blog>(`admin/blogs/${publicId}/`);
  return data;
}

export function useBlogDetailQuery(publicId: string) {
  return useQuery({
    queryKey: blogDetailQueryKey(publicId),
    queryFn: () => fetchBlogDetail(publicId),
    enabled: !!publicId,
  });
}
