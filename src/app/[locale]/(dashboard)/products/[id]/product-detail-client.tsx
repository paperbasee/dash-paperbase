"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useParams, usePathname } from "next/navigation";
import { ImageIcon, Undo2, Plus, X } from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClickableText } from "@/components/ui/clickable-text";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ExtraFieldsFormSection } from "@/components/ExtraFieldsFormSection";
import { useExtraFieldsSchema } from "@/hooks/useExtraFieldsSchema";
import type { ExtraFieldValues } from "@/types/extra-fields";
import type { Product, AdminCategoryTreeNode } from "@/types";
import { flattenCategoryOptions } from "@/lib/category-tree";
import { MAX_PRODUCT_IMAGES } from "@/lib/product-media";
import {
  parseValidation,
  productUpdateSchema,
  slugFromName,
  validateRequiredExtraFields,
} from "@/lib/validation";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { notify } from "@/notifications";
import { useAdminDeleteCapabilities } from "@/hooks/useAdminDeleteCapabilities";
import { numberTextClass } from "@/lib/number-font";
import { cn } from "@/lib/utils";

const MAX_IMAGES = MAX_PRODUCT_IMAGES;

function galleryPublicIdsPerSlot(p: Product | null): (string | null)[] {
  const arr: (string | null)[] = Array(MAX_IMAGES).fill(null);
  if (!p?.images?.length) return arr;
  const sorted = p.images.slice().sort((a, b) => a.order - b.order);
  for (let j = 0; j < sorted.length && j < MAX_IMAGES - 1; j++) {
    arr[j + 1] = sorted[j].public_id;
  }
  return arr;
}

function formatApiValidationError(data: unknown, fallback: string): string {
  if (data == null) return fallback;
  if (typeof data === "string") return data;
  if (typeof data !== "object") return fallback;
  const o = data as Record<string, unknown>;
  if (typeof o.detail === "string") return o.detail;
  if (Array.isArray(o.detail) && o.detail.length > 0) {
    const first = o.detail[0];
    if (typeof first === "string") return first;
  }
  for (const [key, val] of Object.entries(o)) {
    if (key === "detail") continue;
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === "string") {
      return val[0];
    }
    if (typeof val === "string") return val;
  }
  return fallback;
}

function findCategoryLabel(
  tree: AdminCategoryTreeNode[],
  publicId: string
): string | null {
  for (const node of tree) {
    if (node.public_id === publicId) return node.name;
    if (node.children?.length) {
      const found = findCategoryLabel(node.children, publicId);
      if (found) return found;
    }
  }
  return null;
}

