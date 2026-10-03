"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { ClickableText } from "@/components/ui/clickable-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEnterNavigation } from "@/hooks/useEnterNavigation";
import type { AdminBrand } from "@/types";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { notify } from "@/notifications";
import { buildPublicMediaUrlFromKey, uploadFile } from "@/hooks/usePresignedUpload";
import { brandsQueryKey } from "@/lib/query-keys";
import { useBrandsQuery } from "@/hooks/useBrandsQuery";
import { useOpenFromAddress } from "@/hooks/useOpenFromAddress";
import { PageHeader } from "@/components/page/PageHeader";

type FormMode = "closed" | "new" | "edit";

type BrandForm = {
  name: string;
  description: string;
  is_active: boolean;
};

const emptyForm: BrandForm = { name: "", description: "", is_active: true };

function tempUploadId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? `brd_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`
    : `brd_${Date.now()}`;
}

/**
 * The shop's brands.
 *
 * A brand used to be a line of text typed on each product, which meant *Bata*,
 * *bata* and *BATA* were three brands and nothing said so. Here they are rows:
 * one name, one picture, one description, and a page of their own in the shop.
 *
 * A shop that sells only its own goods never opens this tab, and its storefront
 * is unchanged -- the brand pages and the footer link are drawn from the brands
 * that exist. That is what makes the feature optional without a switch.
 */
