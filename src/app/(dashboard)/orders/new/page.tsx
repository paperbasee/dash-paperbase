"use client";

import { Undo2, Plus, Trash2 } from "lucide-react";
import { useBranding } from "@/context/BrandingContext";
import { ExtraFieldsFormSection } from "@/components/ExtraFieldsFormSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { useNewOrder, DELIVERY_OPTIONS } from "./useNewOrder";

export default function NewOrderPage() {
  const { currencySymbol } = useBranding();
  const {
    saving,
    error,
    form,
    updateForm,
    extraFields,
    setExtraFields,
    extraFieldsErrors,
    extraFieldsSchema,
    items,
    query,
    results,
    searching,
    showResults,
    setShowResults,
    searchRef,
    variantsByProductId,
    variantsLoadingByProductId,
    shippingZones,
    shippingMethods,
    total,
    handleSearch,
    addProduct,
    updateItem,
    removeItem,
    ensureVariantsLoaded,
    handleSubmit,
    router,
  } = useNewOrder();

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
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
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
          <Button
            type="submit"
            form="order-form"
            disabled={saving || items.length === 0}
            className="gap-2"
          >
            <Plus className="size-4" />
            {saving ? "Creating..." : "Create Order"}
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
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
                <FormField label="Shipping method">
                  <Select
                    value={form.shipping_method}
                    onChange={(e) => updateForm({ shipping_method: e.target.value })}
                  >
                    <option value="">Auto (cheapest match)</option>
                    {shippingMethods.map((m) => (
                      <option key={m.id} value={String(m.id)}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField label="Shipping zone">
                  <Select
                    value={form.shipping_zone}
                    onChange={(e) => updateForm({ shipping_zone: e.target.value })}
                  >
                    <option value="">Auto (match by district/area)</option>
                    {shippingZones.map((z) => (
                      <option key={z.id} value={String(z.id)}>
                        {z.name}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField label="Name" required>
                  <Input
                    type="text"
                    required
                    value={form.shipping_name}
                    onChange={(e) => updateForm({ shipping_name: e.target.value })}
                    placeholder="Customer name"
                  />
                </FormField>

                <FormField label="Phone" required>
                  <Input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => updateForm({ phone: e.target.value })}
                    placeholder="01XXXXXXXXX"
                  />
                </FormField>

                <FormField label="Email">
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm({ email: e.target.value })}
                    placeholder="customer@example.com"
                  />
                </FormField>

                <FormField label="District">
                  <Input
                    type="text"
                    value={form.district}
                    onChange={(e) => updateForm({ district: e.target.value })}
                    placeholder="Dhaka"
                  />
                </FormField>

                <div className="sm:col-span-2">
                  <FormField label="Address" required>
                    <textarea
                      required
                      rows={2}
                      value={form.shipping_address}
                      onChange={(e) => updateForm({ shipping_address: e.target.value })}
                      className="input"
                      placeholder="Full shipping address"
                    />
                  </FormField>
                </div>

                <FormField label="Delivery area" required>
                  <Select
                    required
                    value={form.delivery_area}
                    onChange={(e) => updateForm({ delivery_area: e.target.value })}
                  >
                    {DELIVERY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField label="Tracking number">
                  <Input
                    value={form.tracking_number}
                    onChange={(e) => updateForm({ tracking_number: e.target.value })}
                    placeholder="Optional"
                  />
                </FormField>
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
                <Input
                  type="text"
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => results.length > 0 && setShowResults(true)}
                  placeholder="Search products…"
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}

                {showResults && results.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto border border-card-border bg-card shadow-lg">
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
                            {currencySymbol}
                            {Number(product.price).toLocaleString()} · Stock:{" "}
                            {product.stock}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="overflow-x-auto border border-border/70">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="th">Product</th>
                      <th className="th">Variant</th>
                      <th className="th">Qty</th>
                      <th className="th">Price</th>
                      <th className="th text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-8 text-center text-sm text-muted-foreground"
                        >
                          Add products above to create line items.
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => {
                        const variants = variantsByProductId[item.product_id] ?? [];
                        const loadingVariants =
                          variantsLoadingByProductId[item.product_id] ?? false;
                        const selectedVariant =
                          item.variant_id != null
                            ? variants.find((v) => v.id === item.variant_id) ?? null
                            : null;
                        return (
                          <tr key={item.key} className="bg-card">
                            <td className="px-3 py-2">
                              <p className="truncate font-medium text-foreground">
                                {item.product_name}
                              </p>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <Select
                                  size="sm"
                                  className="w-[190px]"
                                  value={
                                    item.variant_id == null
                                      ? ""
                                      : String(item.variant_id)
                                  }
                                  onFocus={() =>
                                    ensureVariantsLoaded(item.product_id)
                                  }
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    updateItem(
                                      item.key,
                                      "variant_id",
                                      raw ? Number(raw) : null
                                    );
                                  }}
                                  disabled={loadingVariants}
                                >
                                  <option value="">
                                    {loadingVariants ? "Loading…" : "Default"}
                                  </option>
                                  {variants.map((v) => (
                                    <option key={v.id} value={String(v.id)}>
                                      {(v.option_labels?.join(" · ") || v.sku) ??
                                        `#${v.id}`}
                                    </option>
                                  ))}
                                </Select>

                                {selectedVariant && (
                                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                                    Stock: {selectedVariant.stock_quantity}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                size="sm"
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
                                className="w-20 text-center"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                size="sm"
                                type="number"
                                step="0.01"
                                min={0}
                                value={item.price}
                                onChange={(e) =>
                                  updateItem(item.key, "price", e.target.value)
                                }
                                className="w-28"
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
                  {currencySymbol}
                  {total.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
