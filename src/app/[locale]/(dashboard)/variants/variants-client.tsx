"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Plus, Undo2 } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterBar } from "@/components/filters/FilterBar";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { ClickableText } from "@/components/ui/clickable-text";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ProductAttributeAdmin, ProductVariant } from "@/types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useFilters } from "@/hooks/useFilters";
import {
  useProductVariantsQuery,
  useVariantAttributesQuery,
  useVariantProductQuery,
  useVariantSearchQuery,
} from "@/hooks/useVariantsQuery";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { notify } from "@/notifications";
import { numberTextClass } from "@/lib/number-font";
import { cn } from "@/lib/utils";
import { useEnterNavigation } from "@/hooks/useEnterNavigation";
import {
  patchVariantInCaches,
  variantMutationInvalidationKeys,
} from "@/lib/variants/variants-queries";
import { toLocaleDigits } from "@/lib/locale-digits";
import { VariantProductPicker } from "./variant-product-picker";

type VariantForm = {
  price_override: string;
  price_note: string;
  is_active: boolean;
  /** one value public_id per attribute (or empty) */
  picks: Record<string, string>;
};

const emptyForm = (attrs: ProductAttributeAdmin[]): VariantForm => {
  const picks: Record<string, string> = {};
  for (const a of attrs) picks[a.public_id] = "";
  return {
    price_override: "",
    price_note: "",
    is_active: true,
    picks,
  };
};

/** Clears scroll/pointer locks that can linger after client navigation (Radix / Base UI). */
function unlockDocumentScroll() {
  const html = document.documentElement;
  const body = document.body;
  for (const c of [...body.classList]) {
    if (c.startsWith("block-interactivity-")) body.classList.remove(c);
  }
  if (html.hasAttribute("data-base-ui-scroll-locked")) {
    html.removeAttribute("data-base-ui-scroll-locked");
    html.style.removeProperty("overflow");
    html.style.removeProperty("overflow-x");
    html.style.removeProperty("overflow-y");
    html.style.removeProperty("scrollbar-gutter");
    html.style.removeProperty("scroll-behavior");
    body.style.removeProperty("overflow");
    body.style.removeProperty("position");
    body.style.removeProperty("height");
    body.style.removeProperty("width");
    body.style.removeProperty("box-sizing");
    body.style.removeProperty("pointer-events");
    body.style.removeProperty("scroll-behavior");
  }
}

