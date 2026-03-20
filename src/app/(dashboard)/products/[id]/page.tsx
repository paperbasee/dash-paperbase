"use client";

import { useEffect, useRef, useState, type FormEvent, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Undo2, FileText, Check, Plus, X } from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExtraFieldsFormSection } from "@/components/ExtraFieldsFormSection";
import { useExtraFieldsSchema } from "@/hooks/useExtraFieldsSchema";
import type { ExtraFieldValues } from "@/types/extra-fields";
import type { Product, ParentCategory, Category } from "@/types";
import { MAX_PRODUCT_IMAGES } from "@/lib/product-media";
import {
  parseValidation,
  productUpdateSchema,
  validateRequiredExtraFields,
} from "@/lib/validation";

const BADGE_OPTIONS = [
  { value: "", label: "None" },
  { value: "sale", label: "Sale" },
  { value: "new", label: "New" },
  { value: "hot", label: "Hot" },
] as const;

const MAX_IMAGES = MAX_PRODUCT_IMAGES;

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const submitAsDraftRef = useRef(false);

  const [product, setProduct] = useState<Product | null>(null);
  const [parentCategories, setParentCategories] = useState<ParentCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
  const [imageFileUrls, setImageFileUrls] = useState<(string | null)[]>(
    () => Array(MAX_IMAGES).fill(null)
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(0);

  const existingImageUrls = useMemo(() => {
    if (!product) return Array(MAX_IMAGES).fill(null) as (string | null)[];
    const main = product.image_url ?? product.image ?? null;
    const gallery =
      product.images?.slice().sort((a, b) => a.order - b.order).map((i) => i.image) ?? [];
    const arr: (string | null)[] = [main, ...gallery.slice(0, MAX_IMAGES - 1)];
    while (arr.length < MAX_IMAGES) arr.push(null);
    return arr.slice(0, MAX_IMAGES);
  }, [product]);

  const imagePreviews = imageFileUrls.map((url, i) => url ?? existingImageUrls[i] ?? null);
  const firstFilledIndex = imagePreviews.findIndex(Boolean);
  const bigPreviewUrl =
    selectedImageIndex !== null && imagePreviews[selectedImageIndex]
      ? imagePreviews[selectedImageIndex]
      : firstFilledIndex >= 0
        ? imagePreviews[firstFilledIndex]
        : null;
  const hasMainImage = Boolean(imageFiles[0] || existingImageUrls[0]);
  const canAddMore = imagePreviews.filter(Boolean).length < MAX_IMAGES;
  const canAddToGallery = hasMainImage && canAddMore;

  useEffect(() => {
    Promise.all([
      api.get<Product>(`admin/products/${id}/`),
      api.get("admin/parent-categories/"),
      api.get("admin/categories/"),
    ])
      .then(([prodRes, parentRes, catRes]) => {
        const p = prodRes.data;
        const cats = catRes.data.results ?? catRes.data;
        const cat = cats.find((c: Category) => String(c.id) === String(p.category));
        const parentId = cat?.parent ?? null;
        setProduct(p);
        setParentCategories(parentRes.data.results ?? parentRes.data);
        setCategories(cats);
        setForm({
          name: p.name,
          brand: p.brand,
          price: p.price,
          original_price: p.original_price ?? "",
          category: parentId != null ? String(parentId) : String(p.category),
          sub_category: parentId != null ? String(p.category) : "",
          description: p.description ?? "",
          stock: String(p.stock),
          badge: p.badge ?? "",
          is_featured: p.is_featured,
          is_active: p.is_active,
        });
        setExtraFields(
          typeof p.extra_data === "object" && p.extra_data !== null
            ? (p.extra_data as ExtraFieldValues)
            : {}
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const urls = imageFiles.map((f) => (f ? URL.createObjectURL(f) : null));
    setImageFileUrls(urls);
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
  }, [imageFiles]);

  const filteredChildCategories = categories.filter(
    (c) => String(c.parent) === form.category
  );

  async function handleSubmit(e: FormEvent, asDraft: boolean) {
    e.preventDefault();
    if (!product) return;

    const formValidation = parseValidation(productUpdateSchema, form);
    if (!formValidation.success) {
      setError(
        formValidation.errors.name ??
          formValidation.errors.brand ??
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
    formData.append("name", form.name);
    formData.append("brand", form.brand);
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
      const { data } = await api.patch(`admin/products/${id}/`, formData);
      setProduct(data);
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
            : "Failed to update product.";
      setError(text || "Failed to update product.");
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

  const inputClass =
    "input w-full rounded-lg bg-muted/50 border-border focus:ring-2 focus:ring-ring focus:ring-offset-0";

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-6xl">
        <p className="text-muted-foreground">Product not found.</p>
      </div>
    );
  }

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
            Edit Product
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
            {saving ? "Saving..." : "Save Changes"}
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
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Wireless Earbuds Pro"
                  className={inputClass}
                />
              </Field>
              <Field label="Slug">
                <input
                  type="text"
                  readOnly
                  value={product.slug || "—"}
                  className={`${inputClass} bg-muted/80 font-mono text-sm`}
                />
              </Field>
              <Field label="Description">
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Describe your product..."
                  className={inputClass}
                />
              </Field>
              <Field label="Brand" required>
                <input
                  type="text"
                  required
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  placeholder="Brand name"
                  className={inputClass}
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
                  className="size-4 rounded border-border"
                />
                <span className="text-sm font-medium text-foreground">
                  Featured product
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm({ ...form, is_active: e.target.checked })
                  }
                  className="size-4 rounded border-border"
                />
                <span className="text-sm font-medium text-foreground">
                  Active (visible in store)
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
              {product.variant_count != null && product.variant_count > 0 && (
                <p className="text-xs text-muted-foreground">
                  This product has <strong>{product.variant_count}</strong> variants (SKUs). Inventory is
                  stored per variant; <strong>total units</strong> (sum of variant stock):{" "}
                  <span className="font-numbers text-foreground">{product.total_stock ?? product.stock}</span>.{" "}
                  <Link
                    href={`/variants?product=${encodeURIComponent(id)}`}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Manage variants
                  </Link>
                  .
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Base price" required>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    placeholder="0.00"
                    className={`font-numbers ${inputClass}`}
                  />
                </Field>
                <Field label="Compare at (original price)">
                  <input
                    type="number"
                    step="0.01"
                    value={form.original_price}
                    onChange={(e) =>
                      setForm({ ...form, original_price: e.target.value })
                    }
                    placeholder="Optional"
                    className={`font-numbers ${inputClass}`}
                  />
                </Field>
                <Field label={product.variant_count ? "Base product stock (legacy)" : "Stock"}>
                  <input
                    type="number"
                    min={0}
                    value={form.stock}
                    onChange={(e) =>
                      setForm({ ...form, stock: e.target.value })
                    }
                    className={`font-numbers ${inputClass}`}
                    disabled={Boolean(product.variant_count && product.variant_count > 0)}
                    title={
                      product.variant_count
                        ? "When variants exist, edit stock per SKU under Catalog → Variants."
                        : undefined
                    }
                  />
                </Field>
              </div>
            </CardContent>
          </Card>

          {/* Extra Fields (JSONB) — show form from schema and/or read-only saved values */}
          {(extraFieldsSchema.some((f) => f.name.trim()) ||
            (product.extra_data &&
              typeof product.extra_data === "object" &&
              Object.keys(product.extra_data).length > 0)) && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-foreground">
                  Extra Fields
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Custom fields from Settings → Dynamic Fields. Values are saved as{" "}
                  <code className="rounded bg-muted px-1 text-[11px]">extra_data</code> on the product
                  (storefront API includes this JSON — your theme must render it).
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {extraFieldsSchema.some((f) => f.name.trim()) && (
                  <ExtraFieldsFormSection
                    entityType="product"
                    values={extraFields}
                    onChange={setExtraFields}
                    errors={extraFieldsErrors}
                  />
                )}
                {product.extra_data &&
                  typeof product.extra_data === "object" &&
                  Object.keys(product.extra_data).length > 0 && (
                    <div
                      className={
                        extraFieldsSchema.some((f) => f.name.trim())
                          ? "border-t border-border pt-4"
                          : ""
                      }
                    >
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Saved on product (extra_data)
                      </p>
                      <dl className="grid gap-2 text-sm sm:grid-cols-2">
                        {Object.entries(product.extra_data).map(([k, v]) => (
                          <div key={k} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                            <dt className="text-xs text-muted-foreground">{k}</dt>
                            <dd className="font-medium text-foreground break-words">
                              {typeof v === "object" ? JSON.stringify(v) : String(v)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
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
                {MAX_IMAGES} images max. The first image is the main product image. Click a thumbnail to show it in the preview.
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
              {imagePreviews.some(Boolean) && (
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
                <select
                  required
                  value={form.category}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      category: e.target.value,
                      sub_category: "",
                    })
                  }
                  className={inputClass}
                >
                  <option value="">Select parent...</option>
                  {parentCategories.map((c) => (
                    <option key={c.public_id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Child category">
                <select
                  value={form.sub_category}
                  onChange={(e) =>
                    setForm({ ...form, sub_category: e.target.value })
                  }
                  className={inputClass}
                  disabled={!form.category}
                >
                  <option value="">Select child (optional)...</option>
                  {filteredChildCategories.map((c) => (
                    <option key={c.public_id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
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
