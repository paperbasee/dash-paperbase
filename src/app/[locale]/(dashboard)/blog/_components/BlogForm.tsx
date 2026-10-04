"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash, X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { isApiHttpError } from "@/lib/api-client";
import api from "@/lib/api";
import { useDeferredNavigate } from "@/hooks/useDeferredNavigate";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { notify } from "@/notifications";
import type { Blog, BlogTag } from "@/types";
import { BlogImageUpload } from "./BlogImageUpload";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { useNotificationValidation } from "@/notifications/NotificationProvider";
import { cn } from "@/lib/utils";
import { useEnterNavigation } from "@/hooks/useEnterNavigation";
import { buildPublicMediaUrlFromKey, uploadFile } from "@/hooks/usePresignedUpload";
import {
  blogDetailQueryKey,
  blogsListQueryKeyRoot,
  blogTagsQueryKey,
  navCountsQueryKey,
} from "@/lib/query-keys";
import { useBlogTagsQuery } from "@/hooks/useBlogTagsQuery";
import { PageHint } from "@/components/page/PageHint";
import { WebAddressField } from "@/components/WebAddressField";

interface BlogFormState {
  title: string;
  excerpt: string;
  content: string;
  meta_title: string;
  meta_description: string;
  tag_public_ids: string[];
  is_featured: boolean;
  is_public: boolean;
}

interface BlogFormProps {
  mode: "new" | "edit";
  initialBlog?: Blog;
  onDelete?: () => void;
  deleteLoading?: boolean;
}

const BLOG_TITLE_MAX = 255;
/** Matches `Blog.excerpt` / `Blog.meta_description` in the API (`CharField(max_length=500)`). */
const BLOG_EXCERPT_MAX = 500;
const BLOG_META_DESC_MAX = 500;

