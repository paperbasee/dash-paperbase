"use client";

import { useEffect, useState, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useBranding } from "@/context/BrandingContext";
import type { Product, PaginatedResponse } from "@/types";

const DELIVERY_OPTIONS = [
  { value: "inside", label: "Inside Dhaka City" },
  { value: "outside", label: "Outside Dhaka City" },
];

interface OrderItemRow {
  key: number;
  product_id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  size: string;
  price: string;
}

export default function NewOrderPage() {
  const router = useRouter();
  const { currencySymbol } = useBranding();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    shipping_name: "",
    phone: "",
    email: "",
    shipping_address: "",
    district: "",
    delivery_area: "inside",
  });

  const [items, setItems] = useState<OrderItemRow[]>([]);
  const nextKey = useRef(0);

  // Product search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearch(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get<PaginatedResponse<Product>>(
          "/api/admin/products/",
          { params: { search: value.trim() } }
        );
        setResults(data.results);
        setShowResults(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  function addProduct(product: Product) {
    setItems((prev) => [
      ...prev,
      {
        key: nextKey.current++,
        product_id: product.id,
        product_name: product.name,
        product_image: product.image_url ?? product.image,
        quantity: 1,
        size: "",
        price: product.price,
      },
    ]);
    setQuery("");
    setResults([]);
    setShowResults(false);
  }

  function updateItem(key: number, field: keyof OrderItemRow, value: string | number) {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, [field]: value } : item))
    );
  }

  function removeItem(key: number) {
    setItems((prev) => prev.filter((item) => item.key !== key));
  }

  const total = items.reduce(
    (sum, item) => sum + Number(item.price || 0) * item.quantity,
    0
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      setError("Add at least one product to the order.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        items: items.map((item) => ({
          product: item.product_id,
          quantity: item.quantity,
          size: item.size,
          price: item.price,
        })),
      };
      await api.post("/api/admin/orders/", payload);
      router.push("/orders");
    } catch {
      setError("Failed to create order. Please check the details and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          &larr; Back
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">New Order</h1>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer info */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Customer Information
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name" required>
              <input
                type="text"
                required
                value={form.shipping_name}
                onChange={(e) =>
                  setForm({ ...form, shipping_name: e.target.value })
                }
                className="input"
                placeholder="Customer name"
              />
            </Field>
            <Field label="Phone" required>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input"
                placeholder="01XXXXXXXXX"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
                placeholder="customer@example.com"
              />
            </Field>
            <Field label="District">
              <input
                type="text"
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                className="input"
                placeholder="Dhaka"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Address" required>
                <textarea
                  required
                  rows={2}
                  value={form.shipping_address}
                  onChange={(e) =>
                    setForm({ ...form, shipping_address: e.target.value })
                  }
                  className="input"
                  placeholder="Full shipping address"
                />
              </Field>
            </div>
            <Field label="Delivery Area" required>
              <select
                required
                value={form.delivery_area}
                onChange={(e) =>
                  setForm({ ...form, delivery_area: e.target.value })
                }
                className="input"
              >
                {DELIVERY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        {/* Order items */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Order Items
          </h2>

          {/* Product search */}
          <div ref={searchRef} className="relative mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => results.length > 0 && setShowResults(true)}
              className="input"
              placeholder="Search products by name..."
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              </div>
            )}

            {showResults && results.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {results.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-50"
                  >
                    {(product.image_url || product.image) && (
                      <img
                        src={(product.image_url || product.image)!}
                        alt={product.name}
                        className="h-8 w-8 rounded object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-900">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {currencySymbol}{Number(product.price).toLocaleString()} &middot;
                        Stock: {product.stock}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showResults && query.trim().length >= 2 && results.length === 0 && !searching && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-lg">
                No products found
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
              Search and add products above
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.key}
                  className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3"
                >
                  {item.product_image && (
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {item.product_name}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <div className="w-20">
                        <label className="mb-0.5 block text-xs text-gray-500">
                          Qty
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(
                              item.key,
                              "quantity",
                              Math.max(1, parseInt(e.target.value) || 1)
                            )
                          }
                          className="input !py-1 text-center"
                        />
                      </div>
                      <div className="w-24">
                        <label className="mb-0.5 block text-xs text-gray-500">
                          Size
                        </label>
                        <input
                          type="text"
                          value={item.size}
                          onChange={(e) =>
                            updateItem(item.key, "size", e.target.value)
                          }
                          className="input !py-1"
                          placeholder="S, M, L..."
                        />
                      </div>
                      <div className="w-28">
                        <label className="mb-0.5 block text-xs text-gray-500">
                          Price ({currencySymbol})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={item.price}
                          onChange={(e) =>
                            updateItem(item.key, "price", e.target.value)
                          }
                          className="input !py-1"
                        />
                      </div>
                      <div className="flex items-end">
                        <p className="pb-1 text-sm font-medium text-gray-700">
                          = {currencySymbol}
                          {(
                            Number(item.price || 0) * item.quantity
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.key)}
                    className="mt-1 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-600"
                    title="Remove item"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}

              <div className="flex justify-end border-t border-gray-200 pt-3">
                <p className="text-lg font-bold text-gray-900">
                  Total: {currencySymbol}{total.toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || items.length === 0}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Order"}
          </button>
        </div>
      </form>
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
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}
