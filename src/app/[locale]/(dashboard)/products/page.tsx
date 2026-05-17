"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { DeferredNavLink } from "@/components/navigation/DeferredNavLink";
import { toLocaleDigits } from "@/lib/locale-digits";
import { cursorFromLink } from "@/lib/cursor-from-link";
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
import { FunnelIcon, GripVertical, Loader2, Undo2 } from "lucide-react";
import api from "@/lib/api";
import { useBranding } from "@/context/BrandingContext";
import type { AdminCategoryTreeNode, Product, PaginatedResponse } from "@/types";
import { flattenCategoryOptionsRich } from "@/lib/category-tree";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { ClickableText } from "@/components/ui/clickable-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterBar } from "@/components/filters/FilterBar";
import { FilterDropdown } from "@/components/filters/FilterDropdown";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useHorizontalWheelScroll } from "@/hooks/useHorizontalWheelScroll";
import { useFilters } from "@/hooks/useFilters";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { notify } from "@/notifications";
import { useAdminDeleteCapabilities } from "@/hooks/useAdminDeleteCapabilities";
import { useNavCounts } from "@/hooks/useNavCounts";
import { numberTextClass } from "@/lib/number-font";
import { cn } from "@/lib/utils";
import { BelowFoldScrollHint } from "@/components/BelowFoldScrollHint";
import { usePageLoadingBar } from "@/hooks/usePageLoadingBar";
import { useProductsQuery } from "@/hooks/useProductsQuery";
import { productsListQueryKey } from "@/lib/query-keys";
import { useQueryClient } from "@tanstack/react-query";

type CategoryOption = { value: string; label: string; labelDisplay: ReactNode };

async function fetchAllProductPublicIdsInCategory(
  categoryPublicId: string
): Promise<string[]> {
  const rows: Product[] = [];
  let cursor: string | null = null;
  for (;;) {
    const params: Record<string, string> = { category: categoryPublicId };
    if (cursor) params.cursor = cursor;
    const res = await api.get<PaginatedResponse<Product>>("admin/products/", {
      params,
    });
    rows.push(...res.data.results);
    const next = res.data.next ? cursorFromLink(res.data.next) : null;
    if (!next) break;
    cursor = next;
  }
  rows.sort(
    (a, b) =>
      (a.display_order ?? 0) - (b.display_order ?? 0) ||
      (a.name || "").localeCompare(b.name || "") ||
      (a.public_id || "").localeCompare(b.public_id || "")
  );
  return rows.map((x) => x.public_id);
}

