"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
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
import type {
  Product,
  ProductAttributeAdmin,
  ProductVariant,
  PaginatedResponse,
} from "@/types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useFilters } from "@/hooks/useFilters";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { notify, normalizeError } from "@/notifications";
import { numberTextClass } from "@/lib/number-font";
import { cn } from "@/lib/utils";
import { DashboardTableSkeleton } from "@/components/skeletons/dashboard-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

async function fetchAllProducts(): Promise<Product[]> {
  const out: Product[] = [];
  let page = 1;
  while (true) {
    const { data } = await api.get<PaginatedResponse<Product>>("admin/products/", {
      params: { page, page_size: 100 },
    });
    out.push(...data.results);
    if (!data.next) break;
    page += 1;
  }
  return out;
}

async function fetchAllAttributes(): Promise<ProductAttributeAdmin[]> {
  const out: ProductAttributeAdmin[] = [];
  let page = 1;
  while (true) {
    const { data } = await api.get<PaginatedResponse<ProductAttributeAdmin>>(
      "admin/product-attributes/",
      { params: { page, page_size: 100 } }
    );
    out.push(...data.results);
    if (!data.next) break;
    page += 1;
  }
  return out;
}

type VariantForm = {
  price_override: string;
  is_active: boolean;
  /** one value public_id per attribute (or empty) */
  picks: Record<string, string>;
};

