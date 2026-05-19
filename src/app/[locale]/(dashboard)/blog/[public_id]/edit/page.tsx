"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDeferredNavigate } from "@/hooks/useDeferredNavigate";
import { useTranslations } from "next-intl";
import api from "@/lib/api";
import { notify } from "@/notifications";
import { BlogForm } from "../../_components/BlogForm";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { useBlogDetailQuery } from "@/hooks/useBlogDetailQuery";
import {
  blogDetailQueryKey,
  blogsListQueryKeyRoot,
  navCountsQueryKey,
} from "@/lib/query-keys";

export default function EditBlogPage({
  params,
}: {
  params: Promise<{ public_id: string }>;
}) {
  const navigate = useDeferredNavigate();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const invalidateBlogCaches = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: blogsListQueryKeyRoot });
    void queryClient.invalidateQueries({ queryKey: navCountsQueryKey });
  }, [queryClient]);

  const tPages = useTranslations("pages");
  const { public_id } = use(params);
  const { data: blog, isLoading, isError, error } = useBlogDetailQuery(public_id);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isError || !error) return;
    notify.error(error, {
      title: tPages("toastTitlePostCouldntLoad"),
      fallbackMessage: tPages("toastDescPostCouldntLoad"),
    });
  }, [isError, error, tPages]);

  if (isLoading) {
    return null;
  }
  if (isError || !blog) {
    return (
      <div className="rounded-card border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {tPages("toastDescPostCouldntLoad")}
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
      invalidateBlogCaches();
      void queryClient.invalidateQueries({ queryKey: blogDetailQueryKey(public_id) });
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
