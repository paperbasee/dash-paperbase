"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import api from "@/lib/api";
import { useBranding } from "@/context/BrandingContext";
import type { Product, PaginatedResponse } from "@/types";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

export default function ProductsPage() {
  const router = useRouter();
  const { currencySymbol } = useBranding();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    api
      .get<PaginatedResponse<Product>>("admin/products/", {
        params: { page },
      })
      .then((res) => {
        setProducts(res.data.results);
        setCount(res.data.count);
        setHasNext(!!res.data.next);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

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
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  async function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected product(s) permanently?`)) return;
    setDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => api.delete(`admin/products/${id}/`))
      );
      setSelectedIds(new Set());
      fetchProducts();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }

  async function updateProduct(id: string, payload: { stock?: number; is_active?: boolean }) {
    setUpdatingId(id);
    try {
      await api.patch(`admin/products/${id}/`, payload);
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, ...payload } : p
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
      updateProduct(product.id, { is_active });
    }
  }

  const allSelected = products.length > 0 && selectedIds.size === products.length;
  const someSelected = selectedIds.size > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted/80 px-1 py-1">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          </div>
          <h1 className="text-2xl font-medium text-foreground">
            Products ({count})
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {someSelected && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive/90 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : `Delete selected (${selectedIds.size})`}
            </button>
          )}
          <Link
            href="/products/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Add Product
          </Link>
        </div>
      </div>

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
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      aria-label="Select all products on this page"
                    />
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase whitespace-nowrap">
                    Product
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase whitespace-nowrap">
                    Brand
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase whitespace-nowrap">
                    Category
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase whitespace-nowrap">
                    Price
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase whitespace-nowrap">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase whitespace-nowrap">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-muted/40">
                    <td className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                        aria-label={`Select ${product.name}`}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        href={`/products/${product.id}`}
                        className="flex items-center gap-3"
                      >
                        {product.image_url && (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <span className="font-medium text-primary hover:underline truncate max-w-xs">
                          {product.name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      {product.brand}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {product.category_name}
                    </td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      {currencySymbol}{Number(product.price).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          value={product.stock}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            setProducts((prev) =>
                              prev.map((p) =>
                                p.id === product.id ? { ...p, stock: Number.isNaN(v) ? 0 : Math.max(0, v) } : p
                              )
                            );
                          }}
                          onBlur={() => updateProduct(product.id, { stock: product.stock })}
                          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                          className={`w-16 rounded border px-2 py-1 text-sm ${
                            product.stock === 0
                              ? "border-destructive text-destructive"
                              : "border-input text-foreground"
                          } focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring`}
                          disabled={updatingId === product.id}
                        />
                        {updatingId === product.id && (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Combobox
                        value={product.is_active ? "active" : "inactive"}
                        onValueChange={(_, value) =>
                          handleStatusChange(product, value === "active")
                        }
                        disabled={updatingId === product.id}
                      >
                        <ComboboxInput
                          placeholder="Status"
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
                                Active
                              </span>
                            </ComboboxItem>
                            <ComboboxItem value="inactive">
                              <span className="text-xs font-medium capitalize">
                                Inactive
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
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <button
              disabled={!hasNext}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
