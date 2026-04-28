"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import api from "@/lib/api";
import { notify } from "@/notifications";
import type { Blog } from "@/types";
import { BlogForm } from "../../_components/BlogForm";
import { DashboardDetailSkeleton } from "@/components/skeletons/dashboard-skeletons";
import { useConfirm } from "@/context/ConfirmDialogContext";

export default function EditBlogPage({
  params,
}: {
  params: Promise<{ public_id: string }>;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { public_id } = use(params);
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
  const currentBlog = blog;

  async function handleDelete() {
    const ok = await confirm({
      title: "Delete blog post?",
      message: `Delete "${currentBlog.title || "Untitled post"}"? This action cannot be undone.`,
      variant: "danger",
    });
    if (!ok) return;
    try {
      setDeleting(true);
      await api.delete(`admin/blogs/${currentBlog.public_id}/`);
      notify.warning("Post deleted");
      router.push("/blog");
    } catch (err) {
      notify.error(err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <BlogForm
      mode="edit"
      initialBlog={currentBlog}
      onDelete={() => void handleDelete()}
      deleteLoading={deleting}
    />
  );
}