const emptyForm = (attrs: ProductAttributeAdmin[]): VariantForm => {
  const picks: Record<string, string> = {};
  for (const a of attrs) picks[a.public_id] = "";
  return {
    price_override: "",
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

  const [products, setProducts] = useState<Product[]>([]);
  const [attributes, setAttributes] = useState<ProductAttributeAdmin[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<VariantForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingVariantId, setTogglingVariantId] = useState<string | null>(null);

  useLayoutEffect(() => {
    unlockDocumentScroll();
  }, []);

  const selectedProduct = useMemo(
    () => products.find((p) => p.public_id === productId) ?? null,
    [products, productId]
  );

  const editingVariantSku =
    editing && editing !== "new"
      ? variants.find((v) => v.public_id === editing)?.sku
      : undefined;

  const loadMeta = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [prods, attrs] = await Promise.all([fetchAllProducts(), fetchAllAttributes()]);
      setProducts(prods);
      setAttributes(attrs);
    } catch {
      setError(tPages("variantsLoadMetaFailed"));
    } finally {
      setLoading(false);
    }
  }, [tPages]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    const next = debouncedSearch.trim();
    if (next !== searchInput.trim()) return;
    if (next === (filters.search || "")) return;
    setFilter("search", next);
  }, [debouncedSearch, searchInput, filters.search, setFilter]);

  useEffect(() => {
    setSearchInput(filters.search || "");
  }, [filters.search]);

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: p.public_id,
        label: p.name,
      })),
    [products]
  );

  const filteredVariants = useMemo(() => {
    const q = (filters.search || "").trim().toLowerCase();
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
  }, [variants, filters.search, filters.variant_status]);

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

  const loadVariants = useCallback(async () => {
    if (!productId) {
      setVariants([]);
      return;
    }
    setVariantsLoading(true);
    try {
      const acc: ProductVariant[] = [];
      let page = 1;
      while (true) {
        const { data } = await api.get<PaginatedResponse<ProductVariant>>(
          "admin/product-variants/",
          {
            params: {
              product_public_id: productId,
              page,
              page_size: 100,
              include_inactive: true,
            },
          }
        );
        acc.push(...data.results);
        if (!data.next) break;
        page += 1;
      }
      setVariants(acc);
    } catch {
      setVariants([]);
      setError(tPages("variantsLoadVariantsFailed"));
    } finally {
      setVariantsLoading(false);
    }
  }, [productId, tPages]);

  useEffect(() => {
    loadVariants();
  }, [loadVariants]);

  function openNew() {
    setEditing("new");
    setForm(emptyForm(attributes));
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
      is_active: v.is_active,
      picks,
    });
  }

  function closePanel() {
    setEditing(null);
    setForm(null);
  }

  async function saveVariant(e: FormEvent) {
    e.preventDefault();
    if (!productId || !form) return;
    setSaving(true);
    setError("");
    const attribute_value_public_ids: string[] = [];
    for (const a of attributes) {
      const raw = form.picks[a.public_id];
      if (raw) attribute_value_public_ids.push(raw);
    }
    const payload: Record<string, unknown> = {
      product_public_id: productId,
      is_active: form.is_active,
      attribute_value_public_ids,
    };
    const po = form.price_override.trim();
    if (po) payload.price_override = po;
    else payload.price_override = null;

    try {
      if (editing === "new") {
        await api.post("admin/product-variants/", payload);
      } else if (typeof editing === "string") {
        await api.patch(`admin/product-variants/${editing}/`, payload);
      }
      closePanel();
      await loadVariants();
      await loadMeta();
    } catch (err: unknown) {
      const normalized = normalizeError(err, tPages("variantsSaveFailed"));
      setError(normalized.message);
      notify.error(normalized.message);
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
      await loadVariants();
      await loadMeta();
    } catch {
      setError(tPages("variantsDeleteFailed"));
    }
  }

  async function updateVariantActive(v: ProductVariant, is_active: boolean) {
    if (v.is_active === is_active) return;
    setTogglingVariantId(v.public_id);
    setError("");
    try {
      await api.patch(`admin/product-variants/${v.public_id}/`, { is_active });
      setVariants((prev) =>
        prev.map((row) =>
          row.public_id === v.public_id ? { ...row, is_active } : row
        )
      );
      await loadMeta();
    } catch {
      setError(tPages("variantsStatusUpdateFailed"));
      await loadVariants();
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

  if (loading && products.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Skeleton className="hidden h-8 w-8 rounded-ui md:block" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-40" />
            </div>
          </div>
        </div>
        <Skeleton className="h-4 w-80" />
        <DashboardTableSkeleton columns={6} rows={5} showHeader={false} showFilters={false} />
      </div>
    );
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

      {error ? (
        <p className="rounded-card border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <FilterBar className="flex-nowrap overflow-x-auto overflow-y-clip [-webkit-overflow-scrolling:touch] sm:flex-wrap sm:overflow-x-visible sm:overflow-y-visible">
        <Select
          aria-label={tPages("variantsFiltersProduct")}
          className={cn(
            "shrink-0 min-w-[200px] max-w-[min(100vw-2rem,320px)] text-xs font-medium"
          )}
          value={productId}
          onChange={(e) => {
            closePanel();
            applyProductPublicIdToUrl(e.target.value);
          }}
        >
          <option value="">{tPages("variantsFiltersProduct")}</option>
          {productOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
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
          disabled={!productId}
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

      {productId ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-medium text-foreground">{tPages("variantsSkusHeading")}</h2>
            <Button type="button" size="sm" onClick={openNew} disabled={editing !== null}>
              <Plus className="mr-2 size-4" />
              {tPages("variantsAddVariant")}
            </Button>
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
                      />
                    </label>
                  </div>

                  {attributes.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {tPages("variantsOptionsHeading")}
                      </p>
                      <div className="flex min-w-0 max-w-full flex-nowrap gap-4 overflow-x-auto overflow-y-clip [-webkit-overflow-scrolling:touch] sm:grid sm:grid-cols-2 sm:overflow-x-visible sm:pb-0">
                        {attributes.map((a) => (
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
                      />
                      <span className="text-sm text-foreground">{tCommon("active")}</span>
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" disabled={saving}>
                      {saving ? tCommon("saving") : tCommon("save")}
                    </Button>
                    <Button type="button" variant="outline" onClick={closePanel}>
                      {tCommon("cancel")}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {variantsLoading ? (
            <DashboardTableSkeleton
              columns={6}
              rows={5}
              showHeader={false}
              showFilters={false}
              showPagination={false}
            />
          ) : variants.length === 0 ? (
            <p className="rounded-card border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {tPages("variantsEmpty")}
            </p>
          ) : filteredVariants.length === 0 ? (
            <p className="rounded-card border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {tPages("variantsEmptyFiltered")}
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
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {v.option_labels?.length
                          ? v.option_labels.join(" · ")
                          : "—"}
                      </td>
                      <td className={cn("px-4 py-3 text-foreground", numClass)}>
                        {v.price_override ?? selectedProduct?.price ?? "—"}
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
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{tPages("variantsChooseProduct")}</p>
      )}
    </div>
  );
}
