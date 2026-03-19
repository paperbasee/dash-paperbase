"use client";

import { useEffect, useMemo, useState, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Undo2, Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { useBranding } from "@/context/BrandingContext";
import { ExtraFieldsFormSection, validateExtraFields } from "@/components/ExtraFieldsFormSection";
import { useExtraFieldsSchema } from "@/hooks/useExtraFieldsSchema";
import type { ExtraFieldValues } from "@/types/extra-fields";
import type {
  Product,
  PaginatedResponse,
  ProductVariant,
  ShippingMethod,
  ShippingZone,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DELIVERY_OPTIONS = [
  { value: "inside", label: "Inside Dhaka City" },
  { value: "outside", label: "Outside Dhaka City" },
];

interface OrderItemRow {
  key: number;
  product_id: string;
  product_name: string;
  product_image: string | null;
  variant_id: number | null;
  quantity: number;
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
    tracking_number: "",
    shipping_zone: "" as string,
    shipping_method: "" as string,
  });
  const [extraFields, setExtraFields] = useState<ExtraFieldValues>({});
  const [extraFieldsErrors, setExtraFieldsErrors] = useState<Record<string, string>>({});
  const { schema: extraFieldsSchema } = useExtraFieldsSchema("order");

  const [items, setItems] = useState<OrderItemRow[]>([]);
  const nextKey = useRef(0);

  // Product search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [variantsByProductId, setVariantsByProductId] = useState<Record<string, ProductVariant[]>>({});
  const [variantsLoadingByProductId, setVariantsLoadingByProductId] = useState<Record<string, boolean>>({});
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<PaginatedResponse<ShippingZone> | ShippingZone[]>("admin/shipping-zones/"),
      api.get<PaginatedResponse<ShippingMethod> | ShippingMethod[]>("admin/shipping-methods/"),
    ])
      .then(([z, m]) => {
        const zones = Array.isArray(z.data) ? z.data : z.data.results;
        const methods = Array.isArray(m.data) ? m.data : m.data.results;
        setShippingZones(zones ?? []);
        setShippingMethods(methods ?? []);
      })
      .catch(() => {
        setShippingZones([]);
        setShippingMethods([]);
      });
  }, []);

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
          "admin/products/",
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
    // Preload variants for smoother inline editing.
    ensureVariantsLoaded(product.id);
    setItems((prev) => [
      ...prev,
      {
        key: nextKey.current++,
        product_id: product.id,
        product_name: product.name,
        product_image: product.image_url ?? product.image,
        variant_id: null,
        quantity: 1,
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

  const schemaWithNames = useMemo(
    () => extraFieldsSchema.filter((f) => f.name.trim()),
    [extraFieldsSchema],
  );

  async function ensureVariantsLoaded(productId: string) {
    if (variantsByProductId[productId]) return;
    setVariantsLoadingByProductId((p) => ({ ...p, [productId]: true }));
    try {
      const { data } = await api.get<PaginatedResponse<ProductVariant> | ProductVariant[]>(
        "admin/product-variants/",
        { params: { product: productId } },
      );
      const list = Array.isArray(data) ? data : data.results;
      setVariantsByProductId((p) => ({ ...p, [productId]: list ?? [] }));
    } catch {
      setVariantsByProductId((p) => ({ ...p, [productId]: [] }));
    } finally {
      setVariantsLoadingByProductId((p) => ({ ...p, [productId]: false }));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      setError("Add at least one product to the order.");
      return;
    }

    const extraErrors = validateExtraFields(schemaWithNames, extraFields);
    if (Object.keys(extraErrors).length > 0) {
      setExtraFieldsErrors(extraErrors);
      setError("Please fill in all required extra fields.");
      return;
    }
    setExtraFieldsErrors({});

    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        shipping_zone: form.shipping_zone ? Number(form.shipping_zone) : null,
        shipping_method: form.shipping_method ? Number(form.shipping_method) : null,
        items: items.map((item) => ({
          product: item.product_id,
          variant: item.variant_id,
          quantity: item.quantity,
          price: item.price,
        })),
        ...(Object.keys(extraFields).length > 0 && { extra_data: extraFields }),
      };
      await api.post("admin/orders/", payload);
      router.push("/orders");
    } catch {
      setError("Failed to create order. Please check the details and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted/80 px-1 py-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Back to orders"
              onClick={() => router.back()}
              className="shrink-0"
            >
              <Undo2 className="size-4" />
            </Button>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              Add Order
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create an order and manage its line items (admin-style).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" form="order-form" disabled={saving || items.length === 0} className="gap-2">
            <Plus className="size-4" />
            {saving ? "Creating..." : "Create Order"}
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <form
        id="order-form"
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-border/50">
              <CardTitle>Order details</CardTitle>
              <CardDescription>Customer and shipping information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Shipping method">
                <select
                  value={form.shipping_method}
                  onChange={(e) => setForm({ ...form, shipping_method: e.target.value })}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Auto (cheapest match)</option>
                  {shippingMethods.map((m) => (
                    <option key={m.id} value={String(m.id)}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Shipping zone">
                <select
                  value={form.shipping_zone}
                  onChange={(e) => setForm({ ...form, shipping_zone: e.target.value })}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Auto (match by district/area)</option>
                  {shippingZones.map((z) => (
                    <option key={z.id} value={String(z.id)}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </Field>
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
                <Field label="Delivery area" required>
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
                <Field label="Tracking number">
                  <input
                    value={form.tracking_number}
                    onChange={(e) =>
                      setForm({ ...form, tracking_number: e.target.value })
                    }
                    className="input"
                    placeholder="Optional"
                  />
                </Field>
              </div>

              {extraFieldsSchema.some((f) => f.name.trim()) && (
                <div className="border-t border-border pt-4">
                  <h3 className="mb-3 text-sm font-medium text-foreground">
                    Extra Fields
                  </h3>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Custom fields defined in Settings → Dynamic Fields.
                  </p>
                  <ExtraFieldsFormSection
                    entityType="order"
                    values={extraFields}
                    onChange={setExtraFields}
                    errors={extraFieldsErrors}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-border/50">
              <CardTitle>Order items</CardTitle>
              <CardDescription>Inline line items (admin-style)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div ref={searchRef} className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => results.length > 0 && setShowResults(true)}
                  className="input"
                  placeholder="Search products…"
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}

                {showResults && results.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-card-border bg-card shadow-lg">
                    {results.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addProduct(product)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted"
                      >
                        {(product.image_url || product.image) && (
                          <img
                            src={(product.image_url || product.image)!}
                            alt={product.name}
                            className="h-8 w-8 rounded object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">
                            {product.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {currencySymbol}{Number(product.price).toLocaleString()} · Stock:{" "}
                            {product.stock}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="overflow-x-auto rounded-lg border border-border/70">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Product
                      </th>
                      <th className="px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Variant
                      </th>
                      <th className="px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Qty
                      </th>
                      <th className="px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Price
                      </th>
                      <th className="px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase text-right">
                        Delete
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">
                          Add products above to create line items.
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => {
                        const variants = variantsByProductId[item.product_id] ?? [];
                        const loadingVariants = variantsLoadingByProductId[item.product_id] ?? false;
                        const selectedVariant =
                          item.variant_id != null
                            ? variants.find((v) => v.id === item.variant_id) ?? null
                            : null;
                        return (
                          <tr key={item.key} className="bg-card">
                            <td className="px-3 py-2">
                              <div className="min-w-0">
                                <p className="truncate font-medium text-foreground">
                                  {item.product_name}
                                </p>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <select
                                  className="input !h-8 !py-1 w-[190px]"
                                  value={item.variant_id == null ? "" : String(item.variant_id)}
                                  onFocus={() => ensureVariantsLoaded(item.product_id)}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const next = raw ? Number(raw) : null;
                                    updateItem(item.key, "variant_id", next);
                                  }}
                                  disabled={loadingVariants}
                                >
                                  <option value="">
                                    {loadingVariants ? "Loading…" : "Default"}
                                  </option>
                                  {variants.map((v) => (
                                    <option key={v.id} value={String(v.id)}>
                                      {(v.option_labels?.join(" · ") || v.sku) ?? `#${v.id}`}
                                    </option>
                                  ))}
                                </select>

                                {selectedVariant && (
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    Stock: {selectedVariant.stock_quantity}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2">
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
                                className="input !h-8 !py-1 w-20 text-center"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="0.01"
                                min={0}
                                value={item.price}
                                onChange={(e) =>
                                  updateItem(item.key, "price", e.target.value)
                                }
                                className="input !h-8 !py-1 w-28"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(item.key)}
                                className="text-muted-foreground hover:text-destructive"
                                aria-label="Remove item"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-semibold text-foreground">
                  {currencySymbol}{total.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
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
      <label className="mb-1 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {children}
    </div>
  );
}
