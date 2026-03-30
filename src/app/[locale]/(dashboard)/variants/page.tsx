"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Plus, Undo2 } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterBar } from "@/components/filters/FilterBar";
import { FilterDropdown } from "@/components/filters/FilterDropdown";
import { ClickableText } from "@/components/ui/clickable-text";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
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
import { notify, normalizeError } from "@/notifications";

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

export default function VariantsPage() {
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
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
          { params: { product_public_id: productId, page, page_size: 100 } }
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
    const ok = await notify.confirm({
      title: tPages("variantsConfirmDeleteSku", { sku: v.sku }),
      level: "destructive",
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

  if (loading && products.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">{tPages("variantsLoadingCatalog")}</div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-muted/80 px-1 py-1 hidden md:block">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label={tPages("goBack")}
              className="flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-muted"
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
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <FilterBar>
        <FilterDropdown
          value={productId}
          onChange={(value) => {
            closePanel();
            applyProductPublicIdToUrl(value);
          }}
          placeholder={tPages("variantsFiltersProduct")}
          options={productOptions}
          className="min-w-[200px] max-w-[min(100vw-2rem,320px)]"
        />
        <FilterDropdown
          value={filters.variant_status}
          onChange={(value) => setFilter("variant_status", value)}
          placeholder={tPages("variantsFiltersVariantStatus")}
          options={[
            { value: "active", label: tCommon("active") },
            { value: "inactive", label: tCommon("inactive") },
          ]}
        />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={tPages("variantsFiltersSearchVariants")}
          className="w-full md:w-72"
          disabled={!productId}
        />
        <button
          type="button"
          onClick={clearVariantFilters}
          className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted"
        >
          {tPages("filtersClear")}
        </button>
      </FilterBar>

      {selectedProduct ? (
        <p className="text-xs text-muted-foreground">
          {tPages("variantsBasePrice")}{" "}
          <span className="font-numbers text-foreground">{selectedProduct.price}</span>
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
                        <p className="font-mono text-sm text-foreground">{editingVariantSku ?? "—"}</p>
                      )}
                    </div>
                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {tPages("variantsPriceOverride")}
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        className="w-full max-w-xs font-numbers text-sm"
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
                      <div className="grid gap-4 sm:grid-cols-2">
                        {attributes.map((a) => (
                          <label key={a.public_id} className="flex flex-col gap-2">
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
            <p className="text-sm text-muted-foreground">{tPages("variantsLoadingVariants")}</p>
          ) : variants.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {tPages("variantsEmpty")}
            </p>
          ) : filteredVariants.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {tPages("variantsEmptyFiltered")}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
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
                    <tr key={v.public_id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <ClickableText
                          aria-label={tPages("variantsEditVariantAria", { sku: v.sku })}
                          disabled={editing !== null}
                          onClick={() => openEdit(v)}
                          className="max-w-full whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {v.sku}
                        </ClickableText>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {v.option_labels?.length
                          ? v.option_labels.join(" · ")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 font-numbers text-foreground">
                        {v.price_override ?? selectedProduct?.price ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-numbers">{v.available_quantity}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Combobox
                          value={v.is_active ? "active" : "inactive"}
                          onValueChange={(value) => {
                            if (!value) return;
                            handleVariantStatusChange(v, value === "active");
                          }}
                          disabled={
                            editing !== null || togglingVariantId === v.public_id
                          }
                        >
                          <ComboboxInput
                            placeholder={tPages("variantsStatusPlaceholder")}
                            showClear={false}
                            className="w-[110px]"
                            inputClassName={`cursor-pointer caret-transparent text-xs font-semibold capitalize ${
                              v.is_active
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          />
                          <ComboboxContent>
                            <ComboboxList>
                              <ComboboxItem value="active">
                                <span className="text-xs font-medium capitalize">
                                  {tCommon("active")}
                                </span>
                              </ComboboxItem>
                              <ComboboxItem value="inactive">
                                <span className="text-xs font-medium capitalize">
                                  {tCommon("inactive")}
                                </span>
                              </ComboboxItem>
                            </ComboboxList>
                          </ComboboxContent>
                        </Combobox>
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
                    </tr>
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
