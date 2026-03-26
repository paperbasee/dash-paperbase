"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import {
  Undo2,
  CreditCard,
  User,
  Package,
  Home,
  PackageOpen,
  Truck,
  CheckCircle2,
} from "lucide-react";
import api from "@/lib/api";
import { useBranding } from "@/context/BrandingContext";
import { ExtraFieldsFormSection } from "@/components/ExtraFieldsFormSection";
import { useExtraFieldsSchema } from "@/hooks/useExtraFieldsSchema";
import { validateRequiredExtraFields } from "@/lib/validation";
import type { ExtraFieldValues } from "@/types/extra-fields";
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

type EditForm = {
  shipping_name: string;
  phone: string;
  email: string;
  shipping_address: string;
  district: string;
  tracking_number: string;
  shipping_zone: string;
  shipping_method: string;
};

type EditableOrderItem = {
  key: string;
  public_id: string | null;
  product: string | null;
  product_name: string;
  product_brand?: string;
  product_image: string | null;
  status?: "active" | "deleted";
  variant_public_id: string | null;
  quantity: number;
  price: string;
  original_price?: string | null;
  variant_option_labels?: string[];
  variant_sku?: string | null;
  variant_stock_quantity?: number | null;
  isNew: boolean;
};

function formatOrderStatus(status: string): string {
  if (!status) return "—";
  return status.replace(/_/g, " ");
}

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

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  return base ? `${base.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}` : url;
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