export default function ProductDetailClient() {
  const pathname = usePathname();
  const isEditMode = pathname.replace(/\/$/, "").endsWith("/edit");

  const { id: product_public_id } = useParams<{ locale: string; id: string }>();
  const router = useRouter();
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const [product, setProduct] = useState<Product | null>(null);
  const [categoryTree, setCategoryTree] = useState<AdminCategoryTreeNode[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { canDelete: canDeleteProduct, isSuperuser: deleteIsSuperuser } =
    useAdminDeleteCapabilities();
  const confirm = useConfirm();
  const [deleting, setDeleting] = useState(false);

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
  const [imageFileUrls, setImageFileUrls] = useState<(string | null)[]>(
    () => Array(MAX_IMAGES).fill(null)
  );
  const [removeImage, setRemoveImage] = useState(false);
  const [removedGalleryPublicIds, setRemovedGalleryPublicIds] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(0);
  const [mainImageDragging, setMainImageDragging] = useState(false);
  const [resolvedSlug, setResolvedSlug] = useState("");
  const [slugUsesFallback, setSlugUsesFallback] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);

  const existingImageUrls = useMemo(() => {
    if (!product) return Array(MAX_IMAGES).fill(null) as (string | null)[];
    const main = product.image_url ?? product.image ?? null;
    const gallery =
      product.images?.slice().sort((a, b) => a.order - b.order).map((i) => i.image) ?? [];
    const arr: (string | null)[] = [main, ...gallery.slice(0, MAX_IMAGES - 1)];
    while (arr.length < MAX_IMAGES) arr.push(null);
    return arr.slice(0, MAX_IMAGES);
  }, [product]);

  const galleryIdsBySlot = useMemo(() => galleryPublicIdsPerSlot(product), [product]);

  const imagePreviews = useMemo(() => {
    return Array.from({ length: MAX_IMAGES }, (_, i) => {
      if (imageFileUrls[i]) return imageFileUrls[i];
      if (i === 0 && removeImage) return null;
      const gid = galleryIdsBySlot[i];
      if (i > 0 && gid && removedGalleryPublicIds.includes(gid)) return null;
      return existingImageUrls[i] ?? null;
    });
  }, [
    imageFileUrls,
    removeImage,
    removedGalleryPublicIds,
    existingImageUrls,
    galleryIdsBySlot,
  ]);

  const firstFilledIndex = imagePreviews.findIndex(Boolean);
  const bigPreviewUrl =
    selectedImageIndex !== null && imagePreviews[selectedImageIndex]
      ? imagePreviews[selectedImageIndex]
      : firstFilledIndex >= 0
        ? imagePreviews[firstFilledIndex]
        : null;
  const hasMainImage = Boolean(
    imageFiles[0] || (existingImageUrls[0] && !removeImage)
  );
  const canAddMore = imagePreviews.filter(Boolean).length < MAX_IMAGES;
  const canAddToGallery = hasMainImage && canAddMore;
  const baseSlug = slugFromName(form.name);

  useEffect(() => {
    setRemoveImage(false);
    setRemovedGalleryPublicIds([]);
    setImageFiles(Array(MAX_IMAGES).fill(null));
    setError("");
    setExtraFieldsErrors({});
  }, [isEditMode, product_public_id]);

  useEffect(() => {
    Promise.all([
      api.get<Product>(`admin/products/${product_public_id}/`),
      api.get<AdminCategoryTreeNode[]>("admin/categories/?tree=1"),
    ])
      .then(([prodRes, treeRes]) => {
        const p = prodRes.data;
        const d = treeRes.data;
        setProduct(p);
        setCategoryTree(Array.isArray(d) ? d : []);
        const catRef = p.category ?? p.category_public_id ?? "";
        setForm({
          name: p.name,
          brand: p.brand ?? "",
          price: p.price,
          original_price: p.original_price ?? "",
          category: String(catRef),
          description: p.description ?? "",
          stock: String(p.available_quantity ?? p.total_stock ?? ""),
          is_active: p.is_active,
          prepayment_type: (p.prepayment_type ?? "none") as
            | "none"
            | "delivery_only"
            | "full",
        });
        setExtraFields(
          typeof p.extra_data === "object" && p.extra_data !== null
            ? (p.extra_data as ExtraFieldValues)
            : {}
        );
      })
      .catch((err) => {
        console.error(err);
        notify.error(err);
      })
      .finally(() => setLoading(false));
  }, [product_public_id]);

  const categorySelectOptions = useMemo(
    () => flattenCategoryOptions(categoryTree),
    [categoryTree]
  );

  const categoryDisplayName = useMemo(() => {
    if (!product) return "";
    if (product.category_name?.trim()) return product.category_name;
    const ref = product.category ?? product.category_public_id ?? "";
    if (ref) {
      const fromTree = findCategoryLabel(categoryTree, ref);
      if (fromTree) return fromTree;
    }
    return categorySelectOptions.find((c) => c.value === form.category)?.label ?? "—";
  }, [product, categoryTree, categorySelectOptions, form.category]);

  useEffect(() => {
    const urls = imageFiles.map((f) => (f ? URL.createObjectURL(f) : null));
    setImageFileUrls(urls);
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
  }, [imageFiles]);

  useEffect(() => {
    if (!isEditMode) {
      setResolvedSlug("");
      setSlugUsesFallback(false);
      setSlugChecking(false);
      return;
    }
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
              `admin/products/check-slug/?slug=${encodeURIComponent(candidate)}&exclude_public_id=${encodeURIComponent(product_public_id)}`
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
  }, [isEditMode, baseSlug, product_public_id]);

  const clearSlot = useCallback((i: number) => {
    if (i === 0) {
      setRemoveImage(true);
    } else {
      const gid = galleryPublicIdsPerSlot(product)[i];
      if (gid) {
        setRemovedGalleryPublicIds((prev) =>
          prev.includes(gid) ? prev : [...prev, gid]
        );
      }
    }
    setImageFiles((prev) => {
      const next = [...prev];
      next[i] = null;
      return next;
    });
    setSelectedImageIndex((cur) => {
      if (cur !== i) return cur;
      const nextFilled = imagePreviews
        .map((u, j) => (u && j !== i ? j : -1))
        .filter((j) => j >= 0)[0];
      return nextFilled ?? null;
    });
  }, [product, imagePreviews]);

  const onPickFile = useCallback((i: number, file: File | null) => {
    if (!file) return;
    if (i === 0) {
      setRemoveImage(false);
    } else {
      const gid = galleryPublicIdsPerSlot(product)[i];
      if (gid) {
        setRemovedGalleryPublicIds((prev) => prev.filter((x) => x !== gid));
      }
    }
    setImageFiles((prev) => {
      const next = [...prev];
      next[i] = file;
      return next;
    });
    setSelectedImageIndex(i);
  }, [product]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isEditMode || !product) return;

    const formValidation = parseValidation(productUpdateSchema, form);
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

    setSaving(true);
    setError("");

    const formData = new FormData();
    const normalizedBrand = form.brand.trim();
    formData.append("name", form.name);
    formData.append("brand", normalizedBrand);
    formData.append("price", form.price);
    formData.append("original_price", form.original_price.trim());
    formData.append("category", form.category);
    formData.append("description", form.description);
    formData.append("is_active", String(form.is_active));
    formData.append("prepayment_type", form.prepayment_type);
    const mainFile = imageFiles[0];
    if (mainFile) formData.append("image", mainFile);
    if (removeImage) formData.append("remove_image", "true");
    if (Object.keys(extraFields).length > 0) {
      formData.append("extra_data", JSON.stringify(extraFields));
    }

    const galleryIdsBeforeSave = galleryPublicIdsPerSlot(product);

    try {
      const { data } = await api.patch(`admin/products/${product_public_id}/`, formData);

      for (const pid of removedGalleryPublicIds) {
        await api.delete(`admin/product-images/${pid}/`);
      }

      for (let i = 1; i < MAX_IMAGES; i++) {
        const file = imageFiles[i];
        if (!file) continue;
        const previousId = galleryIdsBeforeSave[i];
        if (previousId) {
          await api.delete(`admin/product-images/${previousId}/`);
        }
        const galleryData = new FormData();
        galleryData.append("product_public_id", product_public_id);
        galleryData.append("image", file);
        galleryData.append("order", String(i));
        await api.post("admin/product-images/", galleryData);
      }

      setProduct(data);
      setRemoveImage(false);
      setRemovedGalleryPublicIds([]);
      setImageFiles(Array(MAX_IMAGES).fill(null));
      router.push(`/products/${product_public_id}`);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: unknown } }).response?.data
          : null;
      let text = formatApiValidationError(message, tPages("productUpdateFailed"));
      if (
        message &&
        typeof message === "object" &&
        "slug" in message &&
        Array.isArray((message as { slug: unknown }).slug)
      ) {
        text = (message as { slug: string[] }).slug[0] ?? text;
      }
      setError(text || tPages("productUpdateFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProduct() {
    const ok = await confirm({
      title: tPages("confirmDialogTitleDeleteProduct"),
      message: deleteIsSuperuser
        ? tPages("productDetailConfirmDeletePermanent")
        : tPages("productDetailConfirmDeleteTrash"),
      variant: "danger",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await api.delete(`admin/products/${product_public_id}/`);
      router.push("/products");
    } catch (err) {
      console.error(err);
      notify.error(err);
    } finally {
      setDeleting(false);
    }
  }

  const fieldControlClass = "w-full rounded-card bg-muted/50";

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
        <p className="text-muted-foreground">{tPages("productNotFound")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-card bg-muted/80 px-1 py-1 hidden md:block">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label={tPages("productBackAria")}
              className="flex items-center justify-center rounded-ui p-1 text-muted-foreground hover:bg-muted"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          </div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {isEditMode ? tPages("productEditTitle") : tPages("productDetailsTitle")}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canDeleteProduct && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={deleting || saving}
              onClick={() => void handleDeleteProduct()}
              className="rounded-card border-destructive text-destructive hover:bg-destructive/10"
            >
              {deleting ? tPages("deleting") : tPages("productDetailDeleteProduct")}
            </Button>
          )}
          {!isEditMode && (
            <Button type="button" className="gap-2" asChild>
              <Link href={`/products/${product_public_id}/edit`}>
                {tPages("productEditProductButton")}
              </Link>
            </Button>
          )}
          {isEditMode && (
            <Button type="submit" form="product-form" disabled={saving} className="gap-2">
              {saving ? tPages("productSavingButton") : tPages("productSaveChanges")}
            </Button>
          )}
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

      {isEditMode ? (
        <form
          id="product-form"
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-6 lg:grid-cols-3"
        >
          <div className="space-y-6 lg:col-span-2">
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
                  />
                </Field>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) =>
                      setForm({ ...form, is_active: e.target.checked })
                    }
                    className="form-checkbox"
                  />
                  <span className="text-sm font-medium text-foreground">
                    {tPages("productActiveVisible")}
                  </span>
                </label>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-foreground">
                  {tPages("productPricingStock")}
                </CardTitle>
                {product.variant_count != null && product.variant_count > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {tPages("productEditVariantDescription", {
                      count: product.variant_count,
                      total: product.total_stock ?? product.available_quantity ?? 0,
                    })}{" "}
                    <ClickableText
                      href={`/variants?product_public_id=${encodeURIComponent(product_public_id)}`}
                      className="underline-offset-2"
                    >
                      {tPages("productEditManageVariants")}
                    </ClickableText>
                    .
                  </p>
                )}
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
                    />
                  </Field>
                  <Field label={tPages("productStockInventoryDerived")}>
                    <Input
                      type="number"
                      min={0}
                      value={form.stock}
                      readOnly
                      className={cn(numClass, fieldControlClass)}
                      disabled
                      title={tPages("productStockManagedInventory")}
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

            {(extraFieldsSchema.some((f) => f.name.trim()) ||
              (product.extra_data &&
                typeof product.extra_data === "object" &&
                Object.keys(product.extra_data).length > 0)) && (
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-foreground">
                    {tPages("productExtraFields")}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {tPages("productExtraFieldsHintEdit")}
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
                          {tPages("productSavedExtraDataTitle")}
                        </p>
                        <dl className="grid gap-2 text-sm sm:grid-cols-2">
                          {Object.entries(product.extra_data).map(([k, v]) => (
                            <div
                              key={k}
                              className="rounded-card border border-border/60 bg-muted/20 px-3 py-2"
                            >
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

          <div className="space-y-6 lg:col-span-1">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-foreground">
                  {tPages("productUploadImage")}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {tPages("productUploadHintEdit", { max: MAX_IMAGES })}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-square w-full overflow-hidden rounded-card p-3">
                  {bigPreviewUrl ? (
                    <div className="relative h-full w-full overflow-hidden rounded-ui border border-border/70 bg-card">
                      <img
                        key={`main-${product?.updated_at ?? product?.public_id ?? "new"}`}
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
                        onPickFile(0, file);
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
                          onPickFile(0, file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
                {imagePreviews.some(Boolean) && (
                  <div className="px-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const idx = selectedImageIndex ?? firstFilledIndex;
                        if (idx >= 0) clearSlot(idx);
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
                              key={`slot-${i}-${product?.updated_at ?? ""}`}
                              src={imagePreviews[i]!}
                              alt={tPages("productThumbnailN", { n: i + 1 })}
                              className="h-full w-full object-cover"
                            />
                          </button>
                          <button
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              clearSlot(i);
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
                              onPickFile(i, file);
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
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-foreground">
                  {tPages("productGeneralInformation")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">{tPages("productNameLabel")}</p>
                  <p className="font-medium text-foreground">{product.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {tPages("productSlugPrefix")}{" "}
                    <span className="font-mono">{product.slug}</span>
                  </p>
                </div>
                {product.description ? (
                  <div>
                    <p className="text-xs text-muted-foreground">{tPages("productDescription")}</p>
                    <p className="whitespace-pre-wrap text-foreground">{product.description}</p>
                  </div>
                ) : null}
                <div>
                  <p className="text-xs text-muted-foreground">{tPages("productBrand")}</p>
                  <p className="text-foreground">{product.brand?.trim() || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{tPages("productActiveVisible")}</p>
                  <p className="text-foreground">
                    {product.is_active ? tCommon("yes") : tCommon("no")}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-foreground">
                  {tPages("productPricingStock")}
                </CardTitle>
                {product.variant_count != null && product.variant_count > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {tPages("productEditVariantDescription", {
                      count: product.variant_count,
                      total: product.total_stock ?? product.available_quantity ?? 0,
                    })}{" "}
                    <ClickableText
                      href={`/variants?product_public_id=${encodeURIComponent(product_public_id)}`}
                      className="underline-offset-2"
                    >
                      {tPages("productEditManageVariants")}
                    </ClickableText>
                    .
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">{tPages("productBasePrice")}</p>
                    <p className={cn("font-medium text-foreground", numClass)}>{product.price}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{tPages("productCompareAt")}</p>
                    <p className={cn("text-foreground", numClass)}>
                      {product.original_price?.trim() || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {tPages("productStockInventoryDerived")}
                    </p>
                    <p className={cn("text-foreground", numClass)}>
                      {product.available_quantity ?? product.total_stock ?? form.stock}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {tPages("productPrepaymentTypeLabel")}
                    </p>
                    <p className="text-foreground">
                      {(product.prepayment_type ?? "none") === "delivery_only"
                        ? tPages("productPrepaymentTypeDeliveryOnly")
                        : (product.prepayment_type ?? "none") === "full"
                          ? tPages("productPrepaymentTypeFull")
                          : tPages("productPrepaymentTypeNone")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {product.extra_data &&
              typeof product.extra_data === "object" &&
              Object.keys(product.extra_data).length > 0 && (
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold text-foreground">
                      {tPages("productExtraFields")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid gap-2 text-sm sm:grid-cols-2">
                      {Object.entries(product.extra_data).map(([k, v]) => (
                        <div
                          key={k}
                          className="rounded-card border border-border/60 bg-muted/20 px-3 py-2"
                        >
                          <dt className="text-xs text-muted-foreground">{k}</dt>
                          <dd className="font-medium text-foreground break-words">
                            {typeof v === "object" ? JSON.stringify(v) : String(v)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </CardContent>
                </Card>
              )}
          </div>

          <div className="space-y-6 lg:col-span-1">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-foreground">
                  {tPages("productDetailsImagesTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-square w-full overflow-hidden rounded-card bg-muted/50">
                  {bigPreviewUrl ? (
                    <img
                      key={`view-main-${product?.updated_at ?? product?.public_id ?? ""}`}
                      src={bigPreviewUrl}
                      alt={tPages("productPreviewAlt")}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                      {tPages("productNoImages")}
                    </div>
                  )}
                </div>
                <div
                  className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 sm:flex-wrap sm:pb-0 sm:mx-0 sm:px-0"
                  role="list"
                  aria-label={tPages("productImagesAria")}
                >
                  {Array.from({ length: MAX_IMAGES }, (_, i) =>
                    imagePreviews[i] ? (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedImageIndex(i)}
                        className={`relative aspect-square w-16 shrink-0 overflow-hidden rounded-card border border-border ${
                          (selectedImageIndex ?? firstFilledIndex) === i ? "ring-2 ring-primary" : ""
                        }`}
                        aria-label={tPages("productShowImageInPreview", { n: i + 1 })}
                      >
                        <img
                          key={`view-thumb-${i}-${product?.updated_at ?? ""}`}
                          src={imagePreviews[i]!}
                          alt={tPages("productThumbnailN", { n: i + 1 })}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ) : null
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-foreground">
                  {tPages("productCategoryCard")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{tPages("productCategoryLabel")}</p>
                <p className="font-medium text-foreground">{categoryDisplayName}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
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
