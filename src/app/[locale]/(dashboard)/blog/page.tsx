"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Undo2 } from "lucide-react";
import { toLocaleDigits } from "@/lib/locale-digits";
import { numberTextClass } from "@/lib/number-font";
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

export default function BlogListPage() {
  const router = useRouter();
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const tNav = useTranslations("nav");
  const tPages = useTranslations("pages");
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
        if (!cancelled) console.error(err);
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

  const tagOptions = tags.map((t) => ({
    value: t.public_id,
    label: t.name,
  }));

  const hasActiveFilters = Boolean(
    filters.search?.trim() || filters.tag?.trim() || filters.published_date?.trim(),
  );

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
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
          <div className="min-w-0">
            <h1 className="text-2xl font-medium leading-relaxed text-foreground">
              {tNav("blog")} (
              <span className={numClass}>
                {toLocaleDigits(String(blogs.length), locale)}
              </span>
              )
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground md:hidden">
              {tPages("blogSubtitle")}
            </p>
          </div>
        </div>
        <Button asChild className="w-full shrink-0 sm:w-auto">
          <Link href="/blog/new">{tNav("blogNew")}</Link>
        </Button>
      </div>

      <p className="hidden text-sm leading-relaxed text-muted-foreground md:block">
        {tPages("blogSubtitle")}
      </p>

      <FilterBar>
        <FilterDropdown
          value={filters.published_date}
          onChange={(value) => setFilter("published_date", value)}
          placeholder={tPages("filtersPublishedDate")}
          options={[
            { value: "today", label: tPages("filtersToday") },
            {
              value: "last_7_days",
              label: tPages("filtersLast7Days"),
              labelDisplay: digitsInNumberFont(
                tPages("filtersLast7Days"),
                locale,
              ),
            },
            {
              value: "last_30_days",
              label: tPages("filtersLast30Days"),
              labelDisplay: digitsInNumberFont(
                tPages("filtersLast30Days"),
                locale,
              ),
            },
          ]}
          className="min-w-[10.5rem]"
        />
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

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : blogs.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters
              ? tPages("blogListNoMatches")
              : tPages("blogListEmpty")}
          </p>
          {hasActiveFilters ? (
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
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/blog/new">Write your first post</Link>
            </Button>
          )}
        </Card>
      ) : (
        <div className="rounded-card border border-dashed border-card-border bg-card p-3">
          <div className="grid min-w-0 grid-cols-1 justify-items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {blogs.map((blog) => (
              <BlogListCard key={blog.public_id} blog={blog} locale={locale} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
