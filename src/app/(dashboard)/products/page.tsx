"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useBranding } from "@/context/BrandingContext";
import type { Product, PaginatedResponse } from "@/types";

export default function ProductsPage() {
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
      .get<PaginatedResponse<Product>>("/api/admin/products/", {
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
        Array.from(selectedIds).map((id) => api.delete(`/api/admin/products/${id}/`))
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
      await api.patch(`/api/admin/products/${id}/`, payload);
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
        <h1 className="text-2xl font-medium text-gray-900">
          Products ({count})
        </h1>
        <div className="flex items-center gap-2">
          {someSelected && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : `Delete selected (${selectedIds.size})`}
            </button>
          )}
          <Link
            href="/products/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
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
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      aria-label="Select all products on this page"
                    />
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-gray-500 uppercase whitespace-nowrap">Product</th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-gray-500 uppercase whitespace-nowrap">Brand</th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-gray-500 uppercase whitespace-nowrap">Category</th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-gray-500 uppercase whitespace-nowrap">Price</th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-gray-500 uppercase whitespace-nowrap">Stock</th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-gray-500 uppercase whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                        <span className="font-medium text-blue-600 hover:underline truncate max-w-xs">
                          {product.name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{product.brand}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{product.category_name}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
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
                            product.stock === 0 ? "border-red-300 text-red-600" : "border-gray-300 text-gray-700"
                          } focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                          disabled={updatingId === product.id}
                        />
                        {updatingId === product.id && (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <select
                        value={product.is_active ? "active" : "inactive"}
                        onChange={(e) => handleStatusChange(product, e.target.value === "active")}
                        disabled={updatingId === product.id}
                        className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                          product.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        } disabled:opacity-70`}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
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
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">Page {page}</span>
            <button
              disabled={!hasNext}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
