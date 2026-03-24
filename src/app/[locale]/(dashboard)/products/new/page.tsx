"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Undo2, FileText, Check, Plus, X } from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ExtraFieldsFormSection } from "@/components/ExtraFieldsFormSection";
import { useExtraFieldsSchema } from "@/hooks/useExtraFieldsSchema";
import type { ExtraFieldValues } from "@/types/extra-fields";
import type { ParentCategory, Category } from "@/types";
import { MAX_PRODUCT_IMAGES } from "@/lib/product-media";
import {
  parseValidation,
  productCreateSchema,
  slugFromName,
  validateRequiredExtraFields,
} from "@/lib/validation";

const BADGE_OPTIONS = [
  { value: "", label: "None" },
  { value: "sale", label: "Sale" },
  { value: "new", label: "New" },
  { value: "hot", label: "Hot" },
] as const;

const MAX_IMAGES = MAX_PRODUCT_IMAGES;

export default function NewProductPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const submitAsDraftRef = useRef(false);

  const [parentCategories, setParentCategories] = useState<ParentCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    brand: "",
    price: "",
    original_price: "",
    category: "",
    sub_category: "",
    description: "",
    stock: "0",
    badge: "",
    is_featured: false,
    is_active: true,
  });
  const [extraFields, setExtraFields] = useState<ExtraFieldValues>({});
  const [extraFieldsErrors, setExtraFieldsErrors] = useState<Record<string, string>>({});
  const { schema: extraFieldsSchema } = useExtraFieldsSchema("product");
  const [imageFiles, setImageFiles] = useState<(File | null)[]>(
    () => Array(MAX_IMAGES).fill(null)
  );
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>(
    () => Array(MAX_IMAGES).fill(null)
  );
  const [resolvedSlug, setResolvedSlug] = useState("");
  const [slugUsesFallback, setSlugUsesFallback] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  /** Which slot (0…MAX-1) is shown in the big preview; null = first filled or none. */
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(0);

  const baseSlug = slugFromName(form.name);

  const firstFilledIndex = imagePreviews.findIndex(Boolean);
  const bigPreviewUrl =
    selectedImageIndex !== null && imagePreviews[selectedImageIndex]
      ? imagePreviews[selectedImageIndex]
      : firstFilledIndex >= 0
        ? imagePreviews[firstFilledIndex]
        : null;
  const canAddMore = imageFiles.filter(Boolean).length < MAX_IMAGES;
  /** Slot 0 is always the main image; gallery slots 1–3 can only be used after main is set. */
  const hasMainImage = Boolean(imageFiles[0]);
  const canAddToGallery = hasMainImage && canAddMore;

  useEffect(() => {
    Promise.all([
      api.get("admin/parent-categories/"),
      api.get("admin/categories/"),
    ]).then(([parentRes, catRes]) => {
      setParentCategories(parentRes.data.results ?? parentRes.data);
      setCategories(catRes.data.results ?? catRes.data);
    });
  }, []);

  useEffect(() => {
    const slugs = imageFiles.map((f) => (f ? URL.createObjectURL(f) : null));
    setImagePreviews(slugs);
    return () => slugs.forEach((u) => u && URL.revokeObjectURL(u));
  }, [imageFiles]);

  useEffect(() => {
    if (!baseSlug) {
      setResolvedSlug("");
      setSlugUsesFallback(false);
      return;
    }
    const t = setTimeout(() => {
      setSlugChecking(true);
      void (async () => {
        try {
          let candidate = baseSlug;
          let counter = 2;
          while (true) {
            const res = await api.get<{ available: boolean }>(
              `admin/products/check-slug/?slug=${encodeURIComponent(candidate)}`
            );
            if (res.data.available) {
              setResolvedSlug(candidate);
              setSlugUsesFallback(candidate !== baseSlug);
              break;
            }
            candidate = `${baseSlug}-${counter}`;
            counter += 1;
          }
        } catch {
          setResolvedSlug(baseSlug);
          setSlugUsesFallback(false);
        } finally {
          setSlugChecking(false);
        }
      })();
    }, 400);
    return () => clearTimeout(t);
  }, [baseSlug]);

  const filteredChildCategories = categories.filter(
    (c) => String(c.parent) === form.category
  );

  async function handleSubmit(e: FormEvent, asDraft: boolean) {
    e.preventDefault();
    const formValidation = parseValidation(productCreateSchema, form);
    if (!formValidation.success) {
      setError(
        formValidation.errors.name ??
          formValidation.errors.price ??
          formValidation.errors.category ??
          "Please correct the highlighted fields."
      );
      return;
    }

    const schemaWithNames = extraFieldsSchema.filter((f) => f.name.trim());
    const extraErrors = validateRequiredExtraFields(schemaWithNames, extraFields);
    if (Object.keys(extraErrors).length > 0) {
      setExtraFieldsErrors(extraErrors);
      setError("Please fill in all required extra fields.");
      return;
    }
    setExtraFieldsErrors({});

    setSaving(true);
    setError("");

    const formData = new FormData();
    const normalizedBrand = form.brand.trim();
    formData.append("name", form.name);
    if (normalizedBrand) formData.append("brand", normalizedBrand);
    formData.append("price", form.price);
    if (form.original_price) formData.append("original_price", form.original_price);
    formData.append("category", form.sub_category || form.category);
    formData.append("description", form.description);
    formData.append("stock", form.stock);
    if (form.badge) formData.append("badge", form.badge);
    formData.append("is_featured", String(form.is_featured));
    formData.append("is_active", asDraft ? "false" : "true");
    const mainImage = imageFiles[0];
    if (mainImage) formData.append("image", mainImage);
    if (Object.keys(extraFields).length > 0) {
      formData.append("extra_data", JSON.stringify(extraFields));
    }

    try {
      const { data } = await api.post<{ public_id: string }>("admin/products/", formData);
      const productId = data.public_id;
      for (let i = 1; i < MAX_IMAGES; i++) {
        const file = imageFiles[i];
        if (!file) continue;
        const galleryData = new FormData();
        galleryData.append("product", productId);
        galleryData.append("image", file);
        galleryData.append("order", String(i));
        await api.post("admin/product-images/", galleryData);
      }
      router.push("/products");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: unknown } }).response?.data
          : null;
      const text =
        typeof message === "string"
          ? message
          : message && typeof message === "object" && "slug" in message
            ? Array.isArray((message as { slug: unknown }).slug)
              ? (message as { slug: string[] }).slug[0]
              : String((message as { slug: unknown }).slug)
            : "Failed to create product.";
      setError(text || "Failed to create product.");
    } finally {
      setSaving(false);
    }
  }

  function onSaveDraft() {
    submitAsDraftRef.current = true;
    formRef.current?.requestSubmit();
  }

  function onSubmit(e: FormEvent) {
    const asDraft = submitAsDraftRef.current;
    submitAsDraftRef.current = false;
    handleSubmit(e, asDraft);
  }

  const fieldControlClass = "w-full rounded-lg bg-muted/50";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted/80 px-1 py-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Back to products"
              onClick={() => router.back()}
              className="shrink-0"
            >
              <Undo2 className="size-4" />
            </Button>
          </div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Add New Product
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onSaveDraft}
              disabled={saving}
              className="gap-2"
            >
            <FileText className="size-4" />
            Save Draft
          </Button>
          <Button
            type="submit"
            form="product-form"
            disabled={saving}
            onClick={() => {
              submitAsDraftRef.current = false;
            }}
            className="gap-2"
          >
            <Check className="size-4" />
            {saving ? "Saving..." : "Add Product"}
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <form
        id="product-form"
        ref={formRef}
        onSubmit={onSubmit}
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* General Information */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-foreground">
                General Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Product name" required>
                <Input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Wireless Earbuds Pro"
                  className={fieldControlClass}
                />
                <div className="mt-1.5 flex items-center gap-2">
                  <p
                    className="text-xs text-muted-foreground"
                    aria-describedby={slugUsesFallback ? "slug-warning" : undefined}
                  >
                    Slug:{" "}
                    <span className="font-mono">{resolvedSlug || baseSlug || "—"}</span>
                  </p>
                  {slugChecking && (
                    <span className="text-xs text-muted-foreground">Checking…</span>
                  )}
                </div>
                {slugUsesFallback && baseSlug && (
                  <p
                    id="slug-warning"
                    className="mt-1 inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300"
                  >
                    A similar slug already exists. Using an alternative for SEO.
                  </p>
                )}
              </Field>
              <Field label="Description">
                <Textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Describe your product..."
                  className={fieldControlClass}
                />
              </Field>
              <Field label="Brand">
                <Input
                  type="text"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  placeholder="Brand name"
                  className={fieldControlClass}
                />
              </Field>
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  Promo badge
                </p>
                <div className="flex flex-wrap gap-2">
                  {BADGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value || "none"}
                      type="button"
                      onClick={() => setForm({ ...form, badge: opt.value })}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        form.badge === opt.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) =>
                    setForm({ ...form, is_featured: e.target.checked })
                  }
                  className="form-checkbox"
                />
                <span className="text-sm font-medium text-foreground">
                  Featured product
                </span>
              </label>
            </CardContent>
          </Card>

          {/* Pricing and Stock */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-foreground">
                Pricing and Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Base price" required>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    placeholder="0.00"
                    className={`font-numbers ${fieldControlClass}`}
                  />
                </Field>
                <Field label="Compare at (original price)">
                  <Input
                    type="number"
                    step="0.01"
                    value={form.original_price}
                    onChange={(e) =>
                      setForm({ ...form, original_price: e.target.value })
                    }
                    placeholder="Optional"
                    className={`font-numbers ${fieldControlClass}`}
                  />
                </Field>
                <Field label="Stock">
                  <Input
                    type="number"
                    min={0}
                    value={form.stock}
                    onChange={(e) =>
                      setForm({ ...form, stock: e.target.value })
                    }
                    className={`font-numbers ${fieldControlClass}`}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>

          {/* Extra Fields (JSONB) */}
          {extraFieldsSchema.some((f) => f.name.trim()) && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-foreground">
                  Extra Fields
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Custom fields defined in Settings → Dynamic Fields.
                </p>
              </CardHeader>
              <CardContent>
                <ExtraFieldsFormSection
                  entityType="product"
                  values={extraFields}
                  onChange={setExtraFields}
                  errors={extraFieldsErrors}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6 lg:col-span-1">
          {/* Upload images (main + gallery, max MAX_PRODUCT_IMAGES total) */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-foreground">
                Upload Image
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {MAX_IMAGES} images max. The first image is always the main product image; add it before adding more. Click a thumbnail to show it in the preview.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted/50">
                {bigPreviewUrl ? (
                  <img
                    src={bigPreviewUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
                    <Plus className="size-10" />
                    <span className="text-sm font-medium">
                      Click to upload main image
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        if (!file || !canAddMore) return;
                        setImageFiles((prev) => {
                          const next = [...prev];
                          next[0] = file;
                          return next;
                        });
                        setSelectedImageIndex(0);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
              {imageFiles.some(Boolean) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const idx = selectedImageIndex ?? firstFilledIndex;
                    if (idx >= 0) {
                      setImageFiles((prev) => {
                        const next = [...prev];
                        next[idx] = null;
                        return next;
                      });
                      const nextFilled = imagePreviews
                        .map((u, i) => (u && i !== idx ? i : -1))
                        .filter((i) => i >= 0)[0];
                      setSelectedImageIndex(nextFilled ?? null);
                    }
                  }}
                  className="w-full"
                >
                  Remove selected image
                </Button>
              )}
              <div
                className="mt-3 flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 sm:overflow-visible sm:flex-wrap sm:pb-0 sm:mx-0 sm:px-0"
                role="list"
                aria-label="Product images"
              >
                {Array.from({ length: MAX_IMAGES }, (_, i) => (
                  <div
                    key={i}
                    className={`relative aspect-square w-16 shrink-0 snap-start overflow-hidden rounded-lg border border-dashed border-border bg-muted/30 ${
                      (selectedImageIndex ?? firstFilledIndex) === i && imagePreviews[i]
                        ? "ring-2 ring-primary"
                        : ""
                    }`}
                  >
                    {imagePreviews[i] ? (
                      <>
                        <button
                          type="button"
                          className="block h-full w-full focus:outline-none focus:ring-0"
                          onClick={() => setSelectedImageIndex(i)}
                          aria-label={`Show image ${i + 1} in preview`}
                        >
                          <img
                            src={imagePreviews[i]!}
                            alt={`Thumbnail ${i + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setImageFiles((prev) => {
                              const next = [...prev];
                              next[i] = null;
                              return next;
                            });
                            if (selectedImageIndex === i) {
                              const nextFilled = imagePreviews
                                .map((u, j) => (u && j !== i ? j : -1))
                                .filter((j) => j >= 0)[0];
                              setSelectedImageIndex(nextFilled ?? null);
                            }
                          }}
                          className="absolute right-1 top-1 rounded-full bg-destructive/90 p-0.5 text-primary-foreground hover:bg-destructive"
                          aria-label={`Remove image ${i + 1}`}
                        >
                          <X className="size-3" />
                        </button>
                      </>
                    ) : (
                      <label
                        className={`flex h-full w-full cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-foreground ${
                          i > 0 && !hasMainImage ? "cursor-not-allowed opacity-50" : ""
                        }`}
                        title={i > 0 && !hasMainImage ? "Add main image first" : undefined}
                      >
                        <Plus className="size-5" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={i === 0 ? !canAddMore : !canAddToGallery}
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            const allowed = i === 0 ? canAddMore : canAddToGallery;
                            if (!file || !allowed) return;
                            setImageFiles((prev) => {
                              const next = [...prev];
                              next[i] = file;
                              return next;
                            });
                            setSelectedImageIndex(i);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Category */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-foreground">
                Category
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Parent category" required>
                <Select
                  required
                  value={form.category}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      category: e.target.value,
                      sub_category: "",
                    })
                  }
                  className={fieldControlClass}
                >
                  <option value="">Select parent...</option>
                  {parentCategories.map((c) => (
                    <option key={c.public_id} value={c.public_id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Child category">
                <Select
                  value={form.sub_category}
                  onChange={(e) =>
                    setForm({ ...form, sub_category: e.target.value })
                  }
                  className={fieldControlClass}
                  disabled={!form.category}
                >
                  <option value="">Select child (optional)...</option>
                  {filteredChildCategories.map((c) => (
                    <option key={c.public_id} value={c.public_id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button variant="outline" className="w-full gap-2" asChild>
                <Link href="/categories">
                  <Plus className="size-4" />
                  Add category
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {children}
    </div>
  );
}