export default function VariantsPageClient() {
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  /** After a variant change: reload what it affects, never the product picker or attributes. */
  const invalidateVariantCaches = useCallback(
    (variantProductId: string) => {
      for (const queryKey of variantMutationInvalidationKeys(variantProductId)) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
    [queryClient]
  );

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { filters, setFilter } = useFilters([
    "product_public_id",
    "search",
    "variant_status",
  ]);
  const legacyProductParam = searchParams.get("product")?.trim() || "";
  const productId =
    (filters.product_public_id || "").trim() || legacyProductParam;

  const [searchInput, setSearchInput] = useState(filters.search || "");
  const debouncedSearch = useDebouncedValue(searchInput);
  const activeSearch = debouncedSearch.trim();
  // Store-wide search: find variants by SKU/option without picking a product first.
  const storeWide = !productId && activeSearch.length > 0;
  const showList = !!productId || activeSearch.length > 0;

  const productQuery = useVariantProductQuery(productId);
  const attributesQuery = useVariantAttributesQuery();
  // When a product is chosen we load all its variants and filter client-side; otherwise the
  // search (and status filter) is sent to the backend, one page at a time, across the store.
  const productVariantsQuery = useProductVariantsQuery(productId);
  const searchQuery = useVariantSearchQuery(
    activeSearch,
    filters.variant_status || "",
    storeWide
  );
  const variantsQuery = productId ? productVariantsQuery : searchQuery;

  const attributes = attributesQuery.data ?? [];
  const searchPages = searchQuery.data?.pages;
  const variants = useMemo(
    () =>
      productId
        ? (productVariantsQuery.data ?? [])
        : storeWide
          ? (searchPages ?? []).flatMap((page) => page.results)
          : [],
    [productId, productVariantsQuery.data, storeWide, searchPages]
  );
  const searchTotal = searchPages?.[0]?.count ?? null;
  const loading = attributesQuery.isLoading;
  const variantsLoading = variantsQuery.isLoading;
  const [error, setError] = useState("");

  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<VariantForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingVariantId, setTogglingVariantId] = useState<string | null>(null);
  // Editor: hide attribute types not relevant to the variant being edited (on by
  // default). `editorScope` is the set of attribute public_ids to keep visible,
  // computed once when the editor opens so dropdowns don't shift while picking.
  // null = show all (can't infer — e.g. a product's very first variant).
  const [hideUnusedAttributes, setHideUnusedAttributes] = useState(true);
  const [editorScope, setEditorScope] = useState<Set<string> | null>(null);
  const { handleKeyDown } = useEnterNavigation(() => {
    const form = document.querySelector('form');
    if (form instanceof HTMLFormElement) form.requestSubmit();
  });

  useLayoutEffect(() => {
    unlockDocumentScroll();
  }, []);

  useEffect(() => {
    const metaError = attributesQuery.error;
    if (!metaError) return;
    notify.error(metaError, {
      title: tPages("toastTitleVariantsFailedToLoad"),
      fallbackMessage: tPages("toastDescVariantsFailedToLoad"),
    });
  }, [attributesQuery.error, tPages]);

  useEffect(() => {
    if (!variantsQuery.isError || !variantsQuery.error) return;
    notify.error(variantsQuery.error, {
      title: tPages("toastTitleVariantsFailedToLoad"),
      fallbackMessage: tPages("toastDescVariantsFailedToLoad"),
    });
  }, [variantsQuery.isError, variantsQuery.error, tPages]);

  const selectedProduct =
    productId && productQuery.data?.public_id === productId ? productQuery.data : null;

  const editingVariantSku =
    editing && editing !== "new"
      ? variants.find((v) => v.public_id === editing)?.sku
      : undefined;

  useEffect(() => {
    const next = debouncedSearch.trim();
    if (next !== searchInput.trim()) return;
    if (next === (filters.search || "")) return;
    setFilter("search", next);
  }, [debouncedSearch, searchInput, filters.search, setFilter]);

  useEffect(() => {
    setSearchInput(filters.search || "");
  }, [filters.search]);

  const filteredVariants = useMemo(() => {
    // Store-wide search results are already matched and status-filtered by the server.
    if (!productId) return variants;
    const q = activeSearch.toLowerCase();
    let rows = variants;
    if (q) {
      rows = rows.filter((v) => {
        if (v.sku.toLowerCase().includes(q)) return true;
        return (v.option_labels || []).some((l) => l.toLowerCase().includes(q));
      });
    }
    const st = filters.variant_status;
    if (st === "active") rows = rows.filter((v) => v.is_active);
    else if (st === "inactive") rows = rows.filter((v) => !v.is_active);
    return rows;
  }, [productId, variants, activeSearch, filters.variant_status]);

  // Which attribute *types* the selected product's variants actually use.
  const attributeIdByValueId = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of attributes) for (const val of a.values) m.set(val.public_id, a.public_id);
    return m;
  }, [attributes]);

  // Attribute types used across the selected product's existing variants — the
  // seed for the "new variant" editor scope.
  const usedAttributePublicIds = useMemo(() => {
    const used = new Set<string>();
    if (!productId) return used; // only meaningful when scoped to one product
    for (const v of variants) {
      for (const valId of v.attribute_value_public_ids || []) {
        const aid = attributeIdByValueId.get(valId);
        if (aid) used.add(aid);
      }
    }
    return used;
  }, [productId, variants, attributeIdByValueId]);

  // Attribute ids a given variant actually sets (its non-"None" options).
  const scopeForVariant = useCallback(
    (v: ProductVariant) => {
      const scope = new Set<string>();
      for (const valId of v.attribute_value_public_ids || []) {
        const aid = attributeIdByValueId.get(valId);
        if (aid) scope.add(aid);
      }
      return scope;
    },
    [attributeIdByValueId]
  );

  // Whether there is anything to hide (drives the toggle's visibility).
  const canToggleAttributes =
    editing !== null && editorScope !== null && editorScope.size < attributes.length;

  // Attributes shown in the editor. With hide-on, keep the opened scope plus any
  // attribute the form already has a value for (so a pick is never hidden).
  const editorAttributes = useMemo(() => {
    if (!hideUnusedAttributes || editorScope === null) return attributes;
    const picked = form
      ? new Set(
          Object.entries(form.picks)
            .filter(([, val]) => val)
            .map(([k]) => k)
        )
      : new Set<string>();
    return attributes.filter((a) => editorScope.has(a.public_id) || picked.has(a.public_id));
  }, [attributes, hideUnusedAttributes, editorScope, form]);

  function applyProductPublicIdToUrl(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("product");
    const trimmed = value.trim();
    if (trimmed) params.set("product_public_id", trimmed);
    else params.delete("product_public_id");
    params.delete("page");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function clearVariantFilters() {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of ["product_public_id", "product", "search", "variant_status", "page"]) {
      params.delete(key);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    setSearchInput("");
  }

  function openNew() {
    setEditing("new");
    setForm(emptyForm(attributes));
    setHideUnusedAttributes(true);
    // A new variant inherits the attribute types the product already uses; if the
    // product has no variants yet we can't infer them, so show all (null).
    setEditorScope(usedAttributePublicIds.size > 0 ? new Set(usedAttributePublicIds) : null);
  }

  function openEdit(v: ProductVariant) {
    const picks: Record<string, string> = {};
    for (const a of attributes) picks[a.public_id] = "";
    for (const valPublicId of v.attribute_value_public_ids) {
      for (const a of attributes) {
        const match = a.values.find((x) => x.public_id === valPublicId);
        if (match) {
          picks[a.public_id] = valPublicId;
          break;
        }
      }
    }
    setEditing(v.public_id);
    setForm({
      price_override: v.price_override ?? "",
      price_note: v.price_note ?? "",
      is_active: v.is_active,
      picks,
    });
    setHideUnusedAttributes(true);
    // Scope = attribute types the product uses, plus any this variant sets.
    const scope = new Set<string>([...usedAttributePublicIds, ...scopeForVariant(v)]);
    setEditorScope(scope.size > 0 ? scope : null);
  }

  function closePanel() {
    setEditing(null);
    setForm(null);
    setEditorScope(null);
  }

  async function saveVariant(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    // New variants belong to the selected product; edits keep their own product
    // (which may not be the current filter when editing a store-wide search hit).
    const editingVariant =
      editing && editing !== "new"
        ? variants.find((v) => v.public_id === editing)
        : undefined;
    const targetProductId =
      editing === "new" ? productId : editingVariant?.product_public_id || productId;
    if (!targetProductId) return;
    setSaving(true);
    setError("");
    const attribute_value_public_ids: string[] = [];
    for (const a of attributes) {
      const raw = form.picks[a.public_id];
      if (raw) attribute_value_public_ids.push(raw);
    }
    const payload: Record<string, unknown> = {
      product_public_id: targetProductId,
      is_active: form.is_active,
      attribute_value_public_ids,
    };
    const po = form.price_override.trim();
    if (po) payload.price_override = po;
    else payload.price_override = null;
    payload.price_note = form.price_note.trim();

    try {
      if (editing === "new") {
        await api.post("admin/product-variants/", payload);
      } else if (typeof editing === "string") {
        await api.patch(`admin/product-variants/${editing}/`, payload);
      }
      closePanel();
      invalidateVariantCaches(targetProductId);
    } catch (err: unknown) {
      notify.error(err, {
        title: tPages("toastTitleVariantNotSaved"),
        fallbackMessage: tPages("toastDescVariantNotSaved"),
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteVariant(v: ProductVariant) {
    const ok = await confirm({
      title: tPages("confirmDialogTitleDeleteVariant"),
      message: tPages("variantsConfirmDeleteSku", { sku: v.sku }),
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`admin/product-variants/${v.public_id}/`);
      invalidateVariantCaches(v.product_public_id);
      notify.success(tPages("toastDescVariantDeleted"), { title: tPages("toastTitleVariantDeleted") });
    } catch (err) {
      notify.error(err, {
        title: tPages("toastTitleVariantNotDeleted"),
        fallbackMessage: tPages("toastDescVariantNotDeleted"),
      });
    }
  }

  async function updateVariantActive(v: ProductVariant, is_active: boolean) {
    if (v.is_active === is_active) return;
    setTogglingVariantId(v.public_id);
    setError("");
    try {
      await api.patch(`admin/product-variants/${v.public_id}/`, { is_active });
      patchVariantInCaches(queryClient, v.public_id, { is_active });
      invalidateVariantCaches(v.product_public_id);
    } catch {
      notify.error(new Error("variant_status_update_failed"), {
        title: tPages("toastTitleVariantStatusNotSaved"),
        fallbackMessage: tPages("toastDescVariantStatusNotSaved"),
      });
      invalidateVariantCaches(v.product_public_id);
    } finally {
      setTogglingVariantId(null);
    }
  }

  function handleVariantStatusChange(v: ProductVariant, is_active: boolean) {
    if (v.is_active !== is_active) {
      void updateVariantActive(v, is_active);
    }
  }

  const variantStatusValue = filters.variant_status || "";

  if (loading && attributes.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
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
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-foreground">
              {tPages("variantsTitle")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground md:hidden">
              {tPages("variantsSubtitleBefore")}{" "}
              <ClickableText href="/product-attributes" className="underline-offset-2">
                {tPages("variantsSubtitleLink")}
              </ClickableText>
              {tPages("variantsSubtitleAfter")}
            </p>
          </div>
        </div>
      </header>

      <p className="hidden text-sm text-muted-foreground md:block">
        {tPages("variantsSubtitleBefore")}{" "}
        <ClickableText href="/product-attributes" className="underline-offset-2">
          {tPages("variantsSubtitleLink")}
        </ClickableText>
        {tPages("variantsSubtitleAfter")}
      </p>

      {/* Inline error text moved to toasts (keep form states only). */}

      <FilterBar className="flex-nowrap overflow-x-auto overflow-y-clip [-webkit-overflow-scrolling:touch] sm:flex-wrap sm:overflow-x-visible sm:overflow-y-visible">
        <VariantProductPicker
          productId={productId}
          productName={selectedProduct?.name ?? null}
          onChange={(value) => {
            closePanel();
            applyProductPublicIdToUrl(value);
          }}
          ariaLabel={tPages("variantsFiltersProduct")}
          placeholder={tPages("variantsFiltersProduct")}
          emptyText={tPages("variantsProductPickerNoResults")}
          loadingText={tCommon("loading")}
          className="shrink-0 min-w-[200px] max-w-[min(100vw-2rem,320px)]"
        />
        <Select
          aria-label={tPages("variantsFiltersVariantStatus")}
          className="w-[160px] shrink-0 text-xs font-medium"
          value={variantStatusValue}
          onChange={(e) => {
            const v = e.target.value.trim();
            setFilter("variant_status", v ? v : null);
          }}
        >
          <option value="">{tPages("variantsFiltersVariantStatus")}</option>
          <option value="active">{tCommon("active")}</option>
          <option value="inactive">{tCommon("inactive")}</option>
        </Select>
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={tPages("variantsFiltersSearchVariants")}
          className="min-w-[8.5rem] shrink-0 sm:min-w-0 sm:w-52 sm:max-w-none md:w-72"
        />
        <button
          type="button"
          onClick={clearVariantFilters}
          className="h-9 shrink-0 rounded-ui border border-border px-3 text-sm hover:bg-muted"
        >
          {tPages("filtersClear")}
        </button>
      </FilterBar>

      {selectedProduct ? (
        <p className="text-xs text-muted-foreground">
          {tPages("variantsBasePrice")}{" "}
          <span className={cn("text-foreground", numClass)}>{selectedProduct.price}</span>
          {selectedProduct.variant_count != null ? (
            <> {tPages("variantsVariantCount", { count: selectedProduct.variant_count })}</>
          ) : null}
        </p>
      ) : null}

      {showList ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-medium text-foreground">
              {productId ? tPages("variantsSkusHeading") : tPages("variantsSearchResultsHeading")}
            </h2>
            {productId ? (
              <Button type="button" size="sm" onClick={openNew} disabled={editing !== null}>
                <Plus className="mr-2 size-4" />
                {tPages("variantsAddVariant")}
              </Button>
            ) : null}
          </div>

          {editing !== null && form ? (
            <Card className="border-primary/30 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">
                  {editing === "new" ? tPages("variantsNewVariant") : tPages("variantsEditVariant")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={saveVariant} className="flex flex-col gap-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {tPages("variantsSkuLabel")}
                      </span>
                      {editing === "new" ? (
                        <p className="text-sm text-muted-foreground">
                          {tPages("variantsSkuPlaceholder")}
                        </p>
                      ) : (
                        <p className={cn("text-sm text-foreground", numClass)}>
                          {editingVariantSku ?? "—"}
                        </p>
                      )}
                    </div>
                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {tPages("variantsPriceOverride")}
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        className={cn("w-full max-w-xs text-sm", numClass)}
                        value={form.price_override}
                        onChange={(e) => setForm({ ...form, price_override: e.target.value })}
                        placeholder={tPages("variantsPriceOverridePlaceholder")}
                        onKeyDown={handleKeyDown}
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {tPages("variantsPriceNote")}
                      </span>
                      <Input
                        type="text"
                        maxLength={200}
                        className="w-full max-w-md text-sm"
                        value={form.price_note}
                        onChange={(e) => setForm({ ...form, price_note: e.target.value })}
                        placeholder={tPages("variantsPriceNotePlaceholder")}
                        onKeyDown={handleKeyDown}
                      />
                      <span className="text-[11px] text-muted-foreground">
                        {tPages("variantsPriceNoteHint")}
                      </span>
                    </label>
                  </div>

                  {attributes.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {tPages("variantsOptionsHeading")}
                        </p>
                        {canToggleAttributes ? (
                          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={hideUnusedAttributes}
                              onChange={(e) => setHideUnusedAttributes(e.target.checked)}
                              className="form-checkbox"
                            />
                            <span>{tPages("variantsHideUnusedAttributes")}</span>
                          </label>
                        ) : null}
                      </div>
                      <div className="flex min-w-0 max-w-full flex-nowrap gap-4 overflow-x-auto overflow-y-clip [-webkit-overflow-scrolling:touch] sm:grid sm:grid-cols-2 sm:overflow-x-visible sm:pb-0">
                        {editorAttributes.map((a) => (
                          <label
                            key={a.public_id}
                            className="flex min-w-[9.5rem] shrink-0 flex-col gap-2 sm:min-w-0"
                          >
                            <span className="text-xs font-medium text-muted-foreground">
                              {a.name}
                            </span>
                            <Select
                              className="w-full text-sm"
                              value={form.picks[a.public_id] ?? ""}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  picks: { ...form.picks, [a.public_id]: e.target.value },
                                })
                              }
                            >
                              <option value="">{tPages("variantsOptionNone")}</option>
                              {a.values.map((v) => (
                                <option key={v.public_id} value={v.public_id}>
                                  {v.value}
                                </option>
                              ))}
                            </Select>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {tPages("variantsNoAttributes")}{" "}
                      <ClickableText href="/product-attributes" className="underline-offset-2">
                        {tPages("variantsNoAttributesLink")}
                      </ClickableText>{" "}
                      {tPages("variantsNoAttributesAfter")}
                    </p>
                  )}

                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {tPages("variantsAvailability")}
                    </span>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                        className="form-checkbox"
                        onKeyDown={handleKeyDown}
                      />
                      <span className="text-sm text-foreground">{tCommon("active")}</span>
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" loading={saving} disabled={saving} className="gap-2">
                      {tCommon("save")}
                    </Button>
                    <Button type="button" variant="outline" onClick={closePanel}>
                      {tCommon("cancel")}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {variantsLoading ? null : filteredVariants.length === 0 ? (
            <p className="rounded-card border border-border p-8 text-center text-sm text-muted-foreground">
              {storeWide
                ? tPages("variantsSearchNoResults")
                : variants.length === 0
                  ? tPages("variantsEmpty")
                  : tPages("variantsEmptyFiltered")}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-card border border-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">{tPages("variantsColSku")}</th>
                    <th className="px-4 py-3 font-medium">{tPages("variantsColOptions")}</th>
                    <th className="px-4 py-3 font-medium">{tPages("variantsColPrice")}</th>
                    <th className="px-4 py-3 font-medium">{tPages("variantsColStock")}</th>
                    <th className="px-4 py-3 font-medium">{tPages("variantsColStatus")}</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      {tPages("variantsColAction")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVariants.map((v) => (
                    <ClickableTableRow
                      key={v.public_id}
                      onNavigate={() => openEdit(v)}
                      aria-label={tPages("variantsEditVariantAria", { sku: v.sku })}
                      disabled={editing !== null}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        <span
                          className={cn(
                            numClass,
                            editing !== null
                              ? "max-w-full whitespace-nowrap opacity-50"
                              : "max-w-full whitespace-nowrap"
                          )}
                        >
                          {v.sku}
                        </span>
                        {!productId ? (
                          <span
                            className="mt-0.5 block max-w-[16rem] truncate text-xs font-normal text-muted-foreground"
                            title={v.product_name || v.product_public_id}
                          >
                            {v.product_name || v.product_public_id}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {v.option_labels?.length
                          ? v.option_labels.join(" · ")
                          : "—"}
                      </td>
                      <td className={cn("px-4 py-3 text-foreground", numClass)}>
                        <span className="block">
                          {v.price_override ?? v.effective_price ?? selectedProduct?.price ?? "—"}
                        </span>
                        {v.price_note ? (
                          <span
                            className="mt-0.5 block max-w-[16rem] truncate text-xs font-normal text-muted-foreground"
                            title={v.price_note}
                          >
                            {v.price_note}
                          </span>
                        ) : null}
                      </td>
                      <td className={cn("px-4 py-3", numClass)}>{v.available_quantity}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Select
                          size="sm"
                          aria-label={tPages("variantsStatusPlaceholder")}
                          className={cn(
                            "w-[110px] text-xs font-semibold capitalize",
                            v.is_active
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-muted text-muted-foreground"
                          )}
                          value={v.is_active ? "active" : "inactive"}
                          onChange={(e) =>
                            handleVariantStatusChange(v, e.target.value === "active")
                          }
                          disabled={
                            editing !== null || togglingVariantId === v.public_id
                          }
                        >
                          <option value="active">{tCommon("active")}</option>
                          <option value="inactive">{tCommon("inactive")}</option>
                        </Select>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto px-1 py-1 text-sm font-medium text-destructive underline decoration-destructive/80 underline-offset-4 transition-none hover:bg-transparent hover:text-destructive disabled:no-underline disabled:opacity-50"
                          disabled={editing !== null}
                          onClick={() => deleteVariant(v)}
                        >
                          {tCommon("delete")}
                        </Button>
                      </td>
                    </ClickableTableRow>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {storeWide && !variantsLoading && variants.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              {searchTotal != null ? (
                <span>
                  {tPages("variantsSearchShowing", {
                    shown: toLocaleDigits(String(variants.length), locale),
                    total: toLocaleDigits(String(searchTotal), locale),
                  })}
                </span>
              ) : (
                <span />
              )}
              {searchQuery.hasNextPage ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  loading={searchQuery.isFetchingNextPage}
                  disabled={searchQuery.isFetchingNextPage}
                  onClick={() => void searchQuery.fetchNextPage()}
                >
                  {tPages("variantsLoadMore")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{tPages("variantsChooseProduct")}</p>
      )}
    </div>
  );
}
