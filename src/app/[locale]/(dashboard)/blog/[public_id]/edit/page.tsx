"use client";

import { use, useEffect, useState } from "react";
import { useDeferredNavigate } from "@/hooks/useDeferredNavigate";
import { useTranslations } from "next-intl";
import api from "@/lib/api";
import { notify } from "@/notifications";
import type { Blog } from "@/types";
import { BlogForm } from "../../_components/BlogForm";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { usePageLoadingBar } from "@/hooks/usePageLoadingBar";

export default function EditBlogPage({
  params,
}: {
  params: Promise<{ public_id: string }>;
}) {
  const navigate = useDeferredNavigate();
  const confirm = useConfirm();
  const tPages = useTranslations("pages");
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
          setError(tPages("toastDescPostCouldntLoad"));
          notify.error(err, {
            title: tPages("toastTitlePostCouldntLoad"),
            fallbackMessage: tPages("toastDescPostCouldntLoad"),
          });
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

  usePageLoadingBar(loading);

  if (loading) {
    return null;
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
      notify.success(tPages("toastDescPostDeleted"), {
        title: tPages("toastTitlePostDeleted"),
      });
      void navigate("/blog");
    } catch (err) {
      notify.error(err, {
        title: tPages("toastTitlePostNotDeleted"),
        fallbackMessage: tPages("toastDescPostNotDeleted"),
      });
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
