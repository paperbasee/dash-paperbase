"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { FunnelIcon, Undo2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FilterBar } from "@/components/filters/FilterBar";
import { FilterDropdown } from "@/components/filters/FilterDropdown";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useFilters } from "@/hooks/useFilters";
import { digitsInNumberFont } from "@/lib/number-font";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { notify } from "@/notifications";
import type { Blog, BlogTag, PaginatedResponse } from "@/types";
import { BlogListCard } from "./_components/BlogListCard";
import { DashboardCardGridSkeleton } from "@/components/skeletons/dashboard-skeletons";

export default function BlogListPage() {
  const router = useRouter();
  const locale = useLocale();
  const tNav = useTranslations("nav");
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const { filters, setFilter, clearFilters } = useFilters([
    "published_date",
    "tag",
    "search",
  ]);
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const debouncedSearch = useDebouncedValue(searchInput);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setSearchInput(filters.search || "");
  }, [filters.search]);

  useEffect(() => {
    const next = debouncedSearch.trim();
    if (next === (filters.search || "")) return;
    setFilter("search", next);
  }, [debouncedSearch, filters.search, setFilter]);

  useEffect(() => {
    let cancelled = false;
    async function loadTags() {
      try {
        const { data } = await api.get<PaginatedResponse<BlogTag> | BlogTag[]>(
          "admin/blog-tags/",
        );
        if (!cancelled) {
          setTags(Array.isArray(data) ? data : data.results);
        }
      } catch (err) {
        if (!cancelled) {
          notify.error(err, {
            title: tPages("toastTitleTagsUnavailable"),
            fallbackMessage: tPages("toastDescTagsUnavailable"),
          });
        }
      }
    }
    void loadTags();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchBlogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search?.trim()) params.set("q", filters.search.trim());
      if (filters.tag?.trim()) params.set("tag", filters.tag.trim());
      if (filters.published_date?.trim()) {
        params.set("published_date", filters.published_date.trim());
      }
      const { data } = await api.get<PaginatedResponse<Blog> | Blog[]>(
        `admin/blogs/${params.toString() ? `?${params}` : ""}`,
      );
      setBlogs(Array.isArray(data) ? data : data.results);
    } catch (err) {
      notify.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters.published_date, filters.search, filters.tag]);

  useEffect(() => {
    void fetchBlogs();
  }, [fetchBlogs]);

  const handleDeleteBlog = useCallback((publicId: string) => {
    setBlogs((prev) => prev.filter((blog) => blog.public_id !== publicId));
  }, []);

  const tagOptions = tags.map((t) => ({
    value: t.public_id,
    label: t.name,
  }));

  const publishedDatePillOptions: { value: string; label: ReactNode }[] = [
    { value: "", label: tCommon("all") },
    { value: "today", label: tPages("filtersToday") },
    {
      value: "last_7_days",
      label: digitsInNumberFont(tPages("filtersLast7Days"), locale),
    },
    {
      value: "last_30_days",
      label: digitsInNumberFont(tPages("filtersLast30Days"), locale),
    },
  ];

  const filtersActive = Boolean(
    filters.search?.trim() || filters.tag?.trim() || filters.published_date?.trim(),
  );

  useEffect(() => {
    if (!filtersActive) setFiltersOpen(false);
  }, [filters.published_date, filters.search, filters.tag]);

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="rounded-card bg-muted/80 px-1 py-1 hidden md:block">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label={tPages("goBack")}
              className="flex items-center justify-center rounded-ui p-1 text-muted-foreground hover:bg-muted"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          </div>
          <h1 className="text-2xl font-medium leading-relaxed text-foreground">{tNav("blog")}</h1>
        </div>
        <Link
          href="/blog/new"
          className="shrink-0 rounded-card bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          {tNav("blogNew")}
        </Link>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 flex-wrap min-w-0">
          {publishedDatePillOptions.map((opt) => {
            const active = (filters.published_date || "") === opt.value;
            return (
              <button
                key={opt.value || "__all__"}
                type="button"
                onClick={() => setFilter("published_date", opt.value)}
                aria-pressed={active}
                className={[
                  "h-9 rounded-ui border px-3 text-sm font-medium transition whitespace-nowrap",
                  active
                    ? "border-primary/40 bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-muted",
                ].join(" ")}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0 self-start px-3"
          aria-label="Toggle filters"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <FunnelIcon className="size-4" aria-hidden />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {loading
          ? tCommon("loading")
          : tPages("blogListCount", { count: blogs.length })}
      </p>

      {filtersOpen ? (
        <FilterBar>
          <FilterDropdown
            value={filters.tag}
            onChange={(value) => setFilter("tag", value)}
            placeholder={tPages("filtersTag")}
            options={tagOptions}
            className="min-w-[10rem] md:min-w-[12rem]"
            disabled={tags.length === 0}
          />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={tPages("filtersSearchBlog")}
            className="h-9 min-w-0 flex-1 md:max-w-md"
          />
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              clearFilters();
            }}
            className="h-9 shrink-0 rounded-ui border border-border px-3 text-sm hover:bg-muted"
          >
            {tPages("filtersClear")}
          </button>
        </FilterBar>
      ) : null}

      {loading ? (
        <DashboardCardGridSkeleton cards={6} />
      ) : blogs.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {filtersActive ? tPages("blogListNoMatches") : tPages("blogListEmpty")}
          </p>
          {filtersActive ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchInput("");
                clearFilters();
              }}
            >
              {tPages("filtersClear")}
            </Button>
          ) : null}
        </Card>
      ) : (
        <div className="rounded-card border border-card-border bg-card p-3">
          <div className="grid min-w-0 grid-cols-1 justify-items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {blogs.map((blog) => (
              <BlogListCard
                key={blog.public_id}
                blog={blog}
                locale={locale}
                onDelete={handleDeleteBlog}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
