"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
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

type EditForm = {
  shipping_name: string;
  phone: string;
  email: string;
  shipping_address: string;
  district: string;
  shipping_zone_public_id: string;
  shipping_method_public_id: string;
};

function extractApiDetail(err: unknown, fallback: string): string {
  const raw = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    try {
      return JSON.stringify(raw);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function formatOrderDate(iso: string) {
  const d = new Date(iso);
  const month = d.toLocaleString("en-US", { month: "long" });
  const day = d.getDate();
  const year = d.getFullYear();
  const time = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).toLowerCase().replace(/\s/g, " ");
  return `${month}, ${day} ${year} at ${time}`;
}

export default function OrderDetailPage() {
  const { id: order_public_id } = useParams<{ locale: string; id: string }>();
  const router = useRouter();
  const { currencySymbol } = useBranding();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm>({
    shipping_name: "",
    phone: "",
    email: "",
    shipping_address: "",
    district: "",
    shipping_zone_public_id: "",
    shipping_method_public_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [itemEdits, setItemEdits] = useState<Record<string, { variant_public_id: string | null; quantity: number; price: string }>>({});
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

  useEffect(() => {
    api
      .get<Order>(`admin/orders/${order_public_id}/`)
      .then((res) => setOrder(res.data))
      .catch(console.error)
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
    setForm({
      shipping_name: order.shipping_name,
      phone: order.phone,
      email: order.email,
      shipping_address: order.shipping_address,
      district: order.district,
      shipping_zone_public_id: order.shipping_zone_public_id ?? "",
      shipping_method_public_id: order.shipping_method_public_id ?? "",
    });
    const nextEdits: Record<string, { variant_public_id: string | null; quantity: number; price: string }> = {};
    for (const item of order.items ?? []) {
      nextEdits[item.public_id] = {
        variant_public_id: item.variant_public_id ?? null,
        quantity: item.quantity,
        price: String(item.price),
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
        variant_public_id: item.variant_public_id ?? null,
        quantity: item.quantity,
        price: String(item.price),
        original_price: item.original_price,
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

  async function ensureVariantsLoaded(productId: string) {
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
  }

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
        product_name: product.name || "Unavailable",
        product_brand: product.brand ?? undefined,
        product_image: product.image_url ?? product.image ?? null,
        status: "active",
        variant_public_id: null,
        quantity: 1,
        price: String(product.price ?? "0"),
        original_price: product.original_price,
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
        shipping_address: form.shipping_address,
        district: form.district,
        shipping_zone_public_id: form.shipping_zone_public_id,
        shipping_method_public_id: form.shipping_method_public_id || null,
        items: [
          ...editableItems.map((it) =>
            it.public_id
              ? {
                  public_id: it.public_id,
                  variant_public_id: itemEdits[it.public_id]?.variant_public_id ?? it.variant_public_id ?? null,
                  quantity: itemEdits[it.public_id]?.quantity ?? it.quantity,
                  price: itemEdits[it.public_id]?.price ?? String(it.price),
                }
              : {
                  product_public_id: it.product_public_id,
                  variant_public_id: it.variant_public_id ?? null,
                  quantity: it.quantity,
                  price: String(it.price),
                }
          ),
          ...removedExistingIds.map((publicId) => ({ public_id: publicId, remove: true })),
        ],
      };
      const { data } = await api.patch<Order>(`admin/orders/${order_public_id}/`, payload);
      setOrder(data);
      setEditing(false);
    } catch (err: unknown) {
      setEditError(extractApiDetail(err, "Failed to save order changes."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this order permanently?")) return;
    try {
      await api.delete(`admin/orders/${order_public_id}/`);
      router.push("/orders");
    } catch (err) {
      console.error(err);
    }
  }

  async function handleStatusChange(next: string) {
    if (!order || next === order.status || order.status === "cancelled") return;
    setStatusUpdateError("");
    setStatusUpdateLoading(true);
    try {
      const { data } = await api.patch<{ order: Order }>(
        `admin/orders/${order_public_id}/status/`,
        { status: next },
      );
      setOrder(data.order);
    } catch (err: unknown) {
      setStatusUpdateError(extractApiDetail(err, "Failed to update order status."));
    } finally {
      setStatusUpdateLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!order) {
    return (
      <p className="text-muted-foreground">Order not found.</p>
    );
  }

  const orderDateFormatted = formatOrderDate(order.created_at);
  const computedSubtotal = (order.items ?? []).reduce(
    (s, i) => s + Number(i.price) * i.quantity,
    0
  );
  // Some older orders (and previously dashboard-created orders) stored `order.total` as items-only.
  // Compute a consistent breakdown-based total for display.
  const combinedDiscount = (order.items ?? []).reduce((sum, i) => {
    const orig = i.original_price != null && i.original_price !== "" ? Number(i.original_price) : 0;
    const p = Number(i.price);
    if (orig > p) return sum + (orig - p) * i.quantity;
    return sum;
  }, 0);
  const subtotalNum = order.subtotal != null ? Number(order.subtotal) : computedSubtotal;
  const shippingCostNum = order.shipping_cost != null ? Number(order.shipping_cost) : 0;
  const totalNum = order.total != null ? Number(order.total) : subtotalNum + shippingCostNum;
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
            <div className="rounded-lg bg-muted/80 px-1 py-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                aria-label="Go back"
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
              Orders
            </ClickableText>
            <span aria-hidden>/</span>
            <span>
              S-{order.order_number} – {orderDateFormatted}
            </span>
          </nav>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="rounded-lg border-destructive text-destructive hover:bg-destructive/10"
          >
            Delete Order
          </Button>
          {editing ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="order-edit-form"
                size="sm"
                disabled={saving}
                className="rounded-lg"
              >
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={startEditing} className="rounded-lg">
              Edit Order
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
            <CardTitle>Product</CardTitle>
            <CardDescription>product details</CardDescription>
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
              <ProductGrid hasItems={displayItems.length > 0}>
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
                      selectedVariant={selectedVariant}
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
                            price: prev[itemEditKey]?.price ?? String(item.price),
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
                            price: prev[itemEditKey]?.price ?? String(item.price),
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
            <CardTitle>Payment</CardTitle>
            <CardDescription>Final Payment Amount</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pt-6 sm:px-6">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{currencySymbol}{subtotalNum.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Discount</dt>
                <dd className={combinedDiscount ? "text-destructive" : undefined}>
                  {combinedDiscount ? `-${currencySymbol}${combinedDiscount.toLocaleString()}` : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping Cost</dt>
                <dd>
                  {shippingCostNum
                    ? `${currencySymbol}${shippingCostNum.toLocaleString()}`
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping method</dt>
                <dd className="text-muted-foreground">{methodLabel}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Courier</dt>
                <dd className="text-muted-foreground">{courierSummary}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
                <dt>Total</dt>
                <dd>{currencySymbol}{totalNum.toLocaleString()}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {!editing && (
          <Card className="overflow-hidden rounded-xl border border-dashed border-card-border bg-card shadow-sm">
            <CardHeader className="border-b border-border/50 px-4 pb-4 sm:px-6">
              <CardTitle>Order Status</CardTitle>
              <CardDescription>
                Current:{" "}
                <span className="capitalize text-foreground">
                  {formatOrderStatusLabel(order.status)}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 py-4 sm:px-6">
              <div className="space-y-2">
                {order.status === "cancelled" ? (
                  <p className="text-sm text-muted-foreground">
                    This order is cancelled. Status cannot be changed.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={order.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      disabled={statusUpdateLoading}
                      className="h-9 w-[180px] capitalize"
                    >
                      {ORDER_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {formatOrderStatusLabel(s)}
                        </option>
                      ))}
                    </Select>
                    {statusUpdateLoading ? (
                      <span className="text-xs text-muted-foreground">Updating…</span>
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
            <CardTitle>Customer</CardTitle>
            <CardDescription>Information Detail</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pt-6 sm:px-6">
            {editing ? (
              <form id="order-edit-form" onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Order number
                  </label>
                  <Input
                    value={order.order_number}
                    readOnly
                    className="bg-muted/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Order status
                  </label>
                  <Input
                    value={formatOrderStatusLabel(order.status)}
                    readOnly
                    className="cursor-default bg-muted/50 capitalize"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Use the Order Status card to change status. Send to courier from the orders list
                    when the order is confirmed.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Shipping method (rates)
                    </label>
                    <Select
                      value={form.shipping_method_public_id}
                      onChange={(e) => setForm({ ...form, shipping_method_public_id: e.target.value })}
                    >
                      <option value="">Auto (cheapest match)</option>
                      {shippingMethods.map((m) => (
                        <option key={m.public_id} value={m.public_id}>
                          {m.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Delivery zone (rates)
                    </label>
                    <Select
                      value={form.shipping_zone_public_id}
                      onChange={(e) => setForm({ ...form, shipping_zone_public_id: e.target.value })}
                      required
                    >
                      <option value="">Select delivery zone</option>
                      {shippingZones.map((z) => (
                        <option key={z.public_id} value={z.public_id}>
                          {z.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Name
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
                      Phone
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
                      Email
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
                      District
                    </label>
                    <Input
                      value={form.district}
                      onChange={(e) =>
                        setForm({ ...form, district: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Address
                  </label>
                  <Textarea
                    rows={2}
                    value={form.shipping_address}
                    onChange={(e) =>
                      setForm({ ...form, shipping_address: e.target.value })
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
                      General Information
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
                      Shipping Address
                    </p>
                    <p className="text-sm text-foreground">
                      {order.shipping_address || "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {order.district || "—"}
                    </p>
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
                      Billing Address
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Same as shipping address
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
