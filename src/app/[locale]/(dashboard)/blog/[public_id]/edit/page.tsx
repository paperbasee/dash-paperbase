"use client";

import { use, useEffect, useState } from "react";
import api from "@/lib/api";
import { notify } from "@/notifications";
import type { Blog } from "@/types";
import { BlogForm } from "../../_components/BlogForm";
import { DashboardDetailSkeleton } from "@/components/skeletons/dashboard-skeletons";

export default function EditBlogPage({
  params,
}: {
  params: Promise<{ public_id: string }>;
}) {
  const { public_id } = use(params);
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const { data } = await api.get<Blog>(`admin/blogs/${public_id}/`);
        if (!cancelled) setBlog(data);
      } catch (err) {
        if (!cancelled) {
          setError("Unable to load blog post.");
          notify.error(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [public_id]);

  if (loading) {
    return <DashboardDetailSkeleton />;
  }
  if (error || !blog) {
    return (
      <div className="rounded-card border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {error ?? "Blog post not found."}
      </div>
    );
  }
  return <BlogForm mode="edit" initialBlog={blog} />;
}