function buildTimelineEvents(order: Order): { icon: typeof Package; text: string; by?: string; date: string }[] {
  const events: { icon: typeof Package; text: string; by?: string; date: string }[] = [];
  events.push({
    icon: PackageOpen,
    text: "Order placed",
    by: "customer",
    date: order.created_at,
  });
  if (order.status === "confirmed" && order.updated_at !== order.created_at) {
    events.push({
      icon: CheckCircle2,
      text: "Order confirmed",
      by: "Admin",
      date: order.updated_at,
    });
  }
  if (order.tracking_number) {
    events.push({
      icon: Truck,
      text: "Tracking number assigned",
      date: order.updated_at,
    });
  }
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return events;
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
    tracking_number: "",
    shipping_zone: "",
    shipping_method: "",
  });
  const [extraFields, setExtraFields] = useState<ExtraFieldValues>({});
  const [extraFieldsErrors, setExtraFieldsErrors] = useState<Record<string, string>>({});
  const { schema: extraFieldsSchema } = useExtraFieldsSchema("order");
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
  const [sendingToCourier, setSendingToCourier] = useState(false);
  const [courierError, setCourierError] = useState("");
  const [courierSuccess, setCourierSuccess] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [trackingDetails, setTrackingDetails] = useState<Record<string, unknown> | null>(null);
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
      tracking_number: order.tracking_number,
      shipping_zone: order.shipping_zone_public_id ?? "",
      shipping_method: order.shipping_method_public_id ?? "",
    });
    setExtraFields(
      typeof order.extra_data === "object" && order.extra_data !== null
        ? (order.extra_data as ExtraFieldValues)
        : {}
    );
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
        product: item.product,
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
        variant_stock_quantity: item.variant_stock_quantity,
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

  function addProductToEditableOrder(product: Product) {
    if (!product.public_id) return;
    setEditError("");
    ensureVariantsLoaded(product.public_id);
    setEditableItems((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}-${product.public_id}-${prev.length}`,
        public_id: null,
        product: product.public_id,
        product_name: product.name || "Unavailable",
        product_brand: product.brand ?? undefined,
        product_image: product.image_url ?? product.image,
        status: "active",
        variant_public_id: null,
        quantity: 1,
        price: String(product.price ?? "0"),
        original_price: product.original_price,
        variant_option_labels: [],
        variant_sku: null,
        variant_stock_quantity: null,
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
    const schemaWithNames = extraFieldsSchema.filter((f) => f.name.trim());
    const extraErrors = validateRequiredExtraFields(schemaWithNames, extraFields);
    if (Object.keys(extraErrors).length > 0) {
      setExtraFieldsErrors(extraErrors);
      return;
    }
    setExtraFieldsErrors({});
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
        tracking_number: form.tracking_number,
        shipping_zone: form.shipping_zone,
        shipping_method: form.shipping_method || null,
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
                  product: it.product,
                  variant_public_id: it.variant_public_id ?? null,
                  quantity: it.quantity,
                  price: String(it.price),
                }
          ),
          ...removedExistingIds.map((publicId) => ({ public_id: publicId, remove: true })),
        ],
        ...(Object.keys(extraFields).length > 0 && { extra_data: extraFields }),
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

  async function handleSendToCourier() {
    if (!order || order.sent_to_courier) return;
    setCourierError("");
    setCourierSuccess(false);
    setSendingToCourier(true);
    try {
      const { data } = await api.post<Order>(
        `admin/orders/${order_public_id}/send-to-courier/`
      );
      setOrder(data);
      setCourierSuccess(true);
    } catch (err: unknown) {
      setCourierError(extractApiDetail(err, "Failed to send order to courier."));
    } finally {
      setSendingToCourier(false);
    }
  }

  async function handleTrack() {
    if (!order || !order.sent_to_courier) return;
    setTracking(true);
    setTrackingDetails(null);
    try {
      const { data } = await api.get<{
        courier_provider: string;
        courier_consignment_id: string;
        courier_tracking_code: string;
        courier_status: string;
        order_status?: string;
        details: Record<string, unknown>;
      }>(`admin/orders/${order_public_id}/track/`);
      setTrackingDetails(data.details);
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              courier_status: data.courier_status,
              status: data.order_status ?? prev.status,
            }
          : prev
      );
    } catch (err) {
      console.error(err);
    } finally {
      setTracking(false);
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
  const savedExtraData =
    order.extra_data && typeof order.extra_data === "object" ? order.extra_data : null;
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
  const zoneLabel =
    (order.shipping_zone_public_id
      ? shippingZones.find((z) => z.public_id === order.shipping_zone_public_id)?.name
      : null) || "—";
  const methodLabel =
    (order.shipping_method_public_id
      ? shippingMethods.find((m) => m.public_id === order.shipping_method_public_id)?.name
      : null) || "—";
  const timelineEvents = buildTimelineEvents(order);

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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="rounded-lg border-destructive text-destructive hover:bg-destructive/10"
          >
            Delete Order
          </Button>
          {!editing && (
            <Button
              size="sm"
              onClick={startEditing}
              className="rounded-lg"
            >
              Edit Order
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        {/* Product - left, wider; height locked to Payment + Customer combined on desktop; scrolls when many items */}
        <Card
          className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-dashed border-card-border bg-card shadow-sm lg:col-span-2"
          style={rightColHeight !== null ? { height: rightColHeight } : undefined}
        >
          <CardHeader className="shrink-0 border-b border-border/50 px-4 pb-4 sm:px-6">
            <CardTitle>Product</CardTitle>
            <CardDescription>product details</CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-auto px-4 pt-6 sm:px-6 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-none [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
            <div className="overflow-x-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-none [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">
                    Item
                  </th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">
                    Quantity
                  </th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">
                    Price
                  </th>
                  <th className="pb-3 font-medium text-muted-foreground text-right">
                    Discount
                  </th>
                  {editing && (
                    <th className="pb-3 pl-4 font-medium text-muted-foreground text-right">
                      Action
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {displayItems.map((item, index) => {
                  const isUnavailable = item.status === "deleted" || !item.product;
                  const itemDiscount =
                    item.original_price != null &&
                    item.original_price !== "" &&
                    Number(item.original_price) > Number(item.price)
                      ? (Number(item.original_price) - Number(item.price)) * item.quantity
                      : 0;
                  const imageUrl = resolveImageUrl(item.product_image);
                  const itemEditKey =
                    "key" in item ? (item.public_id ?? item.key) : item.public_id;
                  const edit = itemEdits[itemEditKey];
                  const variants = item.product ? (variantsByProductId[item.product] ?? []) : [];
                  const variantsLoading = item.product ? (variantsLoadingByProductId[item.product] ?? false) : false;
                  const selectedVariant =
                    edit?.variant_public_id != null
                      ? variants.find((v) => v.public_id === edit.variant_public_id) ?? null
                      : null;
                  return (
                    <tr
                      key={
                        "key" in item
                          ? (item.key ?? item.public_id ?? `order-item-${index}`)
                          : (item.public_id ?? `order-item-${index}`)
                      }
                      className="border-b border-border/50"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt=""
                              className="size-12 shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                              <Package className="size-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-foreground">
                              {isUnavailable ? (
                                "Unavailable"
                              ) : (
                                <ClickableText
                                  href={`/products/${item.product}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {item.product_name}
                                </ClickableText>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {[
                                item.product_brand || null,
                                item.variant_option_labels?.length
                                  ? item.variant_option_labels.join(" · ")
                                  : item.variant_sku
                                    ? `SKU: ${item.variant_sku}`
                                    : null,
                                item.variant_stock_quantity != null
                                  ? `Stock: ${item.variant_stock_quantity}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {editing ? (
                          <Input
                            type="number"
                            min={1}
                            value={edit?.quantity ?? item.quantity}
                            onChange={(e) =>
                              setItemEdits((prev) => ({
                                ...prev,
                                [itemEditKey]: {
                                  variant_public_id: prev[itemEditKey]?.variant_public_id ?? (item.variant_public_id ?? null),
                                  quantity: Math.max(1, parseInt(e.target.value) || 1),
                                  price: prev[itemEditKey]?.price ?? String(item.price),
                                },
                              }))
                            }
                            className="h-8 w-20 py-1 text-center"
                            size="sm"
                          />
                        ) : (
                          item.quantity
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {editing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              value={edit?.price ?? String(item.price)}
                              onChange={(e) =>
                                setItemEdits((prev) => ({
                                  ...prev,
                                  [itemEditKey]: {
                                    variant_public_id: prev[itemEditKey]?.variant_public_id ?? (item.variant_public_id ?? null),
                                    quantity: prev[itemEditKey]?.quantity ?? item.quantity,
                                    price: e.target.value,
                                  },
                                }))
                              }
                              className="h-8 w-28 py-1"
                              size="sm"
                            />
                            <div className="flex items-center gap-2">
                              <Select
                                className="h-8 w-[220px] py-1"
                                size="sm"
                                value={edit?.variant_public_id ?? ""}
                                onFocus={() => item.product && ensureVariantsLoaded(item.product)}
                                onChange={(e) => {
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
                                disabled={variantsLoading || isUnavailable}
                              >
                                <option value="">
                                  {variantsLoading ? "Loading…" : "Default"}
                                </option>
                                {variants.map((v) => (
                                  <option key={v.public_id} value={v.public_id}>
                                    {(v.option_labels?.join(" · ") || v.sku) ?? v.public_id}
                                  </option>
                                ))}
                              </Select>
                              {selectedVariant && (
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  Stock: {selectedVariant.stock_quantity}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            {currencySymbol}{Number(item.price).toLocaleString()}
                          </>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {itemDiscount > 0 ? (
                          <span className="text-destructive">
                            -{currencySymbol}{itemDiscount.toLocaleString()}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      {editing && (
                        <td className="py-3 pl-4 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-destructive text-destructive hover:bg-destructive/10"
                            onClick={() =>
                              removeEditableItem("key" in item ? item.key : item.public_id)
                            }
                          >
                            Remove
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            {editing && (
              <div className="mt-4 space-y-2">
                <label className="block text-xs font-medium text-muted-foreground">
                  Add product
                </label>
                <Input
                  value={productQuery}
                  onChange={(e) => handleProductSearch(e.target.value)}
                  placeholder="Search active products..."
                />
                {searchingProducts && (
                  <p className="text-xs text-muted-foreground">Searching products...</p>
                )}
                {showProductResults && productResults.length > 0 && (
                  <div className="max-h-44 overflow-auto rounded-md border border-border bg-background">
                    {productResults.map((product) => (
                      <button
                        key={product.public_id}
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/50"
                        onClick={() => addProductToEditableOrder(product)}
                      >
                        <span className="text-sm text-foreground">{product.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {currencySymbol}
                          {Number(product.price).toLocaleString()}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {editing && editError && (
              <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {editError}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column: Payment + Customer stacked (height drives Product card on desktop) */}
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
                <dt className="text-muted-foreground">Shipping zone</dt>
                <dd className="text-muted-foreground">{zoneLabel}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
                <dt>Total</dt>
                <dd>{currencySymbol}{totalNum.toLocaleString()}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Customer */}
        <Card className="overflow-hidden rounded-xl border border-dashed border-card-border bg-card shadow-sm">
          <CardHeader className="border-b border-border/50 px-4 pb-4 sm:px-6">
            <CardTitle>Customer</CardTitle>
            <CardDescription>Information Detail</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pt-6 sm:px-6">
            {editing ? (
              <form onSubmit={handleSave} className="space-y-4">
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
                    value={formatOrderStatus(order.status)}
                    readOnly
                    className="cursor-default bg-muted/50 capitalize"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Status updates when you send to courier and when courier tracking shows
                    handoff.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Shipping method
                    </label>
                    <Select
                      value={form.shipping_method}
                      onChange={(e) => setForm({ ...form, shipping_method: e.target.value })}
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
                      Shipping zone
                    </label>
                    <Select
                      value={form.shipping_zone}
                      onChange={(e) => setForm({ ...form, shipping_zone: e.target.value })}
                      required
                    >
                      <option value="">Select shipping zone</option>
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
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Tracking Number
                    </label>
                    <Input
                      value={form.tracking_number}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          tracking_number: e.target.value,
                        })
                      }
                    />
                  </div>
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
                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving…" : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </Button>
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
                    <p className="mb-1">
                      <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize text-foreground">
                        {formatOrderStatus(order.status)}
                      </span>
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

                {(extraFieldsSchema.some((f) => f.name.trim()) ||
                  (savedExtraData && Object.keys(savedExtraData).length > 0)) && (
                  <div className="rounded-xl border border-dashed border-card-border bg-card p-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Extra Fields
                    </p>
                    <p className="mb-3 text-xs text-muted-foreground">
                      Custom fields from Settings → Dynamic Fields. Values are saved as{" "}
                      <code className="rounded bg-muted px-1 text-[11px]">extra_data</code> on the order.
                    </p>

                    {savedExtraData && Object.keys(savedExtraData).length > 0 ? (
                      <dl className="grid gap-2 text-sm sm:grid-cols-2">
                        {Object.entries(savedExtraData).map(([k, v]) => (
                          <div
                            key={k}
                            className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                          >
                            <dt className="text-xs text-muted-foreground">{k}</dt>
                            <dd className="font-medium text-foreground break-words">
                              {typeof v === "object" ? JSON.stringify(v) : String(v)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="text-sm text-muted-foreground">No extra fields saved yet.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Courier */}
      <Card className="overflow-hidden rounded-xl border border-dashed border-card-border bg-card shadow-sm">
        <CardHeader className="border-b border-border/50 px-4 pb-4 sm:px-6">
          <CardTitle>Courier</CardTitle>
          <CardDescription>Send order to courier and track delivery</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pt-6 sm:px-6">
          {courierError && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {courierError}
            </div>
          )}
          {courierSuccess && !courierError && (
            <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
              Order sent to courier. Confirmation email was sent to the customer.
            </div>
          )}

          {order.sent_to_courier ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                  <dt className="text-xs text-muted-foreground">Provider</dt>
                  <dd className="font-medium text-foreground capitalize">
                    {order.courier_provider || "---"}
                  </dd>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                  <dt className="text-xs text-muted-foreground">
                    Consignment ID
                  </dt>
                  <dd className="font-medium text-foreground font-mono text-xs break-all">
                    {order.courier_consignment_id || "---"}
                  </dd>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                  <dt className="text-xs text-muted-foreground">
                    Tracking Code
                  </dt>
                  <dd className="font-medium text-foreground font-mono text-xs break-all">
                    {order.courier_tracking_code || "---"}
                  </dd>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                  <dt className="text-xs text-muted-foreground">Status</dt>
                  <dd>
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {order.courier_status || "pending"}
                    </span>
                  </dd>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTrack}
                  disabled={tracking}
                >
                  <Truck className="mr-1.5 size-4" />
                  {tracking ? "Tracking..." : "Refresh Tracking"}
                </Button>
              </div>
              {trackingDetails && (
                <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Tracking Details
                  </p>
                  <pre className="text-xs text-foreground overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(trackingDetails, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4 sm:flex-row sm:items-start">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  This order has not been sent to a courier yet. Click the button
                  to dispatch it through your connected courier provider.
                </p>
              </div>
              <Button
                onClick={handleSendToCourier}
                disabled={sendingToCourier}
                className="shrink-0"
              >
                <Truck className="mr-1.5 size-4" />
                {sendingToCourier ? "Sending..." : "Send to Courier"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="overflow-hidden rounded-xl border border-dashed border-card-border bg-card shadow-sm">
        <CardHeader className="border-b border-border/50 px-4 pb-4 sm:px-6">
          <CardTitle>Timeline</CardTitle>
          <CardDescription>Track Order Progress</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pt-6 sm:px-6">
          <ul className="space-y-4">
            {timelineEvents.map((event, i) => {
              const Icon = event.icon;
              const titleLabel = event.text.toUpperCase().replace(/\s+/g, " ");
              return (
                <li key={i} className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className="size-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {titleLabel}
                      </p>
                      {event.by && (
                        <p className="text-sm text-muted-foreground">
                          {event.text === "Order placed"
                            ? `by ${event.by}`
                            : `Confirmed by ${event.by}`}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground sm:hidden">
                        {formatOrderDate(event.date)}
                      </p>
                    </div>
                  </div>
                  <span className="hidden shrink-0 text-sm text-muted-foreground sm:block">
                    {formatOrderDate(event.date)}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