export default function BrandsPage() {
  const tPages = useTranslations("pages");
  const tHints = useTranslations("pageHints");
  const tCommon = useTranslations("common");
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useBrandsQuery();
  const brands = data ?? [];

  // A search result names the brand to open (`?open=`).
  useOpenFromAddress(!isLoading, (publicId) => {
    const brand = brands.find((row) => row.public_id === publicId);
    if (brand) openEdit(brand);
    return Boolean(brand);
  });

  // Only this key: no nav badge counts brands, and the product form reads the
  // same cache, so one invalidation keeps both screens honest.
  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: brandsQueryKey });
  }, [queryClient]);

  useEffect(() => {
    if (!isError || !error) return;
    notify.error(error, {
      title: tPages("toastTitleBrandsUnavailable"),
      fallbackMessage: tPages("toastDescBrandsUnavailable"),
    });
  }, [isError, error, tPages]);

  const [mode, setMode] = useState<FormMode>("closed");
  const [editingPublicId, setEditingPublicId] = useState<string | null>(null);
  const [form, setForm] = useState<BrandForm>(emptyForm);
  const [editingSlugPreview, setEditingSlugPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "uploaded" | "error">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const tempUploadIdRef = useRef<string>(tempUploadId());
  const { handleKeyDown } = useEnterNavigation(() => formRef.current?.requestSubmit());

  function resetImage() {
    setImageFile(null);
    setImageKey(null);
    setImagePreviewUrl(null);
    setUploadStatus("idle");
    setUploadProgress(0);
    setUploadError(null);
  }

  async function handleImageSelect(file: File | null) {
    if (!file) {
      resetImage();
      return;
    }
    setImageFile(file);
    setUploadStatus("uploading");
    setUploadProgress(0);
    setUploadError(null);
    try {
      const { key } = await uploadFile(file, {
        entity: "brand",
        entityPublicId: editingPublicId || tempUploadIdRef.current,
        onProgress: (percent) => setUploadProgress(percent),
      });
      setImageKey(key);
      setImagePreviewUrl(buildPublicMediaUrlFromKey(key));
      setUploadStatus("uploaded");
    } catch (err) {
      setUploadStatus("error");
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  function openNew() {
    setMode("new");
    tempUploadIdRef.current = tempUploadId();
    setEditingPublicId(null);
    setEditingSlugPreview(null);
    setForm(emptyForm);
    resetImage();
  }

  function openEdit(brand: AdminBrand) {
    setMode("edit");
    setEditingPublicId(brand.public_id);
    setEditingSlugPreview(brand.slug);
    setForm({
      name: brand.name,
      description: brand.description,
      is_active: brand.is_active,
    });
    resetImage();
  }

  function closeForm() {
    setMode("closed");
    setEditingSlugPreview(null);
  }

  async function saveBrand(e: FormEvent) {
    e.preventDefault();
    // A half-finished upload would save a brand pointing at nothing.
    if (uploadStatus === "uploading" || (imageFile && !imageKey)) {
      notify.warning(tPages("toastDescUploadsStillInProgressBrand"), {
        title: tPages("toastTitleUploadsStillInProgress"),
      });
      return;
    }
    setSaving(true);
    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("description", form.description);
    fd.append("is_active", String(form.is_active));
    if (imageKey) fd.append("image_key", imageKey);
    try {
      if (mode === "edit" && editingPublicId) {
        await api.patch(`admin/brands/${editingPublicId}/`, fd);
      } else {
        await api.post("admin/brands/", fd);
      }
      closeForm();
      invalidate();
    } catch (err) {
      notify.error(err, {
        title: tPages("toastTitleBrandChangeFailed"),
        fallbackMessage: tPages("toastDescBrandChangeFailed"),
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteBrand(brand: AdminBrand) {
    const ok = await confirm({
      title: tPages("confirmDialogTitleDeleteBrand"),
      // Says the number out loud, because this is the only thing a merchant
      // needs to weigh: the products live on, they just stop having a brand.
      message: tPages("brandsConfirmDelete", { count: brand.product_count }),
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`admin/brands/${brand.public_id}/`);
      if (editingPublicId === brand.public_id) closeForm();
      invalidate();
    } catch (err) {
      notify.error(err, {
        title: tPages("toastTitleBrandChangeFailed"),
        fallbackMessage: tPages("toastDescBrandChangeFailed"),
      });
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title={tPages("brandsTitle")} hint={tHints("brands")}>
        <button
          type="button"
          onClick={openNew}
          className="rounded-card bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {tPages("brandsAdd")}
        </button>
        {mode !== "closed" ? (
          <button
            type="button"
            onClick={closeForm}
            className="rounded-card border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
          >
            {tPages("brandsCancelForm")}
          </button>
        ) : null}
      </PageHeader>

      {mode !== "closed" ? (
        <form
          ref={formRef}
          onSubmit={saveBrand}
          className="space-y-3 rounded-card border border-primary/30 bg-primary/5 p-4"
        >
          <p className="text-sm font-medium text-primary">
            {mode === "edit" ? tPages("brandsEditBrand") : tPages("brandsNewBrand")}
          </p>
          <div className="space-y-1">
            <Input
              required
              placeholder={tPages("brandsPlaceholderName")}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="max-w-xl"
              onKeyDown={handleKeyDown}
            />
            <p className="text-xs text-muted-foreground">
              {mode === "edit" && editingSlugPreview
                ? tPages("brandsSlugEditHint", { slug: editingSlugPreview })
                : tPages("brandsSlugAutoHint")}
            </p>
          </div>
          <Input
            placeholder={tPages("brandsPlaceholderDescription")}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            onKeyDown={handleKeyDown}
          />
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => void handleImageSelect(e.target.files?.[0] ?? null)}
              className="form-file-input"
              onKeyDown={handleKeyDown}
              disabled={saving || uploadStatus === "uploading"}
            />
            {imagePreviewUrl && (
              <img
                src={imagePreviewUrl}
                alt={form.name || tPages("brandsColLogo")}
                className="h-12 w-12 rounded object-contain"
              />
            )}
            <div className="text-xs text-muted-foreground">
              {uploadStatus === "uploading" && (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" /> {tPages("brandsUploading", { percent: uploadProgress })}
                </span>
              )}
              {uploadStatus === "uploaded" && (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="size-3" /> {tPages("brandsUploadReplace")}
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
                  <AlertCircle className="size-3" /> {tPages("brandsUploadRetry")}
                </button>
              )}
              {uploadError && <p className="text-destructive">{uploadError}</p>}
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="form-checkbox"
                onKeyDown={handleKeyDown}
              />{" "}
              {tPages("brandsActiveLabel")}
            </label>
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              loading={saving}
              disabled={saving || uploadStatus === "uploading"}
              className="inline-flex items-center gap-2 rounded-card bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {tCommon("save")}
            </Button>
          </div>
        </form>
      ) : null}

      <section>
        <h2 className="mb-4 text-lg font-medium text-foreground">
          {tPages("brandsListHeading", { count: brands.length })}
        </h2>
        <div className="overflow-x-auto rounded-card border border-card-border bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="th">{tPages("brandsColLogo")}</th>
                <th className="th">{tPages("brandsColName")}</th>
                <th className="th">{tPages("brandsColSlug")}</th>
                <th className="th">{tPages("brandsColProducts")}</th>
                <th className="th">{tPages("brandsColStatus")}</th>
                <th className="th">{tPages("brandsColActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    {tCommon("loading")}
                  </td>
                </tr>
              ) : brands.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    {tPages("brandsEmpty")}
                  </td>
                </tr>
              ) : (
                brands.map((brand) => (
                  <ClickableTableRow
                    key={brand.public_id}
                    onNavigate={() => openEdit(brand)}
                    aria-label={brand.name}
                  >
                    <td className="px-4 py-3">
                      {brand.image ? (
                        <img
                          src={brand.image}
                          alt={brand.name}
                          className="h-8 w-8 rounded object-contain"
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-foreground">
                      {brand.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {brand.slug}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-foreground">
                      {brand.product_count}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ActiveBadge
                        active={brand.is_active}
                        activeLabel={tCommon("active")}
                        inactiveLabel={tCommon("inactive")}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ClickableText
                        variant="destructive"
                        onClick={() => deleteBrand(brand)}
                        className="shrink-0 text-sm whitespace-nowrap"
                      >
                        {tCommon("delete")}
                      </ClickableText>
                    </td>
                  </ClickableTableRow>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ActiveBadge({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-tooltip px-2.5 py-0.5 text-xs font-semibold ${
        active ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"
      }`}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}
