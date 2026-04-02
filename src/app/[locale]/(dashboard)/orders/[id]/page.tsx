"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  Undo2,
  CreditCard,
  User,
  Home,
} from "lucide-react";
import api from "@/lib/api";
import { useBranding } from "@/context/BrandingContext";
import {
  ORDER_STATUS_OPTIONS,
  formatOrderStatusLabel,
} from "@/lib/orders/order-statuses";
import type {
  Order,
  OrderPricingPreview,
  PaginatedResponse,
  ProductVariant,
  Product,
  ShippingMethod,
  ShippingZone,
} from "@/types";
import { Button } from "@/components/ui/button";
import { ClickableText } from "@/components/ui/clickable-text";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { ProductSearchBar } from "@/components/orders/product-search-bar";
import { ProductGrid } from "@/components/orders/product-grid";
import { OrderLineProductCard } from "@/components/orders/order-line-product-card";
import type { EditableOrderItem } from "@/lib/orders/editable-order-item";
import {
  orderLineEditKey,
  orderLineListKey,
  orderLineRemoveKey,
} from "@/lib/orders/editable-order-item";
import {
  joinVillageThanaDistrict,
  splitShippingAddressForForm,
} from "@/lib/orders/shipping-address-parts";
import { formatDashboardDateTime } from "@/lib/datetime-display";
import { notify, normalizeError } from "@/notifications";
import { useAdminDeleteCapabilities } from "@/hooks/useAdminDeleteCapabilities";

type EditForm = {
  shipping_name: string;
  phone: string;
  email: string;
  village: string;
  thana: string;
  district: string;
  shipping_zone_public_id: string;
  shipping_method_public_id: string;
};

