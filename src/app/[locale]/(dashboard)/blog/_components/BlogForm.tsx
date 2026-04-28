"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Trash2, Undo2, X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { isAxiosError } from "axios";
import api from "@/lib/api";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { notify } from "@/notifications";
import type { Blog, BlogTag, PaginatedResponse } from "@/types";
import { BlogImageUpload } from "./BlogImageUpload";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { useNotificationValidation } from "@/notifications/NotificationProvider";
import { cn } from "@/lib/utils";
import { useEnterNavigation } from "@/hooks/useEnterNavigation";
import { buildPublicMediaUrlFromKey, uploadFile } from "@/hooks/usePresignedUpload";

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

export function BlogForm({ mode, initialBlog }: BlogFormProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const { fieldErrors, clearValidation } = useNotificationValidation("blog-form");
  const tempBlogUploadIdRef = useRef<string>(
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? `blg_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`
      : `blg_${Date.now()}`
  );
  const [form, setForm] = useState<BlogFormState>(() =>
    initialBlog ? stateFromBlog(initialBlog) : EMPTY_STATE,
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadedImageKey, setUploadedImageKey] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "uploaded" | "error">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [removeRemoteImage, setRemoveRemoteImage] = useState(false);
  const [tags, setTags] = useState<BlogTag[]>([]);
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
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  useEffect(() => {
    void fetchTags();
  }, []);

  async function fetchTags() {
    try {
      const { data } = await api.get<PaginatedResponse<BlogTag> | BlogTag[]>(
        "admin/blog-tags/",
      );
      setTags(Array.isArray(data) ? data : data.results);
    } catch (err) {
      console.error(err);
      notify.error(err);
    }
  }

  const selectedTags = useMemo(
    () => tags.filter((t) => form.tag_public_ids.includes(t.public_id)),
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
      setTags((prev) => [...prev, data]);
      setForm((f) => ({ ...f, tag_public_ids: [...f.tag_public_ids, data.public_id] }));
      setNewTagName("");
      notify.success("Tag created");
    } catch (err) {
      notify.error(err);
    }
  }

  async function deleteTag(tag: BlogTag) {
    const ok = await confirm({
      title: "Delete tag?",
      message: `Delete "${tag.name}" from all blog posts?`,
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`admin/blog-tags/${tag.public_id}/`);
      setTags((prev) => prev.filter((t) => t.public_id !== tag.public_id));
      setForm((f) => ({
        ...f,
        tag_public_ids: f.tag_public_ids.filter((id) => id !== tag.public_id),
      }));
      notify.warning("Tag deleted");
    } catch (err) {
      notify.error(err);
    }
  }

  async function buildFormData(): Promise<FormData> {
    const fd = new FormData();
    fd.append("title", form.title);
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
      if (isAxiosError(err)) {
        const responseData = err.response?.data as Record<string, unknown> | undefined;
        const titleErr = err.response?.data?.title;
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
                : "Some fields could not be saved. See the messages under each field.",
            );
            return null;
          }
        }
        notify.error(err, {
          fallbackMessage: "Unable to save post. Please check your input and try again.",
        });
      } else {
        notify.error(err, {
          fallbackMessage: "Unable to save post. Please try again.",
        });
      }
      return null;
    }
  }

  async function handleSave(e?: FormEvent) {
    e?.preventDefault();
    if (!form.title.trim()) {
      const message = "Title is required";
      notify.validation("blog-form", { title: message });
      notify.warning(message);
      return;
    }
    if (form.title.trim().length > BLOG_TITLE_MAX) {
      const message = `Title must be ${BLOG_TITLE_MAX} characters or fewer`;
      notify.validation("blog-form", {
        title: message,
      });
      notify.warning(message);
      return;
    }
    if (form.excerpt.length > BLOG_EXCERPT_MAX) {
      const message = `Excerpt must be ${BLOG_EXCERPT_MAX} characters or fewer`;
      notify.validation("blog-form", { excerpt: message });
      notify.warning(message);
      return;
    }
    if (form.meta_title.length > BLOG_TITLE_MAX) {
      const message = `Meta title must be ${BLOG_TITLE_MAX} characters or fewer`;
      notify.validation("blog-form", { meta_title: message });
      notify.warning(message);
      return;
    }
    if (form.meta_description.length > BLOG_META_DESC_MAX) {
      const message = `Meta description must be ${BLOG_META_DESC_MAX} characters or fewer`;
      notify.validation("blog-form", { meta_description: message });
      notify.warning(message);
      return;
    }
    if (imageFile && uploadStatus !== "uploaded") {
      notify.warning(uploadError || "Image upload is not complete yet.");
      return;
    }
    setSaving(true);
    const saved = await ensureSaved();
    setSaving(false);
    if (!saved) return;
    clearValidation();
    notify.success("Post saved");
    if (mode === "new") {
      router.push(`/blog/${saved.public_id}/edit`);
    } else {
      router.push("/blog");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="rounded-card bg-muted/80 px-1 py-1 hidden md:block">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="flex items-center justify-center rounded-ui p-1 text-muted-foreground hover:bg-muted"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {mode === "new" ? "New blog post" : "Edit blog post"}
          </h1>
        </div>
        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || uploadStatus === "uploading"}
          className="w-full shrink-0 sm:w-auto"
        >
          {saving || uploadStatus === "uploading" ? "Saving…" : "Save post"}
        </Button>
      </div>

      <form
        id="blog-form"
        onSubmit={handleSave}
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <div className="space-y-6 lg:col-span-2">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Title" required htmlFor="blog-title" error={fieldErrors.title}>
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
                  placeholder="A compelling title for your post"
                  onKeyDown={handleKeyDown}
                />
                {mode === "edit" && initialBlog?.slug && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Slug: <span className="font-mono">{initialBlog.slug}</span>
                  </p>
                )}
              </Field>
              <Field
                label="Excerpt"
                htmlFor="blog-excerpt"
                error={fieldErrors.excerpt}
                hint="Shown in blog listings and preview cards when set."
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
                  placeholder="Short summary shown in listings (optional)"
                />
                <p
                  className={cn(
                    "mt-1 text-xs tabular-nums",
                    form.excerpt.length >= BLOG_EXCERPT_MAX
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {form.excerpt.length} / {BLOG_EXCERPT_MAX} characters · {countWords(form.excerpt)}{" "}
                  words
                </p>
              </Field>
              <Field label="Body" htmlFor="blog-content" error={fieldErrors.content}>
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
                  placeholder="Markdown or HTML. Inline images: paste external URLs."
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  The body is stored as plain text — storefront rendering decides
                  whether to treat it as markdown or HTML. Use external image URLs
                  for inline images.
                </p>
              </Field>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Meta title" htmlFor="blog-meta-title" error={fieldErrors.meta_title}>
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
                  placeholder="Defaults to the post title"
                  onKeyDown={handleKeyDown}
                />
              </Field>
              <Field
                label="Meta description"
                htmlFor="blog-meta-description"
                error={fieldErrors.meta_description}
                hint={`Up to ${BLOG_META_DESC_MAX} characters for search snippets.`}
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
                  placeholder="Shown in search engine result snippets"
                />
                <p
                  className={cn(
                    "mt-1 text-xs tabular-nums",
                    form.meta_description.length >= BLOG_META_DESC_MAX
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {form.meta_description.length} / {BLOG_META_DESC_MAX} characters ·{" "}
                  {countWords(form.meta_description)} words
                </p>
              </Field>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-1">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Featured image
              </CardTitle>
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
                    <Loader2 className="size-3 animate-spin" /> Uploading {uploadProgress}%
                  </span>
                )}
                {uploadStatus === "uploaded" && (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="size-3" /> Replace
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
                    <AlertCircle className="size-3" /> Failed. Retry
                  </button>
                )}
                {uploadError && <p className="mt-1 text-destructive">{uploadError}</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Visibility
              </CardTitle>
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
                Public (visible on storefront)
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
                Featured post
              </label>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((t) => (
                  <button
                    type="button"
                    key={t.public_id}
                    onClick={() => toggleTag(t.public_id)}
                    className="inline-flex items-center gap-1 rounded-ui border border-border bg-muted px-2 py-0.5 text-xs"
                  >
                    {t.name}
                    <X className="size-3" />
                  </button>
                ))}
                {selectedTags.length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    No tags selected
                  </span>
                )}
              </div>
              <div className="max-h-40 space-y-1 overflow-auto rounded-card border border-border p-2">
                {tags.length === 0 && (
                  <p className="text-xs text-muted-foreground">No tags yet.</p>
                )}
                {tags.map((t) => (
                  <div
                    key={t.public_id}
                    className="flex items-center justify-between gap-2 rounded-ui px-1 py-1"
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.tag_public_ids.includes(t.public_id)}
                        onChange={() => toggleTag(t.public_id)}
                        onKeyDown={handleKeyDown}
                      />
                      {t.name}
                    </label>
                    <button
                      type="button"
                      onClick={() => void deleteTag(t)}
                      aria-label={`Delete tag ${t.name}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-ui text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="New tag"
                  onKeyDown={handleKeyDown}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={createTag}
                  disabled={!newTagName.trim()}
                >
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {mode === "edit" && initialBlog && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Meta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <p>Views: {initialBlog.views}</p>
                {initialBlog.author_name && <p>Author: {initialBlog.author_name}</p>}
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
