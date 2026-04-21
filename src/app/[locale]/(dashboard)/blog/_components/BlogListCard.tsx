"use client";

import { Link } from "@/i18n/navigation";
import type { Blog } from "@/types";
import { formatDashboardDateOptional } from "@/lib/datetime-display";
import { cn } from "@/lib/utils";

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
};

export function BlogListCard({ blog, locale }: BlogListCardProps) {
  const readMins = estimateReadingMinutesFromHtml(blog.content);
  const dateStr = formatDashboardDateOptional(blogDisplayDateIso(blog), locale);
  const tagText = (blog.tags || [])
    .map((t) => (t.name || "").trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(" • ");
  const pillText = (tagText || "Untagged").toUpperCase();
  const byline = blog.author_name?.trim() || "—";

  return (
    <Link
      href={`/blog/${blog.public_id}/edit`}
      className="block h-full min-w-0 w-full"
    >
      <article
        className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-md"
      >
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
      </article>
    </Link>
  );
}
