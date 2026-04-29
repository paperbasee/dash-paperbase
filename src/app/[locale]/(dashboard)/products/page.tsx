"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { toLocaleDigits } from "@/lib/locale-digits";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, Undo2 } from "lucide-react";
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
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { ClickableText } from "@/components/ui/clickable-text";
import { Input } from "@/components/ui/input";
import { FilterBar } from "@/components/filters/FilterBar";
import { FilterDropdown } from "@/components/filters/FilterDropdown";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useFilters } from "@/hooks/useFilters";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { notify } from "@/notifications";
import { useAdminDeleteCapabilities } from "@/hooks/useAdminDeleteCapabilities";
import { numberTextClass } from "@/lib/number-font";
import { cn } from "@/lib/utils";
import { DashboardTableSkeleton } from "@/components/skeletons/dashboard-skeletons";

type CategoryOption = { value: string; label: string };

/** Matches DRF default PageNumberPagination PAGE_SIZE for admin list. */
const ADMIN_PRODUCTS_PAGE_SIZE = 24;

async function fetchAllProductPublicIdsInCategory(
  categoryPublicId: string
): Promise<string[]> {
  const ids: string[] = [];
  let p = 1;
  for (;;) {
    const res = await api.get<PaginatedResponse<Product>>("admin/products/", {
      params: {
        page: p,
        category: categoryPublicId,
        ordering: "newest",
      },
    });
    ids.push(...res.data.results.map((x) => x.public_id));
    if (!res.data.next) break;
    p += 1;
  }
  return ids;
}