export default function OrderDetailPage() {
  const { id: order_public_id } = useParams<{ locale: string; id: string }>();
  const router = useRouter();
  const locale = useLocale();
  const tPages = useTranslations("pages");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const { currencySymbol } = useBranding();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm>({
    shipping_name: "",
    phone: "",
    email: "",
    village: "",
    thana: "",
    district: "",
    shipping_zone_public_id: "",
    shipping_method_public_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [itemEdits, setItemEdits] = useState<
    Record<string, { variant_public_id: string | null; quantity: number; unit_price: string }>
  >({});
  const [pricingPreview, setPricingPreview] = useState<OrderPricingPreview | null>(null);
  const [editableItems, setEditableItems] = useState<EditableOrderItem[]>([]);
  const [variantsByProductId, setVariantsByProductId] = useState<Record<string, ProductVariant[]>>({});
  const [variantsLoadingByProductId, setVariantsLoadingByProductId] = useState<Record<string, boolean>>({});
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [showProductResults, setShowProductResults] = useState(false);
  const [editError, setEditError] = useState("");
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [statusUpdateError, setStatusUpdateError] = useState("");
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const rightColRef = useRef<HTMLDivElement>(null);
  const [rightColHeight, setRightColHeight] = useState<number | null>(null);
  const { canDelete: canDeleteOrder, isSuperuser: deleteIsSuperuser } =
    useAdminDeleteCapabilities();

  useEffect(() => {
    api
      .get<Order>(`admin/orders/${order_public_id}/`)
      .then((res) => setOrder(res.data))
      .catch((err) => {
        console.error(err);
        notify.error(err);
      })
      .finally(() => setLoading(false));
  }, [order_public_id]);

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

  // Match Product card height to Payment + Customer combined on desktop
  useEffect(() => {
    const el = rightColRef.current;
    if (!el) return;
    const isDesktop = () => window.matchMedia("(min-width: 1024px)").matches;
    const updateHeight = () => {
      if (isDesktop()) setRightColHeight(el.offsetHeight);
      else setRightColHeight(null);
    };
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    const mql = window.matchMedia("(min-width: 1024px)");
    mql.addEventListener("change", updateHeight);
    return () => {
      ro.disconnect();
      mql.removeEventListener("change", updateHeight);
    };
  }, [order]);

  function startEditing() {
    if (!order) return;
    setEditError("");
    setPricingPreview(null);
    const addr = splitShippingAddressForForm(order.shipping_address);
    setForm({
      shipping_name: order.shipping_name,
      phone: order.phone,
      email: order.email,
      village: addr.village,
      thana: addr.thana,
      district: (addr.trailingDistrict || order.district || "").trim(),
      shipping_zone_public_id: order.shipping_zone_public_id ?? "",
      shipping_method_public_id: order.shipping_method_public_id ?? "",
    });
    const nextEdits: Record<string, { variant_public_id: string | null; quantity: number; unit_price: string }> =
      {};
    for (const item of order.items ?? []) {
      nextEdits[item.public_id] = {
        variant_public_id: item.variant_public_id ?? null,
        quantity: item.quantity,
        unit_price: String(item.unit_price),
      };
    }
    setItemEdits(nextEdits);
    setEditableItems(
      (order.items ?? []).map((item) => ({
        key: item.public_id,
        public_id: item.public_id,
        product_public_id: item.product_public_id ?? null,
        product_name: item.product_name,
        product_brand: item.product_brand,
        product_image: item.product_image,
        status: item.status,
        is_unavailable: item.is_unavailable,
        variant_public_id: item.variant_public_id ?? null,
        quantity: item.quantity,
        unit_price: String(item.unit_price),
        original_price: item.original_price,
        line_subtotal: item.line_subtotal,
        line_total: item.line_total,
        catalog_unit_price: item.catalog_unit_price ?? null,
        catalog_list_price: item.catalog_list_price ?? null,
        variant_option_labels: item.variant_option_labels,
        variant_sku: item.variant_sku,
        variant_inventory_quantity: item.variant_inventory_quantity,
        isNew: false,
      }))
    );
    setProductQuery("");
    setProductResults([]);
    setShowProductResults(false);
    setEditing(true);
  }

  const orderItems = useMemo(() => order?.items ?? [], [order]);
  const displayItems = useMemo(() => (editing ? editableItems : orderItems), [editing, editableItems, orderItems]);

  useEffect(() => {
    if (!editing) {
      setPricingPreview(null);
      return;
    }
    if (editableItems.length === 0) {
      setPricingPreview(null);
      return;
    }
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      const payloadItems = editableItems
        .map((it) => {
          if (!it.product_public_id) return null;
          const editKey = orderLineEditKey(it);
          const e = itemEdits[editKey];
          const variant_public_id = e?.variant_public_id ?? it.variant_public_id ?? null;
          const quantity = e?.quantity ?? it.quantity;
          return {
            product_public_id: it.product_public_id,
            variant_public_id,
            quantity,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x != null);
      if (payloadItems.length === 0) {
        setPricingPreview(null);
        return;
      }
      api
        .post<OrderPricingPreview>(
          "admin/orders/pricing-preview/",
          {
            shipping_zone_public_id: form.shipping_zone_public_id,
            shipping_method_public_id: form.shipping_method_public_id || null,
            items: payloadItems,
          },
          { signal: ac.signal },
        )
        .then(({ data }) => setPricingPreview(data))
        .catch(() => {
          if (!ac.signal.aborted) setPricingPreview(null);
        });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [
    editing,
    editableItems,
    itemEdits,
    form.shipping_zone_public_id,
    form.shipping_method_public_id,
  ]);

  const ensureVariantsLoaded = useCallback(async (productId: string) => {
    if (!productId) return;
    if (variantsByProductId[productId]) return;
    setVariantsLoadingByProductId((p) => ({ ...p, [productId]: true }));
    try {
      const { data } = await api.get<PaginatedResponse<ProductVariant> | ProductVariant[]>(
        "admin/product-variants/",
        { params: { product_public_id: productId } },
      );
      const list = Array.isArray(data) ? data : data.results;
      setVariantsByProductId((p) => ({ ...p, [productId]: list ?? [] }));
    } catch {
      setVariantsByProductId((p) => ({ ...p, [productId]: [] }));
    } finally {
      setVariantsLoadingByProductId((p) => ({ ...p, [productId]: false }));
    }
  }, [variantsByProductId]);

  const editProductIds = useMemo(() => {
    if (!editing) return [];
    const ids = editableItems
      .map((i) => i.product_public_id)
      .filter((id): id is string => Boolean(id));
    return [...new Set(ids)];
  }, [editing, editableItems]);

  useEffect(() => {
    if (!editing || editProductIds.length === 0) return;
    for (const pid of editProductIds) {
      void ensureVariantsLoaded(pid);
    }
  }, [editing, editProductIds, ensureVariantsLoaded]);

  function handleProductSearch(value: string) {
    setProductQuery(value);
    const query = value.trim();
    if (query.length < 2) {
      setProductResults([]);
      setShowProductResults(false);
      return;
    }
    setSearchingProducts(true);
    api
      .get<PaginatedResponse<Product>>("admin/products/", {
        params: { search: query, status: "active" },
      })
      .then(({ data }) => {
        setProductResults(data.results ?? []);
        setShowProductResults(true);
      })
      .catch(() => {
        setProductResults([]);
      })
      .finally(() => setSearchingProducts(false));
  }

  const dismissProductResults = useCallback(() => {
    setShowProductResults(false);
  }, []);

  function addProductToEditableOrder(product: Product) {
    if (!product.public_id) return;
    setEditError("");
    ensureVariantsLoaded(product.public_id);
    setEditableItems((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}-${product.public_id}-${prev.length}`,
        public_id: null,
        product_public_id: product.public_id,
        product_name: product.name || tPages("orderNewProductUnavailable"),
        product_brand: product.brand ?? undefined,
        product_image: product.image_url ?? product.image ?? null,
        status: "active",
        variant_public_id: null,
        quantity: 1,
        unit_price: String(product.price ?? "0"),
        original_price: product.original_price ?? undefined,
        variant_option_labels: [],
        variant_sku: null,
        variant_inventory_quantity: null,
        isNew: true,
      },
    ]);
    setProductQuery("");
    setProductResults([]);
    setShowProductResults(false);
  }

  function removeEditableItem(itemKey: string) {
    setEditError("");
    setEditableItems((prev) => prev.filter((item) => item.key !== itemKey));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (editableItems.length === 0) {
      setEditError("product list can't be empty");
      return;
    }
    if (!form.village.trim() || !form.thana.trim() || !form.district.trim()) {
      setEditError(tPages("orderEditAddressFieldsRequired"));
      return;
    }
    setSaving(true);
    setEditError("");
    try {
      const removedExistingIds = orderItems
        .filter((existingItem) => !editableItems.some((item) => item.public_id === existingItem.public_id))
        .map((item) => item.public_id);
      const payload = {
        shipping_name: form.shipping_name,
        phone: form.phone,
        email: form.email,
        shipping_address: joinVillageThanaDistrict(
          form.village,
          form.thana,
          form.district,
        ),
        district: form.district,
        shipping_zone_public_id: form.shipping_zone_public_id,
        shipping_method_public_id: form.shipping_method_public_id || null,
        items: [
          ...editableItems.map((it) => {
            // New lines use `item.key` in itemEdits; existing lines use public_id (same as orderLineEditKey).
            const editKey = orderLineEditKey(it);
            const edits = itemEdits[editKey];
            const variant_public_id =
              edits?.variant_public_id ?? it.variant_public_id ?? null;
            const quantity = edits?.quantity ?? it.quantity;
            return it.public_id
              ? {
                  public_id: it.public_id,
                  variant_public_id,
                  quantity,
                }
              : {
                  product_public_id: it.product_public_id,
                  variant_public_id,
                  quantity,
                };
          }),
          ...removedExistingIds.map((publicId) => ({ public_id: publicId, remove: true })),
        ],
      };
      const { data } = await api.patch<Order>(`admin/orders/${order_public_id}/`, payload);
      setOrder(data);
      setPricingPreview(null);
      setEditing(false);
    } catch (err: unknown) {
      const normalized = normalizeError(err, tPages("orderDetailSaveFailed"));
      setEditError(normalized.message);
      notify.error(normalized.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = await notify.confirm({
      title: deleteIsSuperuser
        ? tPages("orderDetailConfirmDeletePermanent")
        : tPages("orderDetailConfirmDeleteTrash"),
      level: "destructive",
    });
    if (!ok) return;
    try {
      await api.delete(`admin/orders/${order_public_id}/`);
      router.push("/orders");
    } catch (err) {
      console.error(err);
      notify.error(err);
    }
  }

  async function handleStatusChange(next: string) {
    if (
      !order ||
      next === order.status ||
      order.status === "cancelled" ||
      order.has_unavailable_products
    ) {
      return;
    }
    setStatusUpdateError("");
    setStatusUpdateLoading(true);
    try {
      const { data } = await api.patch<{ order: Order }>(
        `admin/orders/${order_public_id}/status/`,
        { status: next },
      );
      setOrder(data.order);
    } catch (err: unknown) {
      const normalized = normalizeError(err, tPages("orderDetailStatusUpdateFailed"));
      setStatusUpdateError(normalized.message);
      notify.error(normalized.message);
    } finally {
      setStatusUpdateLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="sr-only">{tCommon("loading")}</span>
      </div>
    );
  }

  if (!order) {
    return (
      <p className="text-muted-foreground">{tPages("orderDetailNotFound")}</p>
    );
  }

  const orderDateFormatted = formatDashboardDateTime(order.created_at, locale);
  const savedSubtotalBefore = Number(order.subtotal_before_discount ?? 0);
  const savedDiscountTotal = Number(order.discount_total ?? 0);
  const savedSubtotalAfter = Number(order.subtotal_after_discount ?? 0);
  const shippingCostNum = Number(order.shipping_cost ?? 0);
  const savedTotalNum = Number(order.total ?? 0);
  const methodLabel =
    (order.shipping_method_public_id
      ? shippingMethods.find((m) => m.public_id === order.shipping_method_public_id)?.name
      : null) || "—";
  const courierSummary =
    order.sent_to_courier || (order.courier_provider || "").trim()
      ? [
          (order.courier_provider || "").trim() || null,
          (order.courier_consignment_id || "").trim() || null,
        ]
          .filter(Boolean)
          .join(" · ") || "—"
      : "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted/80 px-1 py-1 hidden md:block">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                aria-label={tPages("goBack")}
                className="shrink-0"
              >
                <Undo2 className="size-4" />
              </Button>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              #S-{order.order_number}
            </h1>
          </div>
          <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <ClickableText
              href="/orders"
              variant="muted"
              className="text-muted-foreground hover:text-foreground"
            >
              {tNav("orders")}
            </ClickableText>
            <span aria-hidden>/</span>
            <span>
              S-{order.order_number} – {orderDateFormatted}
            </span>
          </nav>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canDeleteOrder && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="rounded-lg border-destructive text-destructive hover:bg-destructive/10"
          >
            {tPages("orderDetailDeleteOrder")}
          </Button>
          )}
          {editing ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => {
                  setPricingPreview(null);
                  setEditing(false);
                }}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                type="submit"
                form="order-edit-form"
                size="sm"
                disabled={saving}
                className="rounded-lg"
              >
                {saving ? tPages("orderDetailSaving") : tPages("orderDetailSaveChanges")}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={startEditing} className="rounded-lg">
              {tPages("orderDetailEditOrder")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        {/* Product - left, wider; height locked to Payment + Customer combined on desktop; scrolls when many items */}
        <Card
          className="flex min-h-0 flex-col gap-0 overflow-hidden rounded-xl border border-dashed border-card-border bg-card py-0 shadow-sm lg:col-span-2"
          style={rightColHeight !== null ? { height: rightColHeight } : undefined}
        >
          <CardHeader className="shrink-0 border-b border-border/50 px-4 pb-4 pt-5 sm:px-6">
            <CardTitle>{tPages("orderDetailProductCardTitle")}</CardTitle>
            <CardDescription>{tPages("orderDetailProductCardDescription")}</CardDescription>
          </CardHeader>
          {editing && (
            <div className="shrink-0 border-b border-border/50">
              <ProductSearchBar
                value={productQuery}
                onValueChange={handleProductSearch}
                searchingProducts={searchingProducts}
                showProductResults={showProductResults}
                productResults={productResults}
                currencySymbol={currencySymbol}
                onSelectProduct={addProductToEditableOrder}
                onDismissResults={dismissProductResults}
              />
            </div>
          )}
          <CardContent className="flex min-h-0 flex-1 flex-col gap-0 px-0 pb-4 pt-0">
            <div
              className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto scroll-smooth px-4 pt-4 sm:px-6 [scrollbar-width:thin] max-h-[70vh] lg:max-h-none [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-none [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent"
            >
              <ProductGrid
                hasItems={displayItems.length > 0}
                emptyLabel={tPages("orderDetailNoLineItems")}
              >
                {displayItems.map((item, index) => {
                  const itemEditKey = orderLineEditKey(item);
                  const edit = itemEdits[itemEditKey];
                  const variants = item.product_public_id
                    ? (variantsByProductId[item.product_public_id] ?? [])
                    : [];
                  const variantsLoading = item.product_public_id
                    ? (variantsLoadingByProductId[item.product_public_id] ?? false)
                    : false;
                  const selectedVariant =
                    edit?.variant_public_id != null
                      ? variants.find((v) => v.public_id === edit.variant_public_id) ?? null
                      : null;
                  return (
                    <OrderLineProductCard
                      key={orderLineListKey(item, index)}
                      item={item}
                      editing={editing}
                      currencySymbol={currencySymbol}
                      edit={edit}
                      variants={variants}
                      variantsLoading={variantsLoading}
                      onQuantityChange={(e) =>
                        setItemEdits((prev) => ({
                          ...prev,
                          [itemEditKey]: {
                            variant_public_id:
                              prev[itemEditKey]?.variant_public_id ?? (item.variant_public_id ?? null),
                            quantity: Math.max(
                              1,
                              Math.min(
                                parseInt(e.target.value, 10) || 1,
                                selectedVariant?.available_quantity ?? Number.MAX_SAFE_INTEGER,
                              ),
                            ),
                            unit_price:
                              prev[itemEditKey]?.unit_price ?? String(item.unit_price),
                          },
                        }))
                      }
                      onVariantChange={(e) => {
                        const raw = e.target.value;
                        setItemEdits((prev) => ({
                          ...prev,
                          [itemEditKey]: {
                            variant_public_id: raw || null,
                            quantity: prev[itemEditKey]?.quantity ?? item.quantity,
                            unit_price:
                              prev[itemEditKey]?.unit_price ?? String(item.unit_price),
                          },
                        }));
                      }}
                      onVariantFocus={() =>
                        item.product_public_id && ensureVariantsLoaded(item.product_public_id)
                      }
                      onRemove={() => removeEditableItem(orderLineRemoveKey(item))}
                    />
                  );
                })}
              </ProductGrid>
            </div>
            {editing && editError && (
              <div className="shrink-0 border-t border-border/40 px-4 pt-3 sm:px-6">
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {editError}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column: stacked cards (height drives Product card on desktop) */}
        <div ref={rightColRef} className="flex flex-col gap-6 lg:col-span-1">
        {/* Payment */}
        <Card className="overflow-hidden rounded-xl border border-dashed border-card-border bg-card shadow-sm">
          <CardHeader className="border-b border-border/50 px-4 pb-4 sm:px-6">
            <CardTitle>{tPages("orderDetailPaymentTitle")}</CardTitle>
            <CardDescription>{tPages("orderDetailPaymentDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pt-6 sm:px-6">
            {!editing && (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{tPages("orderDetailSubtotalBeforeDiscount")}</dt>
                  <dd>
                    {currencySymbol}
                    {savedSubtotalBefore.toLocaleString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{tPages("orderDetailDiscount")}</dt>
                  <dd className={savedDiscountTotal ? "text-foreground" : undefined}>
                    {savedDiscountTotal
                      ? `-${currencySymbol}${savedDiscountTotal.toLocaleString()}`
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{tPages("orderDetailSubtotalAfterDiscount")}</dt>
                  <dd>
                    {currencySymbol}
                    {savedSubtotalAfter.toLocaleString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{tPages("orderDetailShippingCost")}</dt>
                  <dd>
                    {shippingCostNum
                      ? `${currencySymbol}${shippingCostNum.toLocaleString()}`
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{tPages("orderDetailShippingMethodLabel")}</dt>
                  <dd className="text-muted-foreground">{methodLabel}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{tPages("orderDetailCourier")}</dt>
                  <dd className="text-muted-foreground">{courierSummary}</dd>
                </div>
                <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
                  <dt>{tPages("orderDetailTotal")}</dt>
                  <dd>
                    {currencySymbol}
                    {savedTotalNum.toLocaleString()}
                  </dd>
                </div>
              </dl>
            )}
            {editing && (
              <div className="space-y-6">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {tPages("orderDetailSavedPersisted")}
                  </p>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{tPages("orderDetailSubtotalBeforeDiscount")}</dt>
                      <dd>
                        {currencySymbol}
                        {savedSubtotalBefore.toLocaleString()}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{tPages("orderDetailDiscount")}</dt>
                      <dd className={savedDiscountTotal ? "text-foreground" : undefined}>
                        {savedDiscountTotal
                          ? `-${currencySymbol}${savedDiscountTotal.toLocaleString()}`
                          : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{tPages("orderDetailSubtotalAfterDiscount")}</dt>
                      <dd>
                        {currencySymbol}
                        {savedSubtotalAfter.toLocaleString()}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{tPages("orderDetailShippingCost")}</dt>
                      <dd>
                        {shippingCostNum
                          ? `${currencySymbol}${shippingCostNum.toLocaleString()}`
                          : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
                      <dt>{tPages("orderDetailTotal")}</dt>
                      <dd>
                        {currencySymbol}
                        {savedTotalNum.toLocaleString()}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {tPages("orderDetailNewTotalPreview")}
                  </p>
                  {pricingPreview ? (
                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{tPages("orderDetailSubtotalBeforeDiscount")}</dt>
                        <dd>
                          {currencySymbol}
                          {Number(pricingPreview.subtotal_before_discount).toLocaleString()}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{tPages("orderDetailDiscount")}</dt>
                        <dd>
                          {Number(pricingPreview.discount_total) > 0
                            ? `-${currencySymbol}${Number(pricingPreview.discount_total).toLocaleString()}`
                            : "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{tPages("orderDetailSubtotalAfterDiscount")}</dt>
                        <dd>
                          {currencySymbol}
                          {Number(pricingPreview.subtotal_after_discount).toLocaleString()}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{tPages("orderDetailShippingCost")}</dt>
                        <dd>
                          {Number(pricingPreview.shipping_cost) > 0
                            ? `${currencySymbol}${Number(pricingPreview.shipping_cost).toLocaleString()}`
                            : "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
                        <dt>{tPages("orderDetailTotal")}</dt>
                        <dd>
                          {currencySymbol}
                          {Number(pricingPreview.total).toLocaleString()}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-sm text-muted-foreground">{tPages("orderDetailCalculating")}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {!editing && (
          <Card className="overflow-hidden rounded-xl border border-dashed border-card-border bg-card shadow-sm">
            <CardHeader className="border-b border-border/50 px-4 pb-4 sm:px-6">
              <CardTitle>{tPages("orderDetailOrderStatusTitle")}</CardTitle>
              <CardDescription>
                {tPages("orderDetailOrderStatusCurrent")}:{" "}
                <span className="text-foreground">
                  {formatOrderStatusLabel(order.status, tPages)}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 py-4 sm:px-6">
              <div className="space-y-2">
                {order.status === "cancelled" ? (
                  <p className="text-sm text-muted-foreground">
                    {tPages("orderDetailOrderCancelledHint")}
                  </p>
                ) : order.has_unavailable_products ? (
                  <p className="text-sm text-muted-foreground">
                    {formatOrderStatusLabel(order.status, tPages)} •{" "}
                    {(order.unavailable_products_count ?? 0) === 1
                      ? "Product unavailable"
                      : `${order.unavailable_products_count} products unavailable`}
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={order.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      disabled={statusUpdateLoading}
                      className="h-9 w-[180px]"
                    >
                      {ORDER_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {formatOrderStatusLabel(s, tPages)}
                        </option>
                      ))}
                    </Select>
                    {statusUpdateLoading ? (
                      <span className="text-xs text-muted-foreground">
                        {tPages("orderDetailStatusUpdating")}
                      </span>
                    ) : null}
                  </div>
                )}
                {statusUpdateError && (
                  <p className="text-xs text-destructive">{statusUpdateError}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer */}
        <Card className="overflow-hidden rounded-xl border border-dashed border-card-border bg-card shadow-sm">
          <CardHeader className="border-b border-border/50 px-4 pb-4 sm:px-6">
            <CardTitle>{tPages("orderDetailCustomerTitle")}</CardTitle>
            <CardDescription>{tPages("orderDetailCustomerDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pt-6 sm:px-6">
            {editing ? (
              <form id="order-edit-form" onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {tPages("orderDetailOrderNumber")}
                  </label>
                  <Input
                    value={order.order_number}
                    readOnly
                    className="bg-muted/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {tPages("orderDetailOrderStatusField")}
                  </label>
                  <Input
                    value={formatOrderStatusLabel(order.status, tPages)}
                    readOnly
                    className="cursor-default bg-muted/50"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {tPages("orderDetailStatusChangeHint")}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      {tPages("orderNewShippingMethod")}
                    </label>
                    <Select
                      value={form.shipping_method_public_id}
                      onChange={(e) => setForm({ ...form, shipping_method_public_id: e.target.value })}
                    >
                      <option value="">{tPages("orderNewShippingMethodAuto")}</option>
                      {shippingMethods.map((m) => (
                        <option key={m.public_id} value={m.public_id}>
                          {m.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      {tPages("orderNewDeliveryZone")}
                    </label>
                    <Select
                      value={form.shipping_zone_public_id}
                      onChange={(e) => setForm({ ...form, shipping_zone_public_id: e.target.value })}
                      required
                    >
                      <option value="">{tPages("orderNewSelectZone")}</option>
                      {shippingZones.map((z) => (
                        <option key={z.public_id} value={z.public_id}>
                          {z.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      {tPages("orderNewName")}
                    </label>
                    <Input
                      value={form.shipping_name}
                      onChange={(e) =>
                        setForm({ ...form, shipping_name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      {tPages("orderNewPhone")}
                    </label>
                    <Input
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      {tPages("orderNewEmail")}
                    </label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      {tPages("orderFormRoadVillage")}
                    </label>
                    <Input
                      value={form.village}
                      onChange={(e) =>
                        setForm({ ...form, village: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      {tPages("orderFormThana")}
                    </label>
                    <Input
                      value={form.thana}
                      onChange={(e) =>
                        setForm({ ...form, thana: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {tPages("orderFormDistrict")}
                  </label>
                  <Input
                    value={form.district}
                    onChange={(e) =>
                      setForm({ ...form, district: e.target.value })
                    }
                  />
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <User className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {tPages("orderDetailGeneralInformation")}
                    </p>
                    <p className="font-medium text-foreground">
                      {order.shipping_name || "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {order.email || "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {order.phone || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Home className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {tPages("orderDetailShippingAddress")}
                    </p>
                    {(() => {
                      const addr = splitShippingAddressForForm(order.shipping_address);
                      const districtLine =
                        order.district?.trim() ||
                        addr.trailingDistrict ||
                        "—";
                      return (
                        <>
                          <p className="text-sm text-foreground">
                            <span className="text-muted-foreground">
                              {tPages("orderFormRoadVillage")}:{" "}
                            </span>
                            {addr.village || "—"}
                          </p>
                          <p className="text-sm text-foreground">
                            <span className="text-muted-foreground">
                              {tPages("orderFormThana")}:{" "}
                            </span>
                            {addr.thana || "—"}
                          </p>
                          <p className="text-sm text-foreground">
                            <span className="text-muted-foreground">
                              {tPages("orderFormDistrict")}:{" "}
                            </span>
                            {districtLine}
                          </p>
                        </>
                      );
                    })()}
                    {order.phone && (
                      <p className="text-sm text-muted-foreground">
                        {order.phone}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <CreditCard className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {tPages("orderDetailBillingAddress")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {tPages("orderDetailSameAsShipping")}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