function countWords(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

const EMPTY_STATE: BlogFormState = {
  title: "",
  excerpt: "",
  content: "",
  meta_title: "",
  meta_description: "",
  tag_public_ids: [],
  is_featured: false,
  is_public: true,
};

function stateFromBlog(blog: Blog): BlogFormState {
  return {
    title: blog.title || "",
    excerpt: blog.excerpt || "",
    content: blog.content || "",
    meta_title: blog.meta_title || "",
    meta_description: blog.meta_description || "",
    tag_public_ids: (blog.tags || []).map((t) => t.public_id),
    is_featured: !!blog.is_featured,
    is_public: blog.is_public !== false,
  };
}

export function BlogForm({
  mode,
  initialBlog,
  onDelete,
  deleteLoading = false,
}: BlogFormProps) {
  const navigate = useDeferredNavigate();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const invalidateBlogCaches = useCallback(
    (blogPublicId?: string) => {
      void queryClient.invalidateQueries({ queryKey: blogsListQueryKeyRoot });
      void queryClient.invalidateQueries({ queryKey: blogTagsQueryKey });
      void queryClient.invalidateQueries({ queryKey: navCountsQueryKey });
      if (blogPublicId) {
        void queryClient.invalidateQueries({ queryKey: blogDetailQueryKey(blogPublicId) });
      }
    },
    [queryClient],
  );

  const tPages = useTranslations("pages");
  const t = useTranslations("blogForm");
  const tUpload = useTranslations("upload");
  const tAddress = useTranslations("webAddress");

  const tHints = useTranslations("pageHints");
  const { fieldErrors, clearValidation } = useNotificationValidation("blog-form");
  const tempBlogUploadIdRef = useRef<string>(
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? `blg_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`
      : `blg_${Date.now()}`
  );
  const [form, setForm] = useState<BlogFormState>(() =>
    initialBlog ? stateFromBlog(initialBlog) : EMPTY_STATE,
  );
  // The address the merchant typed; null until they type (WebAddressField).
  const [addressInput, setAddressInput] = useState<string | null>(null);
  const savedAddress = mode === "edit" ? initialBlog?.slug ?? "" : null;
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadedImageKey, setUploadedImageKey] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "uploaded" | "error">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [removeRemoteImage, setRemoveRemoteImage] = useState(false);
  const { data: tags = [], isError: tagsIsError, error: tagsError } = useBlogTagsQuery();
  const [newTagName, setNewTagName] = useState("");
  const [saving, setSaving] = useState(false);
  const { handleKeyDown } = useEnterNavigation(() => {
    const form = document.getElementById("blog-form");
    if (form instanceof HTMLFormElement) form.requestSubmit();
  });

  const remoteImageUrl = removeRemoteImage
    ? null
    : uploadedImageUrl ?? initialBlog?.featured_image_url ?? null;

  async function handleImageSelect(file: File | null) {
    if (!file) {
      setImageFile(null);
      setUploadedImageKey(null);
      setUploadedImageUrl(null);
      setUploadStatus("idle");
      setUploadProgress(0);
      setUploadError(null);
      return;
    }
    setImageFile(file);
    setUploadStatus("uploading");
    setUploadProgress(0);
    setUploadError(null);
    try {
      const { key } = await uploadFile(file, {
        entity: "blog",
        entityPublicId: initialBlog?.public_id || tempBlogUploadIdRef.current,
        onProgress: (percent) => setUploadProgress(percent),
      });
      setUploadedImageKey(key);
      setUploadedImageUrl(buildPublicMediaUrlFromKey(key));
      setUploadStatus("uploaded");
      setRemoveRemoteImage(false);
    } catch (err) {
      setUploadStatus("error");
      setUploadError(err instanceof Error ? err.message : tUpload("failed"));
    }
  }

  useEffect(() => {
    if (!tagsIsError || !tagsError) return;
    notify.error(tagsError, {
      title: tPages("toastTitleTagsUnavailable"),
      fallbackMessage: tPages("toastDescTagsUnavailable"),
    });
  }, [tagsIsError, tagsError, tPages]);

  const selectedTags = useMemo(
    () => tags.filter((tag) => form.tag_public_ids.includes(tag.public_id)),
    [tags, form.tag_public_ids],
  );

  function toggleTag(publicId: string) {
    setForm((f) =>
      f.tag_public_ids.includes(publicId)
        ? { ...f, tag_public_ids: f.tag_public_ids.filter((id) => id !== publicId) }
        : { ...f, tag_public_ids: [...f.tag_public_ids, publicId] },
    );
  }

  async function createTag() {
    const name = newTagName.trim();
    if (!name) return;
    try {
      const { data } = await api.post<BlogTag>("admin/blog-tags/", { name });
      queryClient.setQueryData<BlogTag[]>(blogTagsQueryKey, (prev) => [...(prev ?? []), data]);
      setForm((f) => ({ ...f, tag_public_ids: [...f.tag_public_ids, data.public_id] }));
      setNewTagName("");
      notify.success(tPages("toastDescTagAdded"), { title: tPages("toastTitleTagAdded") });
    } catch (err) {
      notify.error(err, {
        title: tPages("toastTitleTagsUnavailable"),
        fallbackMessage: tPages("toastDescTagsUnavailable"),
      });
    }
  }

  async function deleteTag(tag: BlogTag) {
    const ok = await confirm({
      title: t("deleteTagTitle"),
      message: t("deleteTagMessage", { name: tag.name }),
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`admin/blog-tags/${tag.public_id}/`);
      queryClient.setQueryData<BlogTag[]>(blogTagsQueryKey, (prev) =>
        (prev ?? []).filter((existing) => existing.public_id !== tag.public_id),
      );
      setForm((f) => ({
        ...f,
        tag_public_ids: f.tag_public_ids.filter((id) => id !== tag.public_id),
      }));
      notify.success(tPages("toastDescValueDeleted"), { title: tPages("toastTitleValueDeleted") });
    } catch (err) {
      notify.error(err, {
        title: tPages("toastTitleTagNotRemoved"),
        fallbackMessage: tPages("toastDescTagNotRemoved"),
      });
    }
  }

  async function buildFormData(): Promise<FormData> {
    const fd = new FormData();
    fd.append("title", form.title);
    // Only an address the merchant typed; the API makes one from the title otherwise, and keeps
    // a moved one forwarding.
    const typedAddress = addressInput?.trim() ?? "";
    if (typedAddress && typedAddress !== savedAddress) fd.append("slug", typedAddress);
    fd.append("excerpt", form.excerpt);
    fd.append("content", form.content);
    fd.append("meta_title", form.meta_title);
    fd.append("meta_description", form.meta_description);
    if (form.tag_public_ids.length > 0) {
      form.tag_public_ids.forEach((id) => fd.append("tag_public_ids", id));
    } else {
      fd.append("clear_tags", "true");
    }
    fd.append("is_featured", String(form.is_featured));
    fd.append("is_public", String(form.is_public));
    if (uploadedImageKey) fd.append("featured_image_key", uploadedImageKey);
    if (removeRemoteImage && !imageFile) fd.append("remove_featured_image", "true");
    return fd;
  }

  async function ensureSaved(): Promise<Blog | null> {
    const fd = await buildFormData();
    try {
      if (mode === "new") {
        const { data } = await api.post<Blog>("admin/blogs/", fd);
        return data;
      }
      const { data } = await api.patch<Blog>(
        `admin/blogs/${initialBlog!.public_id}/`,
        fd,
      );
      return data;
    } catch (err) {
      if (isApiHttpError(err)) {
        const responseData = err.response?.data as Record<string, unknown> | undefined;
        const titleErr = responseData?.title;
        const titleMsg = Array.isArray(titleErr) ? titleErr[0] : titleErr;
        if (typeof titleMsg === "string" && titleMsg.trim()) {
          notify.validation("blog-form", { title: titleMsg });
          notify.warning(titleMsg);
          return null;
        }
        if (responseData && typeof responseData === "object") {
          const fieldErrors: Record<string, string> = {};
          for (const [key, raw] of Object.entries(responseData)) {
            if (key === "detail" || key === "code") continue;
            if (Array.isArray(raw) && typeof raw[0] === "string") {
              fieldErrors[key] = raw[0];
            } else if (typeof raw === "string") {
              fieldErrors[key] = raw;
            }
          }
          if (Object.keys(fieldErrors).length > 0) {
            notify.validation("blog-form", fieldErrors);
            const first = Object.values(fieldErrors)[0];
            notify.warning(
              typeof first === "string" && first.trim()
                ? first
                : t("fieldsNotSaved"),
            );
            return null;
          }
        }
        notify.error(err, {
          title: tPages("toastTitlePostNotSaved"),
          fallbackMessage: tPages("toastDescPostNotSaved"),
        });
      } else {
        notify.error(err, {
          title: tPages("toastTitlePostNotSaved"),
          fallbackMessage: tPages("toastDescPostNotSaved"),
        });
      }
      return null;
    }
  }

  async function handleSave(e?: FormEvent) {
    e?.preventDefault();
    if (!form.title.trim()) {
      const message = t("titleRequired");
      notify.validation("blog-form", { title: message });
      notify.warning(message);
      return;
    }
    if (form.title.trim().length > BLOG_TITLE_MAX) {
      const message = t("titleTooLong", { max: BLOG_TITLE_MAX });
      notify.validation("blog-form", {
        title: message,
      });
      notify.warning(message);
      return;
    }
    if (form.excerpt.length > BLOG_EXCERPT_MAX) {
      const message = t("excerptTooLong", { max: BLOG_EXCERPT_MAX });
      notify.validation("blog-form", { excerpt: message });
      notify.warning(message);
      return;
    }
    if (form.meta_title.length > BLOG_TITLE_MAX) {
      const message = t("metaTitleTooLong", { max: BLOG_TITLE_MAX });
      notify.validation("blog-form", { meta_title: message });
      notify.warning(message);
      return;
    }
    if (form.meta_description.length > BLOG_META_DESC_MAX) {
      const message = t("metaDescriptionTooLong", { max: BLOG_META_DESC_MAX });
      notify.validation("blog-form", { meta_description: message });
      notify.warning(message);
      return;
    }
    if (imageFile && uploadStatus !== "uploaded") {
      notify.warning(tPages("toastDescUploadsStillInProgressBanner"), {
        title: tPages("toastTitleUploadsStillInProgress"),
      });
      return;
    }
    setSaving(true);
    const saved = await ensureSaved();
    setSaving(false);
    if (!saved) return;
    invalidateBlogCaches(saved.public_id);
    clearValidation();
    notify.success(tPages("toastDescPostSaved"), { title: tPages("toastTitlePostSaved") });
    if (mode === "new") {
      void navigate(`/blog/${saved.public_id}/edit`);
    } else {
      void navigate("/blog");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex min-w-0 items-center gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {tPages(mode === "new" ? "blogFormNewTitle" : "blogFormEditTitle")}
            </h1>
            <PageHint>{tHints(mode === "new" ? "blogNew" : "blogEdit")}</PageHint>
          </div>
        </div>
        <div className="flex w-full shrink-0 gap-2 sm:w-auto">
          {mode === "edit" && onDelete ? (
            <Button
              type="button"
              variant="destructive"
              className="flex-1 gap-2 sm:flex-none"
              onClick={onDelete}
              loading={deleteLoading}
              disabled={deleteLoading || saving || uploadStatus === "uploading"}
            >
              {t("deletePost")}
            </Button>
          ) : null}
          <Button
            type="button"
            onClick={() => void handleSave()}
            loading={saving}
            disabled={saving || uploadStatus === "uploading" || deleteLoading}
            className="flex-1 gap-2 sm:flex-none"
          >
            {t("savePost")}
          </Button>
        </div>
      </div>

      <form
        id="blog-form"
        onSubmit={handleSave}
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <div className="space-y-6 lg:col-span-2">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">{t("contentCard")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label={t("title")} required htmlFor="blog-title" error={fieldErrors.title}>
                <Input
                  id="blog-title"
                  required
                  value={form.title}
                  onChange={(e) => {
                    clearValidation(["title"]);
                    setForm((f) => ({ ...f, title: e.target.value }));
                  }}
                  maxLength={BLOG_TITLE_MAX}
                  aria-invalid={!!fieldErrors.title}
                  className={cn(fieldErrors.title && "border-destructive")}
                  placeholder={t("titlePlaceholder")}
                  onKeyDown={handleKeyDown}
                />
              </Field>
              <Field label={tAddress("label")} htmlFor="blog-address" error={fieldErrors.slug}>
                <WebAddressField
                  id="blog-address"
                  kind="post"
                  name={form.title}
                  saved={savedAddress}
                  excludePublicId={mode === "edit" ? initialBlog?.public_id : undefined}
                  value={addressInput}
                  onChange={(value) => {
                    clearValidation(["slug"]);
                    setAddressInput(value);
                  }}
                />
              </Field>
              <Field
                label={t("excerpt")}
                htmlFor="blog-excerpt"
                error={fieldErrors.excerpt}
                hint={t("excerptHint")}
              >
                <Textarea
                  id="blog-excerpt"
                  rows={2}
                  value={form.excerpt}
                  onChange={(e) => {
                    clearValidation(["excerpt"]);
                    setForm((f) => ({ ...f, excerpt: e.target.value }));
                  }}
                  maxLength={BLOG_EXCERPT_MAX}
                  aria-invalid={!!fieldErrors.excerpt}
                  className={cn(
                    "[field-sizing:fixed] h-24 resize-none overflow-y-auto",
                    fieldErrors.excerpt && "border-destructive",
                  )}
                  placeholder={t("excerptPlaceholder")}
                />
                <p
                  className={cn(
                    "mt-1 text-xs tabular-nums",
                    form.excerpt.length >= BLOG_EXCERPT_MAX
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {t("counter", { length: form.excerpt.length, max: BLOG_EXCERPT_MAX, words: countWords(form.excerpt) })}
                </p>
              </Field>
              <Field label={t("body")} htmlFor="blog-content" error={fieldErrors.content}>
                <Textarea
                  id="blog-content"
                  rows={14}
                  value={form.content}
                  onChange={(e) => {
                    clearValidation(["content"]);
                    setForm((f) => ({ ...f, content: e.target.value }));
                  }}
                  aria-invalid={!!fieldErrors.content}
                  className={cn(
                    "[field-sizing:fixed] h-64 resize-none overflow-y-auto font-mono text-sm",
                    fieldErrors.content && "border-destructive",
                  )}
                  placeholder={t("bodyPlaceholder")}
                />
                {/* It said "Markdown or HTML", and the shop has never read
                    Markdown: a merchant's `## Heading` reached shoppers as
                    two hashes. This is what the shop does with it. */}
                <p className="mt-1 text-xs text-muted-foreground">{t("bodyHint")}</p>
              </Field>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">{t("seoCard")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label={t("metaTitle")} htmlFor="blog-meta-title" error={fieldErrors.meta_title}>
                <Input
                  id="blog-meta-title"
                  value={form.meta_title}
                  onChange={(e) => {
                    clearValidation(["meta_title"]);
                    setForm((f) => ({ ...f, meta_title: e.target.value }));
                  }}
                  maxLength={BLOG_TITLE_MAX}
                  aria-invalid={!!fieldErrors.meta_title}
                  className={cn(fieldErrors.meta_title && "border-destructive")}
                  placeholder={t("metaTitlePlaceholder")}
                  onKeyDown={handleKeyDown}
                />
              </Field>
              <Field
                label={t("metaDescription")}
                htmlFor="blog-meta-description"
                error={fieldErrors.meta_description}
                hint={t("metaDescriptionHint", { max: BLOG_META_DESC_MAX })}
              >
                <Textarea
                  id="blog-meta-description"
                  rows={2}
                  value={form.meta_description}
                  onChange={(e) => {
                    clearValidation(["meta_description"]);
                    setForm((f) => ({
                      ...f,
                      meta_description: e.target.value,
                    }));
                  }}
                  maxLength={BLOG_META_DESC_MAX}
                  aria-invalid={!!fieldErrors.meta_description}
                  className={cn(fieldErrors.meta_description && "border-destructive")}
                  placeholder={t("metaDescriptionPlaceholder")}
                />
                <p
                  className={cn(
                    "mt-1 text-xs tabular-nums",
                    form.meta_description.length >= BLOG_META_DESC_MAX
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {t("counter", {
                    length: form.meta_description.length,
                    max: BLOG_META_DESC_MAX,
                    words: countWords(form.meta_description),
                  })}
                </p>
              </Field>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-1">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">{t("featuredImage")}</CardTitle>
            </CardHeader>
            <CardContent>
              <BlogImageUpload
                value={null}
                onChange={(file) => {
                  void handleImageSelect(file);
                }}
                remoteUrl={remoteImageUrl}
                onRemoveRemote={() => {
                  setRemoveRemoteImage(true);
                  setImageFile(null);
                  setUploadedImageKey(null);
                  setUploadedImageUrl(null);
                  setUploadStatus("idle");
                  setUploadProgress(0);
                  setUploadError(null);
                }}
                disabled={saving || uploadStatus === "uploading"}
              />
              <div className="mt-2 text-xs">
                {uploadStatus === "uploading" && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" /> {tUpload("uploading", { percent: uploadProgress })}
                  </span>
                )}
                {uploadStatus === "uploaded" && (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="size-3" /> {tUpload("replace")}
                  </span>
                )}
                {uploadStatus === "error" && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-destructive underline"
                    onClick={() => {
                      if (imageFile) void handleImageSelect(imageFile);
                    }}
                  >
                    <AlertCircle className="size-3" /> {tUpload("retry")}
                  </button>
                )}
                {uploadError && <p className="mt-1 text-destructive">{uploadError}</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">{t("visibility")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_public}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, is_public: e.target.checked }))
                  }
                  onKeyDown={handleKeyDown}
                />
                {t("public")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, is_featured: e.target.checked }))
                  }
                  onKeyDown={handleKeyDown}
                />
                {t("featured")}
              </label>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">{t("tags")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <button
                    type="button"
                    key={tag.public_id}
                    onClick={() => toggleTag(tag.public_id)}
                    className="inline-flex items-center gap-1 rounded-ui border border-border bg-muted px-2 py-0.5 text-xs"
                  >
                    {tag.name}
                    <X className="size-3" />
                  </button>
                ))}
                {selectedTags.length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    {t("noTagsSelected")}
                  </span>
                )}
              </div>
              <div className="max-h-40 space-y-1 overflow-auto rounded-card border border-border p-2">
                {tags.length === 0 && (
                  <p className="text-xs text-muted-foreground">{t("noTags")}</p>
                )}
                {tags.map((tag) => (
                  <div
                    key={tag.public_id}
                    className="flex items-center justify-between gap-2 rounded-ui px-1 py-1"
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.tag_public_ids.includes(tag.public_id)}
                        onChange={() => toggleTag(tag.public_id)}
                        onKeyDown={handleKeyDown}
                      />
                      {tag.name}
                    </label>
                    <button
                      type="button"
                      onClick={() => void deleteTag(tag)}
                      aria-label={t("deleteTagAria", { name: tag.name })}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-ui text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder={t("newTag")}
                  onKeyDown={handleKeyDown}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={createTag}
                  disabled={!newTagName.trim()}
                >
                  {t("addTag")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {mode === "edit" && initialBlog && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">{t("metaCard")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <p>{t("views", { count: initialBlog.views })}</p>
                {initialBlog.author_name && <p>{t("author", { name: initialBlog.author_name })}</p>}
              </CardContent>
            </Card>
          )}
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-muted-foreground"
      >
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
