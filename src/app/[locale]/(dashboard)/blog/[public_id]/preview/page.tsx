"use client";

import { use, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Pencil, Undo2 } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { notify } from "@/notifications";
import { formatDashboardDateTime } from "@/lib/datetime-display";
import type { Blog } from "@/types";
import { DashboardDetailSkeleton } from "@/components/skeletons/dashboard-skeletons";

export default function PreviewBlogPage({
  params,
}: {
  params: Promise<{ public_id: string }>;
}) {
  const { public_id } = use(params);
  const locale = useLocale();
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon" className="size-8">
            <Link href="/blog">
              <Undo2 className="size-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Preview
          </h1>
        </div>
        <Button asChild className="gap-2">
          <Link href={`/blog/${blog.public_id}/edit`}>
            <Pencil className="size-4" />
            Edit
          </Link>
        </Button>
      </div>

      <Card className="shadow-sm">
        {blog.featured_image_url && (
          <img
            src={blog.featured_image_url}
            alt={blog.title}
            className="h-64 w-full rounded-t-card object-cover"
          />
        )}
        <CardContent className="space-y-4 p-6">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              {blog.title || "Untitled post"}
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              {blog.author_name && <span>{blog.author_name} · </span>}
              {blog.published_at
                ? formatDashboardDateTime(blog.published_at, locale)
                : "Not yet published"}
            </p>
            {blog.tags && blog.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {blog.tags.map((t) => (
                  <span
                    key={t.public_id}
                    className="rounded-ui border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    #{t.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {blog.excerpt && (
            <p className="text-base italic text-muted-foreground">
              {blog.excerpt}
            </p>
          )}

          <div className="prose prose-sm max-w-none whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground dark:prose-invert">
            {blog.content || (
              <p className="text-muted-foreground">No content.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
