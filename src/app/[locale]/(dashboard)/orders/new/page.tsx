"use client";

import { useLocale, useTranslations } from "next-intl";
import { Loader2, Undo2, Trash } from "lucide-react";
import { useBranding } from "@/context/BrandingContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { numberTextClass } from "@/lib/number-font";
import { cn } from "@/lib/utils";
import { useNewOrder } from "./useNewOrder";
import { useEnterNavigation } from "@/hooks/useEnterNavigation";

export default function NewOrderPage() {
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const { currencySymbol } = useBranding();
  const {
    saving,
    error,
    fieldErrors,
    form,
    updateForm,
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
    displayTotal,
    pricingPreview,
    handleSearch,
    addProduct,
    updateItem,
    removeItem,
    ensureVariantsLoaded,
    handleSubmit,
    router,
  } = useNewOrder();
  const hasItemInlineErrors = Object.keys(fieldErrors).some(
    (k) => k === "items" || k.startsWith("items."),
  );
  const { handleKeyDown } = useEnterNavigation(() => {
    const form = document.getElementById("order-form");
    if (form instanceof HTMLFormElement) form.requestSubmit();
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-card bg-muted/80 px-1 py-1 hidden md:block">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label={tPages("orderNewBackAria")}
              className="flex shrink-0 items-center justify-center rounded-ui p-1 text-muted-foreground hover:bg-muted"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {tPages("orderNewTitle")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground md:hidden">
              {tPages("orderNewSubtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            {tCommon("cancel")}
          </Button>
          <Button
            type="submit"
            form="order-form"
            disabled={saving || items.length === 0}
            className="gap-2"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            {tPages("orderNewCreateOrder")}
          </Button>
        </div>
      </div>

      <p className="hidden text-sm text-muted-foreground md:block">
        {tPages("orderNewSubtitle")}
      </p>

      {error && !hasItemInlineErrors && (
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
              <CardTitle>{tPages("orderNewOrderDetailsTitle")}</CardTitle>
              <CardDescription>{tPages("orderNewOrderDetailsDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label={tPages("orderNewShippingMethod")}>
                  <Select
                    value={form.shipping_method_public_id}
                    onChange={(e) => updateForm({ shipping_method_public_id: e.target.value })}
                    aria-invalid={!!fieldErrors.shipping_method_public_id}
                    className={cn(fieldErrors.shipping_method_public_id && "border-destructive")}
                  >
                    <option value="">{tPages("orderNewShippingMethodAuto")}</option>
                    {shippingMethods.map((m) => (
                      <option key={m.public_id} value={m.public_id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField
                  label={tPages("orderNewDeliveryZone")}
                  required
                  error={fieldErrors.shipping_zone_public_id}
                >
                  <Select
                    value={form.shipping_zone_public_id}
                    onChange={(e) => updateForm({ shipping_zone_public_id: e.target.value })}
                    aria-invalid={!!fieldErrors.shipping_zone_public_id}
                    className={cn(fieldErrors.shipping_zone_public_id && "border-destructive")}
                    required
                  >
                    <option value="">{tPages("orderNewSelectZone")}</option>
                    {shippingZones.map((z) => (
                      <option key={z.public_id} value={z.public_id}>
                        {z.name}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField label={tPages("orderNewName")} required error={fieldErrors.shipping_name}>
                  <Input
                    id="order-shipping-name"
                    type="text"
                    required
                    value={form.shipping_name}
                    onChange={(e) => updateForm({ shipping_name: e.target.value })}
                    placeholder={tPages("orderNewNamePlaceholder")}
                    aria-invalid={!!fieldErrors.shipping_name}
                    className={cn(fieldErrors.shipping_name && "border-destructive")}
                    onKeyDown={handleKeyDown}
                  />
                </FormField>

                <FormField label={tPages("orderNewPhone")} required error={fieldErrors.phone}>
                  <Input
                    id="order-phone"
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => updateForm({ phone: e.target.value })}
                    placeholder={tPages("orderNewPhonePlaceholder")}
                    aria-invalid={!!fieldErrors.phone}
                    className={cn(fieldErrors.phone && "border-destructive")}
                    onKeyDown={handleKeyDown}
                  />
                </FormField>

                <FormField label={tPages("orderNewEmail")} required error={fieldErrors.email}>
                  <Input
                    id="order-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm({ email: e.target.value })}
                    placeholder={tPages("orderNewEmailPlaceholder")}
                    aria-invalid={!!fieldErrors.email}
                    className={cn(fieldErrors.email && "border-destructive")}
                    onKeyDown={handleKeyDown}
                  />
                </FormField>

                <FormField
                  label={tPages("orderFormRoadVillage")}
                  required
                  error={fieldErrors.village}
                >
                  <Input
                    id="order-village"
                    type="text"
                    required
                    value={form.village}
                    onChange={(e) => updateForm({ village: e.target.value })}
                    placeholder={tPages("orderFormRoadVillagePlaceholder")}
                    aria-invalid={!!fieldErrors.village}
                    className={cn(fieldErrors.village && "border-destructive")}
                    onKeyDown={handleKeyDown}
                  />
                </FormField>

                <FormField
                  label={tPages("orderFormThana")}
                  required
                  error={fieldErrors.thana}
                >
                  <Input
                    id="order-thana"
                    type="text"
                    required
                    value={form.thana}
                    onChange={(e) => updateForm({ thana: e.target.value })}
                    placeholder={tPages("orderFormThanaPlaceholder")}
                    aria-invalid={!!fieldErrors.thana}
                    className={cn(fieldErrors.thana && "border-destructive")}
                    onKeyDown={handleKeyDown}
                  />
                </FormField>

                <div className="sm:col-span-2">
                  <FormField
                    label={tPages("orderFormDistrict")}
                    required
                    htmlFor="order-district"
                    error={fieldErrors.district}
                  >
                    <Input
                      id="order-district"
                      type="text"
                      required
                      value={form.district}
                      onChange={(e) => updateForm({ district: e.target.value })}
                      placeholder={tPages("orderFormDistrictPlaceholder")}
                      aria-invalid={!!fieldErrors.district}
                      className={cn(fieldErrors.district && "border-destructive")}
                      onKeyDown={handleKeyDown}
                    />
                  </FormField>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-border/50">
              <CardTitle>{tPages("orderNewItemsTitle")}</CardTitle>
              <CardDescription>{tPages("orderNewItemsDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div ref={searchRef} className="relative">
                <Input
                  type="text"
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => results.length > 0 && setShowResults(true)}
                  placeholder={tPages("orderNewSearchProductsPlaceholder")}
                  onKeyDown={handleKeyDown}
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
                        key={product.public_id}
                        type="button"
                        onClick={() => addProduct(product)}
                        disabled={!product.public_id}
                        className="flex w-full items-center px-4 py-2.5 text-left text-sm hover:bg-muted"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">
                            {product.name || tPages("orderNewProductUnavailable")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <span className={numClass}>
                              {currencySymbol}
                              {Number(product.price || 0).toLocaleString()}
                            </span>{" "}
                            · {tPages("orderNewStock")}:{" "}
                            <span className={numClass}>
                              {product.available_quantity ?? product.total_stock ?? 0}
                            </span>
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
                      <th className="th">{tPages("orderNewColProduct")}</th>
                      <th className="th">{tPages("orderNewColVariant")}</th>
                      <th className="th">{tPages("orderNewColQty")}</th>
                      <th className="th">{tPages("orderNewColPrice")}</th>
                      <th className="th text-right">{tPages("orderNewColDelete")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-8 text-center text-sm text-muted-foreground"
                        >
                          {tPages("orderNewEmptyLineItems")}
                        </td>
                      </tr>
                    ) : (
                      items.map((item, index) => {
                        const variants = variantsByProductId[item.product_public_id] ?? [];
                        const loadingVariants =
                          variantsLoadingByProductId[item.product_public_id] ?? false;
                        const selectedVariant =
                          item.variant_public_id != null
                            ? variants.find((v) => v.public_id === item.variant_public_id) ?? null
                            : null;
                        const rowVariantErr =
                          fieldErrors[`items.${index}.variant_public_id`];
                        const rowProductErr = fieldErrors[`items.${index}.product_public_id`];
                        const rowQtyErr = fieldErrors[`items.${index}.quantity`];
                        const rowPriceErr = fieldErrors[`items.${index}.unit_price`];
                        return (
                          <tr key={item.key} className="bg-card">
                            <td className="px-3 py-2">
                              <p className="truncate font-medium text-foreground">
                                {item.product_name}
                              </p>
                              {rowProductErr && (
                                <p className="mt-1 text-xs text-destructive">{rowProductErr}</p>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                <Select
                                  size="sm"
                                  className={cn(
                                    "w-[190px]",
                                    rowVariantErr && "border-destructive",
                                  )}
                                  value={item.variant_public_id ?? ""}
                                  onFocus={() =>
                                    ensureVariantsLoaded(item.product_public_id)
                                  }
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    updateItem(
                                      item.key,
                                      "variant_public_id",
                                      raw || null
                                    );
                                  }}
                                  disabled={loadingVariants}
                                  aria-invalid={!!rowVariantErr}
                                >
                                  <option value="">
                                    {loadingVariants ? tCommon("loading") : tPages("orderNewVariantDefault")}
                                  </option>
                                  {variants.map((v) => (
                                    <option key={v.public_id} value={v.public_id}>
                                      {(v.option_labels?.join(" · ") || v.sku) ??
                                        v.public_id}
                                    </option>
                                  ))}
                                </Select>

                                {selectedVariant && (
                                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                                    {tPages("orderNewStock")}:{" "}
                                    <span className={numClass}>
                                      {selectedVariant.available_quantity}
                                    </span>
                                  </span>
                                )}
                              </div>
                                {rowVariantErr && (
                                  <p className="text-xs text-destructive">{rowVariantErr}</p>
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
                                    Math.max(
                                      1,
                                      Math.min(
                                        parseInt(e.target.value) || 1,
                                        selectedVariant?.available_quantity ?? Number.MAX_SAFE_INTEGER,
                                      ),
                                    )
                                  )
                                }
                                className={cn(
                                  "w-20 text-center",
                                  numClass,
                                  rowQtyErr && "border-destructive",
                                )}
                                aria-invalid={!!rowQtyErr}
                                onKeyDown={handleKeyDown}
                              />
                              {rowQtyErr && (
                                <p className="mt-1 text-xs text-destructive">{rowQtyErr}</p>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                size="sm"
                                type="number"
                                step="0.01"
                                min={0}
                                value={item.unit_price}
                                onChange={(e) =>
                                  updateItem(item.key, "unit_price", e.target.value)
                                }
                                className={cn("w-28", numClass, rowPriceErr && "border-destructive")}
                                aria-invalid={!!rowPriceErr}
                                onKeyDown={handleKeyDown}
                              />
                              {rowPriceErr && (
                                <p className="mt-1 text-xs text-destructive">{rowPriceErr}</p>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(item.key)}
                                className="text-muted-foreground hover:text-destructive"
                                aria-label={tPages("orderNewRemoveItemAria")}
                              >
                                <Trash className="size-4" />
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
                <span className="text-sm text-muted-foreground">{tPages("orderNewEstimatedTotal")}</span>
                <span className={`text-lg font-semibold text-foreground ${numClass}`}>
                  {currencySymbol}
                  {displayTotal.toLocaleString()}
                </span>
              </div>
              {pricingPreview && (
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>
                    {tPages("orderNewSubtotalBeforeDiscount")}:{" "}
                    <span className={numClass}>
                      {currencySymbol}
                      {Number(pricingPreview.subtotal_before_discount || 0).toLocaleString()}
                    </span>
                  </p>
                  <p>
                    {tPages("orderNewDiscount")}: −
                    <span className={numClass}>
                      {currencySymbol}
                      {Number(pricingPreview.discount_total || 0).toLocaleString()}
                    </span>
                  </p>
                  <p>
                    {tPages("orderNewSubtotalAfterDiscount")}:{" "}
                    <span className={numClass}>
                      {currencySymbol}
                      {Number(pricingPreview.subtotal_after_discount || 0).toLocaleString()}
                    </span>
                  </p>
                  <p>
                    {tPages("orderNewShippingLine")}:{" "}
                    <span className={numClass}>
                      {currencySymbol}
                      {Number(pricingPreview.shipping_cost || 0).toLocaleString()}
                    </span>
                  </p>
                  <p className="font-medium text-foreground">
                    {tPages("orderNewTotalLine")}:{" "}
                    <span className={numClass}>
                      {currencySymbol}
                      {Number(pricingPreview.total || 0).toLocaleString()}
                    </span>
                  </p>
                </div>
              )}
              {!pricingPreview && items.length > 0 && (
                <p className="text-xs text-muted-foreground">{tPages("orderNewSelectZoneForPreview")}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
