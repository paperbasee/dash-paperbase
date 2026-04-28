"use client";

import { useState } from "react";
import { Loader2, Trash } from "lucide-react";
import { Link } from "@/i18n/navigation";
import api from "@/lib/api";
import type { Blog } from "@/types";
import { formatDashboardDateOptional } from "@/lib/datetime-display";
import { cn } from "@/lib/utils";
import { notify } from "@/notifications";
import { useConfirm } from "@/context/ConfirmDialogContext";

function estimateReadingMinutesFromHtml(html: string | undefined): number {
  if (!html?.trim()) return 1;
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return 1;
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function blogDisplayDateIso(blog: Blog): string | null {
  if (blog.published_at) return blog.published_at;
  return blog.updated_at || blog.created_at || null;
}

type BlogListCardProps = {
  blog: Blog;
  locale: string;
  onDelete: (publicId: string) => void;
};

export function BlogListCard({ blog, locale, onDelete }: BlogListCardProps) {
  const confirm = useConfirm();
  const [deleting, setDeleting] = useState(false);
  const readMins = estimateReadingMinutesFromHtml(blog.content);
  const dateStr = formatDashboardDateOptional(blogDisplayDateIso(blog), locale);
  const tagText = (blog.tags || [])
    .map((t) => (t.name || "").trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(" • ");
  const pillText = (tagText || "Untagged").toUpperCase();
  const byline = blog.author_name?.trim() || "—";

  async function handleDelete() {
    if (deleting) return;
    const ok = await confirm({
      title: "Delete blog post?",
      message: `Delete "${blog.title || "Untitled post"}"? This action cannot be undone.`,
      variant: "danger",
    });
    if (!ok) return;
    try {
      setDeleting(true);
      await api.delete(`admin/blogs/${blog.public_id}/`);
      onDelete(blog.public_id);
    } catch (err) {
      notify.error(err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-md">
      <Link href={`/blog/${blog.public_id}/edit`} className="block min-w-0 w-full flex-1">
        <div className="relative mb-4 min-h-0 w-full">
          <div
            className={cn(
              "relative w-full overflow-hidden rounded-xl bg-muted/60",
              "aspect-[4/3]",
              "shadow-sm ring-1 ring-foreground/5 dark:ring-white/10",
            )}
          >
            {blog.featured_image_url ? (
              <img
                src={blog.featured_image_url}
                alt={blog.title || "Blog cover"}
                className="h-full w-full max-w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <span className="text-xs text-muted-foreground">No cover image</span>
              </div>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void handleDelete();
              }}
              aria-label={`Delete blog ${blog.title || blog.public_id}`}
              disabled={deleting}
              className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-ui bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <span className="w-fit rounded-md border border-border/70 bg-muted/50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-900 dark:bg-muted/30 dark:text-white">
            {pillText}
          </span>

          <h2 className="line-clamp-3 min-h-[4rem] text-base font-bold leading-snug tracking-tight text-foreground">
            {blog.title || "Untitled post"}
          </h2>

          <div className="mt-auto border-t border-border/50 pt-3 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
              <span className="min-w-0 leading-relaxed">
                By {byline}
                <span className="text-border"> | </span>
                {readMins} min read
              </span>
              {dateStr ? (
                <time
                  className="shrink-0 tabular-nums text-muted-foreground"
                  dateTime={blogDisplayDateIso(blog) ?? undefined}
                >
                  {dateStr}
                </time>
              ) : null}
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