export default function ProductsPage() {
  const router = useRouter();
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const tNav = useTranslations("nav");
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const { currencySymbol } = useBranding();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { filters, setFilter, clearFilters } = useFilters([
    "status",
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { counts: navCounts } = useNavCounts();
  const [listCursor, setListCursor] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const reorderBusyRef = useRef(false);
  const setScrollContainer = useHorizontalWheelScroll<HTMLDivElement>();
  const { canDelete: canDeleteProducts, isSuperuser: deleteIsSuperuser } =
    useAdminDeleteCapabilities();

  const listParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (listCursor) params.cursor = listCursor;
    if (filters.status) params.status = filters.status;
    if (filters.prepayment_type) params.prepayment_type = filters.prepayment_type;
    if (filters.category) params.category = filters.category;
    if (filters.price_min) params.price_min = filters.price_min;
    if (filters.price_max) params.price_max = filters.price_max;
    if (filters.search) params.search = filters.search;
    if (filters.ordering) {
      params.ordering = filters.ordering;
    } else if (
      filters.category &&
      !filters.search &&
      !filters.status &&
      !filters.prepayment_type &&
      !filters.price_min &&
      !filters.price_max
    ) {
      params.ordering = "display_order";
    }
    return params;
  }, [
    listCursor,
    filters.category,
    filters.ordering,
    filters.prepayment_type,
    filters.price_max,
    filters.price_min,
    filters.search,
    filters.status,
  ]);

  const { data: productsPage, isLoading, isError, error } = useProductsQuery(listParams);
  usePageLoadingBar(isLoading);

  const products = productsPage?.results ?? [];
  const productsCount =
    typeof productsPage?.count === "number" ? productsPage.count : null;
  const nextLink = productsPage?.next ?? null;
  const prevLink = productsPage?.previous ?? null;

  const invalidateProductsList = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["products", "list"] });
  }, [queryClient]);

  const patchProductsList = useCallback(
    (updater: (results: Product[]) => Product[]) => {
      queryClient.setQueryData(
        productsListQueryKey(listParams),
        (old: PaginatedResponse<Product> | undefined) => {
          if (!old) return old;
          return { ...old, results: updater(old.results) };
        }
      );
    },
    [queryClient, listParams]
  );

  useEffect(() => {
    if (!isError || !error) return;
    notify.error(error, {
      title: tPages("toastTitleProductsFailedToLoad"),
      fallbackMessage: tPages("toastDescProductsFailedToLoad"),
    });
  }, [isError, error, tPages]);

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
        notify.error(err, {
          title: tPages("toastTitleCategoriesUnavailable"),
          fallbackMessage: tPages("toastDescCategoriesUnavailable"),
        });
      });
    return () => {
      active = false;
    };
  }, [tPages]);

  const categoryOptions = useMemo<CategoryOption[]>(
    () => flattenCategoryOptionsRich(categoryTree),
    [categoryTree]
  );

  const sortPillOptions: { value: string; label: string }[] = [
    { value: "", label: tPages("productsListSortPlaceholder") },
    { value: "newest", label: tPages("productsListSortNewest") },
    { value: "price_asc", label: tPages("productsListSortPriceAsc") },
    { value: "price_desc", label: tPages("productsListSortPriceDesc") },
    { value: "popularity", label: tPages("productsListSortPopularity") },
  ];

  useLayoutEffect(() => {
    setListCursor(null);
  }, [
    filters.category,
    filters.price_max,
    filters.price_min,
    filters.prepayment_type,
    filters.search,
    filters.ordering,
    filters.status,
  ]);

  const filtersActive = Boolean(
    (filters.status || "").trim() ||
      (filters.prepayment_type || "").trim() ||
      (filters.category || "").trim() ||
      (filters.price_min || "").trim() ||
      (filters.price_max || "").trim() ||
      (filters.search || "").trim()
  );

  useEffect(() => {
    if (!filtersActive) setFiltersOpen(false);
  }, [
    filters.category,
    filters.prepayment_type,
    filters.price_max,
    filters.price_min,
    filters.search,
    filters.status,
  ]);

  const canReorder = useMemo(() => {
    if (!filters.category) return false;
    if (filters.search || filters.status) return false;
    if (filters.prepayment_type) return false;
    if (filters.price_min || filters.price_max) return false;
    const ord = filters.ordering;
    if (ord && ord !== "display_order") return false;
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
      patchProductsList(() => reorderedPage);

      const catId = filters.category;
      try {
        const fullIds = await fetchAllProductPublicIdsInCategory(catId);
        const sliceIds = reorderedPage.map((p) => p.public_id);
        const positions = sliceIds
          .map((id) => fullIds.indexOf(id))
          .filter((i) => i >= 0);
        if (positions.length === 0) {
          reorderBusyRef.current = false;
          return;
        }
        positions.sort((a, b) => a - b);
        const contiguous = positions.every(
          (p, i) => i === 0 || p === positions[i - 1] + 1
        );
        if (!contiguous) {
          notify.error(new Error("reorder_range"), {
            title: tPages("toastTitleReorderBlocked"),
            fallbackMessage: tPages("toastDescReorderBlocked"),
          });
          invalidateProductsList();
          return;
        }
        const start = positions[0];
        const merged = [...fullIds];
        for (let i = 0; i < sliceIds.length; i++) {
          merged[start + i] = sliceIds[i];
        }
        await api.post("admin/products/reorder/", {
          category_public_id: catId,
          product_public_ids: merged,
        });
        invalidateProductsList();
      } catch (err) {
        notify.error(err, {
          title: tPages("toastTitleNewOrderNotSaved"),
          fallbackMessage: tPages("toastDescNewOrderNotSaved"),
        });
        invalidateProductsList();
      } finally {
        reorderBusyRef.current = false;
      }
    },
    [canReorder, filters.category, products, invalidateProductsList, patchProductsList, tPages]
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
      notify.success(tPages("toastDescProductsRemoved"), {
        title: tPages("toastTitleProductsRemoved"),
      });
      invalidateProductsList();
    } catch (err) {
      notify.error(err, {
        title: tPages("toastTitleBulkDeleteIncomplete"),
        fallbackMessage: tPages("toastDescBulkDeleteIncomplete"),
      });
    } finally {
      setDeleting(false);
    }
  }

  async function updateProduct(product: Product, payload: { is_active?: boolean }) {
    setUpdatingId(product.public_id);
    try {
      await api.patch(`admin/products/${product.public_id}/`, payload);
      patchProductsList((prev) =>
        prev.map((p) =>
          p.public_id === product.public_id ? { ...p, ...payload } : p
        )
      );
    } catch (err) {
      notify.error(err, {
        title: tPages("toastTitleProductStatusNotSaved"),
        fallbackMessage: tPages("toastDescProductStatusNotSaved"),
      });
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

  const pageProductsCount = products.length;
  const totalProductsCount = filtersActive
    ? productsCount ?? null
    : productsCount ?? navCounts?.products ?? null;

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
            {tNav("products")}
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
          <DeferredNavLink
            href="/products/new"
            className="rounded-card bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            {tPages("addProduct")}
          </DeferredNavLink>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {sortPillOptions.map((opt) => {
            const active = (filters.ordering || "") === opt.value;
            return (
              <button
                key={opt.value || "__default__"}
                type="button"
                onClick={() => setFilter("ordering", opt.value)}
                aria-pressed={active}
                className={[
                  "h-9 rounded-ui border px-3 text-sm font-medium transition whitespace-nowrap",
                  active
                    ? "border-primary/40 bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-muted",
                ].join(" ")}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 px-3"
          aria-label="Toggle filters"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <FunnelIcon className="size-4" aria-hidden />
        </Button>
      </div>

      {!isLoading ? (
        <p className="text-xs text-muted-foreground">
          {totalProductsCount === null
            ? tPages("productsListCountPageOnly", { pageCount: pageProductsCount })
            : tPages("productsListCountWithTotal", {
                pageCount: pageProductsCount,
                totalCount: totalProductsCount,
              })}
        </p>
      ) : null}

      {filtersOpen ? (
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
      ) : null}

      {!isLoading && canReorder && (
        <p className="flex items-start gap-2 rounded-card border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">
          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          {tPages("productsListReorderHintActive")}
        </p>
      )}
      {!isLoading && !canReorder && filters.category && (
        <p className="rounded-card border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {tPages("productsListReorderHintDisabled")}
        </p>
      )}
      {!isLoading ? (
        <>
          <div
            ref={setScrollContainer}
            className="overflow-x-auto rounded-card border border-card-border bg-card"
          >
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

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!prevLink}
              onClick={() => setListCursor(cursorFromLink(prevLink))}
            >
              {tPages("supportTicketsPrevious")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!nextLink}
              onClick={() => setListCursor(cursorFromLink(nextLink))}
            >
              {tPages("supportTicketsNext")}
            </Button>
          </div>
        </>
      ) : null}
      <BelowFoldScrollHint />
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
