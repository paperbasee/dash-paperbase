"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { toLocaleDigits } from "@/lib/locale-digits";
import { Undo2 } from "lucide-react";
import api from "@/lib/api";
import { useBranding } from "@/context/BrandingContext";
import type { AdminCategoryTreeNode, Product, PaginatedResponse } from "@/types";
import { flattenCategoryOptions } from "@/lib/category-tree";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { ClickableText } from "@/components/ui/clickable-text";
import { Input } from "@/components/ui/input";
import { FilterBar } from "@/components/filters/FilterBar";
import { FilterDropdown } from "@/components/filters/FilterDropdown";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useFilters } from "@/hooks/useFilters";
import { notify } from "@/notifications";

type CategoryOption = { value: string; label: string };
type MeResponse = { is_superuser?: boolean };

export default function ProductsPage() {
  const router = useRouter();
  const locale = useLocale();
  const tNav = useTranslations("nav");
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const { currencySymbol } = useBranding();
  const { page, filters, setFilter, setPage, clearFilters } = useFilters([
    "status",
    "stock",
    "category",
    "price_min",
    "price_max",
    "search",
    "ordering",
  ]);
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const [priceMinInput, setPriceMinInput] = useState(filters.price_min || "");
  const [priceMaxInput, setPriceMaxInput] = useState(filters.price_max || "");
  const debouncedSearch = useDebouncedValue(searchInput);
  const debouncedPriceMin = useDebouncedValue(priceMinInput);
  const debouncedPriceMax = useDebouncedValue(priceMaxInput);
  const [categoryTree, setCategoryTree] = useState<AdminCategoryTreeNode[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [canDeleteProducts, setCanDeleteProducts] = useState(false);

  useEffect(() => {
    const next = debouncedSearch.trim();
    if (next === (filters.search || "")) return;
    setFilter("search", next);
  }, [debouncedSearch, filters.search, setFilter]);

  useEffect(() => {
    const next = debouncedPriceMin.trim();
    if (next === (filters.price_min || "")) return;
    setFilter("price_min", next);
  }, [debouncedPriceMin, filters.price_min, setFilter]);

  useEffect(() => {
    const next = debouncedPriceMax.trim();
    if (next === (filters.price_max || "")) return;
    setFilter("price_max", next);
  }, [debouncedPriceMax, filters.price_max, setFilter]);

  useEffect(() => {
    let active = true;
    api
      .get<AdminCategoryTreeNode[]>("admin/categories/?tree=1")
      .then((res) => {
        if (!active) return;
        const d = res.data;
        setCategoryTree(Array.isArray(d) ? d : []);
      })
      .catch((err) => {
        console.error(err);
        notify.error(err);
      });
    return () => {
      active = false;
    };
  }, []);

  const categoryOptions = useMemo<CategoryOption[]>(
    () =>
      flattenCategoryOptions(categoryTree).map((c) => ({
        value: c.value,
        label: c.label,
      })),
    [categoryTree]
  );

  useEffect(() => {
    let active = true;
    api
      .get<MeResponse>("auth/me/")
      .then(({ data }) => {
        if (!active) return;
        setCanDeleteProducts(Boolean(data.is_superuser));
      })
      .catch(() => {
        if (!active) return;
        setCanDeleteProducts(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page };
    if (filters.status) params.status = filters.status;
    if (filters.stock) params.stock = filters.stock;
    if (filters.category) params.category = filters.category;
    if (filters.price_min) params.price_min = filters.price_min;
    if (filters.price_max) params.price_max = filters.price_max;
    if (filters.search) params.search = filters.search;
    if (filters.ordering) params.ordering = filters.ordering;
    api
      .get<PaginatedResponse<Product>>("admin/products/", {
        params,
      })
      .then((res) => {
        setProducts(res.data.results);
        setCount(res.data.count);
        setHasNext(!!res.data.next);
      })
      .catch((err) => {
        console.error(err);
        notify.error(err);
      })
      .finally(() => setLoading(false));
  }, [
    filters.category,
    filters.price_max,
    filters.price_min,
    filters.search,
    filters.ordering,
    filters.status,
    filters.stock,
    page,
  ]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.public_id)));
    }
  };

  async function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    const ok = await notify.confirm({
      title: tPages("confirmDeleteProducts", {
        count: toLocaleDigits(String(selectedIds.size), locale),
      }),
      level: "destructive",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => api.delete(`admin/products/${id}/`))
      );
      setSelectedIds(new Set());
      fetchProducts();
    } catch (err) {
      console.error(err);
      notify.error(err);
    } finally {
      setDeleting(false);
    }
  }

  async function updateProduct(product: Product, payload: { is_active?: boolean }) {
    setUpdatingId(product.public_id);
    try {
      await api.patch(`admin/products/${product.public_id}/`, payload);
      setProducts((prev) =>
        prev.map((p) =>
          p.public_id === product.public_id ? { ...p, ...payload } : p
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  }

  function handleStatusChange(product: Product, is_active: boolean) {
    if (product.is_active !== is_active) {
      updateProduct(product, { is_active });
    }
  }

  const allSelected = products.length > 0 && selectedIds.size === products.length;
  const someSelected = selectedIds.size > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
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
          <h1 className="text-2xl font-medium leading-relaxed text-foreground">
            {tNav("products")} ({toLocaleDigits(String(count), locale)})
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {canDeleteProducts && someSelected && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive/90 disabled:opacity-50"
            >
              {deleting
                ? tPages("deleting")
                : tPages("deleteSelected", {
                    count: toLocaleDigits(String(selectedIds.size), locale),
                  })}
            </button>
          )}
          <Link
            href="/products/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            {tPages("addProduct")}
          </Link>
        </div>
      </div>

      <FilterBar>
        <FilterDropdown
          value={filters.status}
          onChange={(value) => setFilter("status", value)}
          placeholder={tPages("filtersStatus")}
          options={[
            { value: "active", label: tCommon("active") },
            { value: "inactive", label: tCommon("inactive") },
          ]}
        />
        <FilterDropdown
          value={filters.stock}
          onChange={(value) => setFilter("stock", value)}
          placeholder={tPages("filtersStock")}
          options={[
            { value: "in_stock", label: tPages("inventoryStockInStock") },
            { value: "low_stock", label: tPages("inventoryStockLow") },
            { value: "out_of_stock", label: tPages("inventoryStockOut") },
          ]}
        />
        <FilterDropdown
          value={filters.category}
          onChange={(value) => setFilter("category", value)}
          placeholder={tPages("filtersCategory")}
          options={categoryOptions}
          className="min-w-[180px]"
        />
        <Input
          value={priceMinInput}
          onChange={(e) => setPriceMinInput(e.target.value)}
          type="number"
          min={0}
          placeholder={tPages("filtersMinPrice")}
          className="w-full md:w-28"
        />
        <Input
          value={priceMaxInput}
          onChange={(e) => setPriceMaxInput(e.target.value)}
          type="number"
          min={0}
          placeholder={tPages("filtersMaxPrice")}
          className="w-full md:w-28"
        />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={tPages("filtersSearchProducts")}
          className="w-full md:w-64"
        />
        <FilterDropdown
          value={filters.ordering}
          onChange={(value) => setFilter("ordering", value)}
          placeholder={tPages("productsListSortPlaceholder")}
          options={[
            { value: "newest", label: tPages("productsListSortNewest") },
            { value: "price_asc", label: tPages("productsListSortPriceAsc") },
            { value: "price_desc", label: tPages("productsListSortPriceDesc") },
            { value: "popularity", label: tPages("productsListSortPopularity") },
          ]}
        />
        <button
          type="button"
          onClick={() => {
            setSearchInput("");
            setPriceMinInput("");
            setPriceMaxInput("");
            clearFilters();
          }}
          className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted"
        >
          {tPages("filtersClear")}
        </button>
      </FilterBar>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-dashed border-card-border bg-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="w-10 px-4 py-3">
                    {canDeleteProducts && (
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="form-checkbox"
                        aria-label={tPages("productsListSelectAllAria")}
                      />
                    )}
                  </th>
                  <th className="th">{tPages("productsListColProduct")}</th>
                  <th className="th">{tPages("productsListColBrand")}</th>
                  <th className="th">{tPages("productsListColCategory")}</th>
                  <th className="th">{tPages("productsListColPrice")}</th>
                  <th className="th">{tPages("productsListColStock")}</th>
                  <th className="th">{tPages("productsListColStatus")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {products.map((product) => (
                  <tr key={product.public_id} className="hover:bg-muted/40">
                    <td className="w-10 px-4 py-3">
                      {canDeleteProducts && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(product.public_id)}
                          onChange={() => toggleSelect(product.public_id)}
                          onClick={(e) => e.stopPropagation()}
                          className="form-checkbox"
                          aria-label={tPages("productsListSelectRowAria", {
                            name: product.name,
                          })}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ClickableText
                        href={`/products/${product.public_id}`}
                        className="flex max-w-xs items-center"
                      >
                        <span className="truncate">{product.name}</span>
                      </ClickableText>
                    </td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      {product.brand || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {product.category_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      {currencySymbol}{Number(product.price).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {product.variant_count && product.variant_count > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`font-numbers text-sm font-medium ${
                              (product.total_stock ?? 0) === 0
                                ? "text-destructive"
                                : "text-foreground"
                            }`}
                          >
                            {product.total_stock ?? product.available_quantity ?? 0}
                          </span>
                          <ClickableText
                            href={`/variants?product_public_id=${encodeURIComponent(product.public_id)}`}
                            className="text-xs underline-offset-2"
                            title={tPages("productsListVariantStockTitle")}
                          >
                            {tPages("productsListVariantsManage", {
                              count: toLocaleDigits(
                                String(product.variant_count),
                                locale
                              ),
                            })}
                          </ClickableText>
                        </div>
                      ) : (
                        <span
                          className={`font-numbers text-sm font-medium ${
                            (product.total_stock ?? product.available_quantity ?? 0) === 0
                              ? "text-destructive"
                              : "text-foreground"
                          }`}
                          title={tPages(
                            "productsListStockManagedFromInventoryTitle"
                          )}
                        >
                          {product.total_stock ?? product.available_quantity ?? 0}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Combobox
                        value={product.is_active ? "active" : "inactive"}
                        onValueChange={(value) => {
                          if (!value) return;
                          handleStatusChange(product, value === "active");
                        }}
                        disabled={updatingId === product.public_id}
                      >
                        <ComboboxInput
                          placeholder={tPages("productsListStatusPlaceholder")}
                          showClear={false}
                          className="w-[110px]"
                          inputClassName={`cursor-pointer caret-transparent text-xs font-semibold capitalize ${
                            product.is_active
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="btn-page"
            >
              {tPages("supportTicketsPrevious")}
            </button>
            <span className="text-sm text-muted-foreground">
              {tPages("supportTicketsPageLabel", {
                page: toLocaleDigits(String(page), locale),
              })}
            </span>
            <button
              disabled={!hasNext}
              onClick={() => setPage(page + 1)}
              className="btn-page"
            >
              {tPages("supportTicketsNext")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
