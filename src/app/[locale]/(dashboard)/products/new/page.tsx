"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Undo2, Check, ImageIcon, Plus, X, Loader2, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ExtraFieldsFormSection } from "@/components/ExtraFieldsFormSection";
import { useExtraFieldsSchema } from "@/hooks/useExtraFieldsSchema";
import { useEnterNavigation } from "@/hooks/useEnterNavigation";
import type { ExtraFieldValues } from "@/types/extra-fields";
import type { AdminCategoryTreeNode } from "@/types";
import { flattenCategoryOptions } from "@/lib/category-tree";
import { MAX_PRODUCT_IMAGES } from "@/lib/product-media";
import {
  parseValidation,
  productCreateSchema,
  slugFromName,
  validateRequiredExtraFields,
} from "@/lib/validation";
import { notify } from "@/notifications";
import { numberTextClass } from "@/lib/number-font";
import { cn } from "@/lib/utils";
import { buildPublicMediaUrlFromKey, uploadFile } from "@/hooks/usePresignedUpload";

const MAX_IMAGES = MAX_PRODUCT_IMAGES;
type UploadStatus = "idle" | "uploading" | "uploaded" | "error";

export default function NewProductPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const tempUploadGroupIdRef = useRef<string>(
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? `tmp_${crypto.randomUUID()}`
      : `tmp_${Date.now()}`
  );
  const router = useRouter();
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const [categoryTree, setCategoryTree] = useState<AdminCategoryTreeNode[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    brand: "",
    price: "",
    original_price: "",
    category: "",
    description: "",
    stock: "0",
    is_active: true,
    prepayment_type: "none" as "none" | "delivery_only" | "full",
  });
  const [extraFields, setExtraFields] = useState<ExtraFieldValues>({});
  const [extraFieldsErrors, setExtraFieldsErrors] = useState<Record<string, string>>({});
  const { schema: extraFieldsSchema } = useExtraFieldsSchema("product");
  const [imageFiles, setImageFiles] = useState<(File | null)[]>(
    () => Array(MAX_IMAGES).fill(null)
  );
  const [imageKeys, setImageKeys] = useState<(string | null)[]>(
    () => Array(MAX_IMAGES).fill(null)
  );
  const [uploadStatus, setUploadStatus] = useState<UploadStatus[]>(
    () => Array(MAX_IMAGES).fill("idle")
  );
  const [uploadProgress, setUploadProgress] = useState<number[]>(
    () => Array(MAX_IMAGES).fill(0)
  );
  const [uploadErrors, setUploadErrors] = useState<(string | null)[]>(
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
  const [mainImageDragging, setMainImageDragging] = useState(false);

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
    api
      .get<AdminCategoryTreeNode[]>("admin/categories/?tree=1")
      .then((res) => {
        const d = res.data;
        setCategoryTree(Array.isArray(d) ? d : []);
      })
      .catch((err) => {
        console.error(err);
        notify.error(err);
      });
  }, []);

  const categorySelectOptions = useMemo(
    () => flattenCategoryOptions(categoryTree),
    [categoryTree]
  );

  const anyUploading = uploadStatus.some((s) => s === "uploading");

  async function uploadSlotFile(index: number, file: File) {
    setUploadStatus((prev) => prev.map((s, i) => (i === index ? "uploading" : s)));
    setUploadProgress((prev) => prev.map((p, i) => (i === index ? 0 : p)));
    setUploadErrors((prev) => prev.map((e, i) => (i === index ? null : e)));
    try {
      const { key } = await uploadFile(file, {
        entity: "product",
        entityPublicId: tempUploadGroupIdRef.current,
        isGallery: index > 0,
        onProgress: (percent) =>
          setUploadProgress((prev) => prev.map((p, i) => (i === index ? percent : p))),
      });
      setImageKeys((prev) => prev.map((k, i) => (i === index ? key : k)));
      setImagePreviews((prev) =>
        prev.map((u, i) => (i === index ? buildPublicMediaUrlFromKey(key) : u))
      );
      setUploadStatus((prev) => prev.map((s, i) => (i === index ? "uploaded" : s)));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      setUploadErrors((prev) => prev.map((e, i) => (i === index ? message : e)));
      setUploadStatus((prev) => prev.map((s, i) => (i === index ? "error" : s)));
    }
  }

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const formValidation = parseValidation(productCreateSchema, form);
    if (!formValidation.success) {
      setError(
        formValidation.errors.name ??
          formValidation.errors.price ??
          formValidation.errors.category ??
          tPages("formFixHighlighted")
      );
      return;
    }

    const schemaWithNames = extraFieldsSchema.filter((f) => f.name.trim());
    const extraErrors = validateRequiredExtraFields(schemaWithNames, extraFields);
    if (Object.keys(extraErrors).length > 0) {
      setExtraFieldsErrors(extraErrors);
      setError(tPages("productFillExtraFields"));
      return;
    }
    setExtraFieldsErrors({});

    const hasIncompleteUpload = imageFiles.some((file, i) => Boolean(file) && !imageKeys[i]);
    if (hasIncompleteUpload || anyUploading) {
      setError("Please complete image uploads before saving.");
      return;
    }

    setSaving(true);
    setError("");

    const formData = new FormData();
    const normalizedBrand = form.brand.trim();
    formData.append("name", form.name);
    if (normalizedBrand) formData.append("brand", normalizedBrand);
    formData.append("price", form.price);
    formData.append("original_price", form.original_price.trim());
    formData.append("category", form.category);
    formData.append("description", form.description);
    formData.append("is_active", String(form.is_active));
    formData.append("prepayment_type", form.prepayment_type);
    const mainImageKey = imageKeys[0];
    if (mainImageKey) formData.append("image_key", mainImageKey);
    if (Object.keys(extraFields).length > 0) {
      formData.append("extra_data", JSON.stringify(extraFields));
    }

    try {
      const { data } = await api.post<{ public_id: string }>("admin/products/", formData);
      const productId = data.public_id;
      for (let i = 1; i < MAX_IMAGES; i++) {
        const key = imageKeys[i];
        if (!key) continue;
        const galleryData = new FormData();
        galleryData.append("product_public_id", productId);
        galleryData.append("image_key", key);
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
            : tPages("productCreateFailed");
      setError(text || tPages("productCreateFailed"));
    } finally {
      setSaving(false);
    }
  }

  const fieldControlClass = "w-full rounded-card bg-muted/50";
  const { handleKeyDown } = useEnterNavigation(() => formRef.current?.requestSubmit());

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-card bg-muted/80 px-1 py-1 hidden md:block">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label={tPages("productBackAria")}
              className="flex shrink-0 items-center justify-center rounded-ui p-1 text-muted-foreground hover:bg-muted"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          </div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {tPages("productNewTitle")}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" form="product-form" disabled={saving || anyUploading} className="gap-2">
            <Check className="size-4" />
            {saving ? tPages("productSavingButton") : tPages("productAddProduct")}
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-card border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <form
        id="product-form"
        ref={formRef}
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* General Information */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-foreground">
                {tPages("productGeneralInformation")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label={tPages("productNameLabel")} required>
                <Input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={tPages("productNamePlaceholder")}
                  className={fieldControlClass}
                  onKeyDown={handleKeyDown}
                />
                <div className="mt-1.5 flex items-center gap-2">
                  <p
                    className="text-xs text-muted-foreground"
                    aria-describedby={slugUsesFallback ? "slug-warning" : undefined}
                  >
                    {tPages("productSlugPrefix")}{" "}
                    <span className="font-mono">{resolvedSlug || baseSlug || "—"}</span>
                  </p>
                  {slugChecking && (
                    <span className="text-xs text-muted-foreground">
                      {tPages("productSlugChecking")}
                    </span>
                  )}
                </div>
                {slugUsesFallback && baseSlug && (
                  <p
                    id="slug-warning"
                    className="mt-1 inline-flex items-center rounded-ui border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300"
                  >
                    {tPages("productSlugFallbackWarning")}
                  </p>
                )}
              </Field>
              <Field label={tPages("productDescription")}>
                <Textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder={tPages("productDescriptionPlaceholder")}
                  className={`${fieldControlClass} [field-sizing:fixed] h-40 resize-none overflow-y-auto`}
                />
              </Field>
              <Field label={tPages("productBrand")}>
                <Input
                  type="text"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  placeholder={tPages("productBrandPlaceholder")}
                  className={fieldControlClass}
                  onKeyDown={handleKeyDown}
                />
              </Field>
            </CardContent>
          </Card>

          {/* Pricing and Stock */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-foreground">
                {tPages("productPricingStock")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={tPages("productBasePrice")} required>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    placeholder="0.00"
                    className={cn(numClass, fieldControlClass)}
                    onKeyDown={handleKeyDown}
                  />
                </Field>
                <Field label={tPages("productCompareAt")}>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.original_price}
                    onChange={(e) =>
                      setForm({ ...form, original_price: e.target.value })
                    }
                    placeholder={tCommon("optional")}
                    className={cn(numClass, fieldControlClass)}
                    onKeyDown={handleKeyDown}
                  />
                </Field>
                <Field label={tPages("productStock")}>
                  <Input
                    type="number"
                    min={0}
                    value={form.stock}
                    onChange={(e) =>
                      setForm({ ...form, stock: e.target.value })
                    }
                    className={cn(numClass, fieldControlClass)}
                    disabled
                    title={tPages("productStockNewTitle")}
                    onKeyDown={handleKeyDown}
                  />
                </Field>
                <Field label={tPages("productPrepaymentTypeLabel")}>
                  <Select
                    value={form.prepayment_type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        prepayment_type: e.target.value as
                          | "none"
                          | "delivery_only"
                          | "full",
                      })
                    }
                    className={fieldControlClass}
                  >
                    <option value="none">
                      {tPages("productPrepaymentTypeNone")}
                    </option>
                    <option value="delivery_only">
                      {tPages("productPrepaymentTypeDeliveryOnly")}
                    </option>
                    <option value="full">
                      {tPages("productPrepaymentTypeFull")}
                    </option>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {tPages("productPrepaymentTypeHelp")}
                  </p>
                </Field>
              </div>
            </CardContent>
          </Card>

          {/* Extra Fields (JSONB) */}
          {extraFieldsSchema.some((f) => f.name.trim()) && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-foreground">
                  {tPages("productExtraFields")}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {tPages("productExtraFieldsHintNew")}
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
                {tPages("productUploadImage")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {tPages("productUploadHintNew", { max: MAX_IMAGES })}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-square w-full overflow-hidden rounded-card p-3">
                {bigPreviewUrl ? (
                  <div className="relative h-full w-full overflow-hidden rounded-ui border border-border/70 bg-card">
                    <img
                      src={bigPreviewUrl}
                      alt={tPages("productPreviewAlt")}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <label
                    className={cn(
                      "flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-ui border border-dashed bg-card text-center text-muted-foreground transition-colors hover:text-foreground",
                      mainImageDragging
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-primary/35 hover:border-primary/60",
                    )}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setMainImageDragging(true);
                    }}
                    onDragEnter={() => setMainImageDragging(true)}
                    onDragLeave={(e) => {
                      if (e.currentTarget === e.target) setMainImageDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setMainImageDragging(false);
                      const file = e.dataTransfer.files?.[0] ?? null;
                      if (!file || !canAddMore) return;
                      setImageFiles((prev) => {
                        const next = [...prev];
                        next[0] = file;
                        return next;
                      });
                      void uploadSlotFile(0, file);
                      setSelectedImageIndex(0);
                    }}
                  >
                    <span className="rounded-ui bg-primary/10 p-2 text-primary">
                      <ImageIcon className="size-6" />
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      Drop your image here, or{" "}
                      <span className="text-primary underline underline-offset-2">browse</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Supports: JPG, JPEG2000, PNG
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
                        void uploadSlotFile(0, file);
                        setSelectedImageIndex(0);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
              {imageFiles.some(Boolean) && (
                <div className="px-3">
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
                        setImageKeys((prev) => prev.map((k, i) => (i === idx ? null : k)));
                        setImagePreviews((prev) => prev.map((u, i) => (i === idx ? null : u)));
                        setUploadStatus((prev) => prev.map((s, i) => (i === idx ? "idle" : s)));
                        setUploadProgress((prev) => prev.map((p, i) => (i === idx ? 0 : p)));
                        setUploadErrors((prev) => prev.map((e, i) => (i === idx ? null : e)));
                        const nextFilled = imagePreviews
                          .map((u, i) => (u && i !== idx ? i : -1))
                          .filter((i) => i >= 0)[0];
                        setSelectedImageIndex(nextFilled ?? null);
                      }
                    }}
                    className="w-full border-destructive/30 text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                  >
                    {tPages("productRemoveSelectedImage")}
                  </Button>
                </div>
              )}
              <div
                className="mt-3 flex gap-2 overflow-x-auto px-3 pb-3 sm:flex-wrap sm:overflow-visible sm:px-3 sm:pb-0"
                role="list"
                aria-label={tPages("productImagesAria")}
              >
                {Array.from({ length: MAX_IMAGES }, (_, i) => (
                  <div
                    key={i}
                    className={`relative aspect-square w-16 shrink-0 snap-start overflow-hidden rounded-card border border-dashed border-border bg-muted/30 ${
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
                          aria-label={tPages("productShowImageInPreview", { n: i + 1 })}
                        >
                          <img
                            src={imagePreviews[i]!}
                            alt={tPages("productThumbnailN", { n: i + 1 })}
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
                            setImageKeys((prev) => prev.map((k, j) => (j === i ? null : k)));
                            setImagePreviews((prev) => prev.map((u, j) => (j === i ? null : u)));
                            setUploadStatus((prev) => prev.map((s, j) => (j === i ? "idle" : s)));
                            setUploadProgress((prev) => prev.map((p, j) => (j === i ? 0 : p)));
                            setUploadErrors((prev) => prev.map((e, j) => (j === i ? null : e)));
                            if (selectedImageIndex === i) {
                              const nextFilled = imagePreviews
                                .map((u, j) => (u && j !== i ? j : -1))
                                .filter((j) => j >= 0)[0];
                              setSelectedImageIndex(nextFilled ?? null);
                            }
                          }}
                          className="absolute right-1 top-1 rounded-full bg-destructive/90 p-0.5 text-primary-foreground hover:bg-destructive"
                          aria-label={tPages("productRemoveImageN", { n: i + 1 })}
                        >
                          <X className="size-3" />
                        </button>
                      </>
                    ) : (
                      <label
                        className={`flex h-full w-full cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-foreground ${
                          i > 0 && !hasMainImage ? "cursor-not-allowed opacity-50" : ""
                        }`}
                        title={
                          i > 0 && !hasMainImage ? tPages("productAddMainFirst") : undefined
                        }
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
                            void uploadSlotFile(i, file);
                            setSelectedImageIndex(i);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>
              {(uploadStatus[selectedImageIndex ?? 0] !== "idle" || uploadErrors[selectedImageIndex ?? 0]) && (
                <div className="px-3 text-xs text-muted-foreground">
                  {uploadStatus[selectedImageIndex ?? 0] === "uploading" && (
                    <span className="inline-flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> Uploading {uploadProgress[selectedImageIndex ?? 0]}%</span>
                  )}
                  {uploadStatus[selectedImageIndex ?? 0] === "uploaded" && (
                    <span className="inline-flex items-center gap-1"><Check className="size-3" /> Replace</span>
                  )}
                  {uploadStatus[selectedImageIndex ?? 0] === "error" && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-destructive underline"
                      onClick={() => {
                        const idx = selectedImageIndex ?? 0;
                        const file = imageFiles[idx];
                        if (file) void uploadSlotFile(idx, file);
                      }}
                    ><AlertCircle className="size-3" /> Failed. Retry</button>
                  )}
                  {uploadErrors[selectedImageIndex ?? 0] && (
                    <p className="mt-1 text-destructive">{uploadErrors[selectedImageIndex ?? 0]}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-foreground">
                {tPages("productCategoryCard")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label={tPages("productCategoryLabel")} required>
                <Select
                  required
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className={fieldControlClass}
                >
                  <option value="">{tPages("productSelectCategory")}</option>
                  {categorySelectOptions.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button variant="outline" className="w-full gap-2" asChild>
                <Link href="/categories">
                  <Plus className="size-4" />
                  {tPages("productAddCategory")}
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