export default function ProductsPage() {
  const router = useRouter();
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const tNav = useTranslations("nav");
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const { currencySymbol } = useBranding();
  const confirm = useConfirm();
  const { page, filters, setFilter, setPage, clearFilters } = useFilters([
    "status",
    "stock",
    "prepayment_type",
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
  const reorderBusyRef = useRef(false);
  const { canDelete: canDeleteProducts, isSuperuser: deleteIsSuperuser } =
    useAdminDeleteCapabilities();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const fetchProducts = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page };
    if (filters.status) params.status = filters.status;
    if (filters.stock) params.stock = filters.stock;
    if (filters.prepayment_type)
      params.prepayment_type = filters.prepayment_type;
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
    filters.prepayment_type,
    filters.search,
    filters.ordering,
    filters.status,
    filters.stock,
    page,
  ]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const canReorder = useMemo(() => {
    if (!filters.category) return false;
    if (filters.search || filters.status || filters.stock) return false;
    if (filters.prepayment_type) return false;
    if (filters.price_min || filters.price_max) return false;
    const ord = filters.ordering;
    if (ord && ord !== "newest") return false;
    if (products.length < 2) return false;
    const cats = new Set(
      products.map((p) => p.category_public_id).filter(Boolean)
    );
    return cats.size === 1;
  }, [filters, products]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (!canReorder) return;
      if (reorderBusyRef.current || !filters.category) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = products.findIndex((p) => p.public_id === active.id);
      const newIndex = products.findIndex((p) => p.public_id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;

      reorderBusyRef.current = true;
      const reorderedPage = arrayMove(products, oldIndex, newIndex);
      setProducts(reorderedPage);

      const catId = filters.category;
      const start = (page - 1) * ADMIN_PRODUCTS_PAGE_SIZE;
      try {
        const fullIds = await fetchAllProductPublicIdsInCategory(catId);
        const merged = fullIds.slice();
        const sliceIds = reorderedPage.map((p) => p.public_id);
        for (let i = 0; i < sliceIds.length; i++) {
          merged[start + i] = sliceIds[i];
        }
        await api.post("admin/products/reorder/", {
          category_public_id: catId,
          product_public_ids: merged,
        });
        fetchProducts();
      } catch (err) {
        console.error(err);
        notify.error(err);
        fetchProducts();
      } finally {
        reorderBusyRef.current = false;
      }
    },
    [canReorder, filters.category, page, products, fetchProducts]
  );

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
    const deletedCount = selectedIds.size;
    const ok = await confirm({
      title: tPages("confirmDialogTitleDeleteProducts", {
        count: deletedCount,
      }),
      message: deleteIsSuperuser
        ? tPages("confirmDeleteProductsPermanent", {
            count: deletedCount,
          })
        : tPages("confirmDeleteProductsTrash", {
            count: deletedCount,
          }),
      variant: "danger",
    });
    if (!ok) return;
    setDeleting(true);
    const ids = Array.from(selectedIds);
    try {
      // Sequential: parallel deletes each touch trash/DB locks and can 500 (deadlock).
      for (const id of ids) {
        await api.delete(`admin/products/${id}/`);
      }
      setSelectedIds(new Set());
      notify.warning(
        deleteIsSuperuser
          ? tPages("productsDeletedPermanentSuccess", {
              count: toLocaleDigits(String(deletedCount), locale),
            })
          : tPages("productsMovedToTrashSuccess", {
              count: toLocaleDigits(String(deletedCount), locale),
            })
      );
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

  const sortableIds = useMemo(
    () => products.map((p) => p.public_id),
    [products]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
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
          <h1 className="text-2xl font-medium leading-relaxed text-foreground">
            {tNav("products")} ({toLocaleDigits(String(count), locale)})
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {canDeleteProducts && someSelected && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-card bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive/90 disabled:opacity-50"
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              {deleteIsSuperuser
                ? tPages("deleteSelectedPermanent", {
                    count: toLocaleDigits(String(selectedIds.size), locale),
                  })
                : tPages("moveToTrashSelected", {
                    count: toLocaleDigits(String(selectedIds.size), locale),
                  })}
            </button>
          )}
          <Link
            href="/products/new"
            className="rounded-card bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
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
          value={filters.prepayment_type}
          onChange={(value) => setFilter("prepayment_type", value)}
          placeholder={tPages("filtersPrepayment")}
          options={[
            { value: "none", label: tPages("productPrepaymentTypeNone") },
            {
              value: "delivery_only",
              label: tPages("productPrepaymentTypeDeliveryOnly"),
            },
            { value: "full", label: tPages("productPrepaymentTypeFull") },
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
          className="h-9 rounded-ui border border-border px-3 text-sm hover:bg-muted"
        >
          {tPages("filtersClear")}
        </button>
      </FilterBar>

      {!loading && canReorder && (
        <p className="flex items-start gap-2 rounded-card border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">
          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          {tPages("productsListReorderHintActive")}
        </p>
      )}
      {!loading && !canReorder && filters.category && (
        <p className="rounded-card border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {tPages("productsListReorderHintDisabled")}
        </p>
      )}
      {!loading && !filters.category && products.length >= 2 && (
        <p className="rounded-card border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          {tPages("productsListReorderHintPickCategory")}
        </p>
      )}

      {loading ? (
        <DashboardTableSkeleton columns={9} rows={5} showHeader={false} showFilters={false} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-card border border-dashed border-card-border bg-card">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {canReorder && (
                      <th className="w-10 px-2 py-3" aria-hidden />
                    )}
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
                    <th className="th">{tPages("productsListColPrepayment")}</th>
                    <th className="th">{tPages("productsListColStatus")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {canReorder ? (
                    <SortableContext
                      items={sortableIds}
                      strategy={verticalListSortingStrategy}
                    >
                      {products.map((product) => (
                        <SortableProductRow
                          key={product.public_id}
                          product={product}
                          canDeleteProducts={canDeleteProducts}
                          selectedIds={selectedIds}
                          onToggleSelect={toggleSelect}
                          currencySymbol={currencySymbol}
                          numClass={numClass}
                          locale={locale}
                          tPages={tPages}
                          tCommon={tCommon}
                          updatingId={updatingId}
                          onStatusChange={handleStatusChange}
                        />
                      ))}
                    </SortableContext>
                  ) : (
                    products.map((product) => (
                      <ClickableTableRow
                        key={product.public_id}
                        href={`/products/${product.public_id}`}
                        aria-label={product.name}
                      >
                        <ProductRowCells
                          product={product}
                          canDeleteProducts={canDeleteProducts}
                          selectedIds={selectedIds}
                          onToggleSelect={toggleSelect}
                          currencySymbol={currencySymbol}
                          numClass={numClass}
                          locale={locale}
                          tPages={tPages}
                          tCommon={tCommon}
                          updatingId={updatingId}
                          onStatusChange={handleStatusChange}
                        />
                      </ClickableTableRow>
                    ))
                  )}
                </tbody>
              </table>
            </DndContext>
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

function SortableProductRow({
  product,
  canDeleteProducts,
  selectedIds,
  onToggleSelect,
  currencySymbol,
  numClass,
  locale,
  tPages,
  tCommon,
  updatingId,
  onStatusChange,
}: {
  product: Product;
  canDeleteProducts: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  currencySymbol: string;
  numClass: string;
  locale: string;
  tPages: ReturnType<typeof useTranslations<"pages">>;
  tCommon: ReturnType<typeof useTranslations<"common">>;
  updatingId: string | null;
  onStatusChange: (product: Product, is_active: boolean) => void;
}) {
  const tPagesSafe = tPages as (k: string, v?: Record<string, string>) => string;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.public_id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.92 : undefined,
  };

  return (
    <ClickableTableRow
      ref={setNodeRef}
      style={style}
      href={`/products/${product.public_id}`}
      aria-label={product.name}
    >
      <td className="w-10 px-2 py-3 align-middle" data-row-nav-ignore>
        <button
          type="button"
          className="inline-flex cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
          aria-label={tPagesSafe("productsListDragHandle")}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 shrink-0" />
        </button>
      </td>
      <ProductRowCells
        product={product}
        canDeleteProducts={canDeleteProducts}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        currencySymbol={currencySymbol}
        numClass={numClass}
        locale={locale}
        tPages={tPages}
        tCommon={tCommon}
        updatingId={updatingId}
        onStatusChange={onStatusChange}
      />
    </ClickableTableRow>
  );
}

function ProductRowCells({
  product,
  canDeleteProducts,
  selectedIds,
  onToggleSelect,
  currencySymbol,
  numClass,
  locale,
  tPages,
  tCommon,
  updatingId,
  onStatusChange,
}: {
  product: Product;
  canDeleteProducts: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  currencySymbol: string;
  numClass: string;
  locale: string;
  tPages: ReturnType<typeof useTranslations<"pages">>;
  tCommon: ReturnType<typeof useTranslations<"common">>;
  updatingId: string | null;
  onStatusChange: (product: Product, is_active: boolean) => void;
}) {
  const tPagesSafe = tPages as (k: string, v?: Record<string, string>) => string;
  return (
    <>
      <td className="w-10 px-4 py-3">
        {canDeleteProducts && (
          <input
            type="checkbox"
            checked={selectedIds.has(product.public_id)}
            onChange={() => onToggleSelect(product.public_id)}
            className="form-checkbox"
            aria-label={tPagesSafe("productsListSelectRowAria", {
              name: product.name,
            })}
          />
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="flex max-w-xs items-center font-medium text-foreground">
          <span className="truncate">{product.name}</span>
        </span>
      </td>
      <td className="px-4 py-3 text-foreground whitespace-nowrap">
        {product.brand || "—"}
      </td>
      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
        {product.category_name ?? "—"}
      </td>
      <td className={cn("px-4 py-3 whitespace-nowrap text-foreground", numClass)}>
        {currencySymbol}
        {Number(product.price).toLocaleString()}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {product.variant_count && product.variant_count > 0 ? (
          <div className="flex flex-col gap-0.5">
            <span
              className={cn(
                "text-sm font-medium",
                numClass,
                (product.total_stock ?? 0) === 0
                  ? "text-destructive"
                  : "text-foreground"
              )}
            >
              {product.total_stock ?? product.available_quantity ?? 0}
            </span>
            <ClickableText
              href={`/variants?product_public_id=${encodeURIComponent(product.public_id)}`}
              className="text-xs underline-offset-2"
              title={tPagesSafe("productsListVariantStockTitle")}
            >
              {tPagesSafe("productsListVariantsManage", {
                count: toLocaleDigits(String(product.variant_count), locale),
              })}
            </ClickableText>
          </div>
        ) : (
          <span
            className={cn(
              "text-sm font-medium",
              numClass,
              (product.total_stock ?? product.available_quantity ?? 0) === 0
                ? "text-destructive"
                : "text-foreground"
            )}
            title={tPagesSafe("productsListStockManagedFromInventoryTitle")}
          >
            {product.total_stock ?? product.available_quantity ?? 0}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
        {(product.prepayment_type ?? "none") === "delivery_only"
          ? tPagesSafe("productPrepaymentTypeDeliveryOnly")
          : (product.prepayment_type ?? "none") === "full"
            ? tPagesSafe("productPrepaymentTypeFull")
            : tPagesSafe("productPrepaymentTypeNone")}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <Combobox
          modal={false}
          value={product.is_active ? "active" : "inactive"}
          onValueChange={(value) => {
            if (!value) return;
            onStatusChange(product, value === "active");
          }}
          disabled={updatingId === product.public_id}
        >
          <ComboboxInput
            placeholder={tPagesSafe("productsListStatusPlaceholder")}
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
    </>
  );
}
