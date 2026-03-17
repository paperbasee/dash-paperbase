"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
import type { Order, OrderItem } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const DELIVERY_OPTIONS = [
  { value: "inside", label: "Inside Dhaka City" },
  { value: "outside", label: "Outside Dhaka City" },
];

type EditForm = {
  shipping_name: string;
  phone: string;
  email: string;
  shipping_address: string;
  district: string;
  delivery_area: string;
  tracking_number: string;
};

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
  const { id } = useParams<{ id: string }>();
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
    delivery_area: "inside",
    tracking_number: "",
  });
  const [saving, setSaving] = useState(false);
  const rightColRef = useRef<HTMLDivElement>(null);
  const [rightColHeight, setRightColHeight] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<Order>(`/api/admin/orders/${id}/`)
      .then((res) => setOrder(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

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
    setForm({
      shipping_name: order.shipping_name,
      phone: order.phone,
      email: order.email,
      shipping_address: order.shipping_address,
      district: order.district,
      delivery_area: order.delivery_area,
      tracking_number: order.tracking_number,
    });
    setEditing(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch<Order>(`/api/admin/orders/${id}/`, form);
      setOrder(data);
      setEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this order permanently?")) return;
    try {
      await api.delete(`/api/admin/orders/${id}/`);
      router.push("/orders");
    } catch (err) {
      console.error(err);
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
  const subtotal = (order.items ?? []).reduce(
    (s, i) => s + Number(i.price) * i.quantity,
    0
  );
  const totalNum = Number(order.total);
  const combinedDiscount = (order.items ?? []).reduce((sum, i) => {
    const orig = i.original_price != null && i.original_price !== "" ? Number(i.original_price) : 0;
    const p = Number(i.price);
    if (orig > p) return sum + (orig - p) * i.quantity;
    return sum;
  }, 0);
  const shippingCost =
    order.delivery_area === "outside" ? 150 : order.delivery_area === "inside" ? 60 : 0;
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
            <Link
              href="/orders"
              className="hover:text-foreground hover:underline"
            >
              Orders
            </Link>
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
          className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-card-border bg-card shadow-sm lg:col-span-2"
          style={rightColHeight !== null ? { height: rightColHeight } : undefined}
        >
          <CardHeader className="shrink-0 border-b border-border/50 px-4 pb-4 sm:px-6">
            <CardTitle>Product</CardTitle>
            <CardDescription>product details</CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-auto px-4 pt-6 sm:px-6 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-none [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
            <div className="overflow-x-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-none [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
            <table className="w-full min-w-[600px] text-left text-sm">
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
                </tr>
              </thead>
              <tbody>
                {(order.items ?? []).map((item: OrderItem) => {
                  const itemDiscount =
                    item.original_price != null &&
                    item.original_price !== "" &&
                    Number(item.original_price) > Number(item.price)
                      ? (Number(item.original_price) - Number(item.price)) * item.quantity
                      : 0;
                  const imageUrl = resolveImageUrl(item.product_image);
                  return (
                    <tr key={item.id} className="border-b border-border/50">
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
                              <Link
                                href={`/products/${item.product}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                {item.product_name}
                              </Link>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {[item.product_brand, item.size ? `Size: ${item.size}` : null]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {item.quantity}
                      </td>
                      <td className="py-3 pr-4">
                        {currencySymbol}{Number(item.price).toLocaleString()}
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>

        {/* Right column: Payment + Customer stacked (height drives Product card on desktop) */}
        <div ref={rightColRef} className="flex flex-col gap-6 lg:col-span-1">
        {/* Payment */}
        <Card className="overflow-hidden rounded-xl border border-card-border bg-card shadow-sm">
          <CardHeader className="border-b border-border/50 px-4 pb-4 sm:px-6">
            <CardTitle>Payment</CardTitle>
            <CardDescription>Final Payment Amount</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pt-6 sm:px-6">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{currencySymbol}{subtotal.toLocaleString()}</dd>
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
                  {shippingCost
                    ? `${currencySymbol}${shippingCost.toLocaleString()}`
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
                <dt>Total</dt>
                <dd>{currencySymbol}{totalNum.toLocaleString()}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Customer */}
        <Card className="overflow-hidden rounded-xl border border-card-border bg-card shadow-sm">
          <CardHeader className="border-b border-border/50 px-4 pb-4 sm:px-6">
            <CardTitle>Customer</CardTitle>
            <CardDescription>Information Detail</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pt-6 sm:px-6">
            {editing ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Name
                    </label>
                    <input
                      value={form.shipping_name}
                      onChange={(e) =>
                        setForm({ ...form, shipping_name: e.target.value })
                      }
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Phone
                    </label>
                    <input
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                      className="input"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Email
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      District
                    </label>
                    <input
                      value={form.district}
                      onChange={(e) =>
                        setForm({ ...form, district: e.target.value })
                      }
                      className="input"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Address
                  </label>
                  <textarea
                    rows={2}
                    value={form.shipping_address}
                    onChange={(e) =>
                      setForm({ ...form, shipping_address: e.target.value })
                    }
                    className="input"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Delivery Area
                    </label>
                    <select
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
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Tracking Number
                    </label>
                    <input
                      value={form.tracking_number}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          tracking_number: e.target.value,
                        })
                      }
                      className="input"
                    />
                  </div>
                </div>
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
                      {order.district && `${order.district}, `}
                      {order.delivery_area_label}
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

      {/* Timeline */}
      <Card className="overflow-hidden rounded-xl border border-card-border bg-card shadow-sm">
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
