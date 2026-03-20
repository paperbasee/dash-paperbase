"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Undo2 } from "lucide-react";

import api from "@/lib/api";
import axios from "axios";
import type {
  ShippingMethod,
  ShippingRate,
  ShippingZone,
  PaginatedResponse,
} from "@/types";

type ZoneForm = {
  name: string;
  delivery_areas: string;
  districts: string;
  is_active: boolean;
};

type MethodForm = {
  name: string;
  method_type: ShippingMethod["method_type"];
  order: string;
  is_active: boolean;
  zone_ids: number[];
};

type RateForm = {
  shipping_method: string;
  shipping_zone: string;
  rate_type: ShippingRate["rate_type"];
  min_order_total: string;
  max_order_total: string;
  price: string;
  is_active: boolean;
};

const emptyZone: ZoneForm = {
  name: "",
  delivery_areas: "",
  districts: "",
  is_active: true,
};

const emptyMethod: MethodForm = {
  name: "",
  method_type: "standard",
  order: "0",
  is_active: true,
  zone_ids: [],
};

const emptyRate: RateForm = {
  shipping_method: "",
  shipping_zone: "",
  rate_type: "flat",
  min_order_total: "",
  max_order_total: "",
  price: "",
  is_active: true,
};

function unwrap<T>(data: PaginatedResponse<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results;
}

export default function ShippingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [rates, setRates] = useState<ShippingRate[]>([]);

  const [editingZone, setEditingZone] = useState<string | "new" | null>(null);
  const [editingMethod, setEditingMethod] = useState<string | "new" | null>(null);
  const [editingRate, setEditingRate] = useState<string | "new" | null>(null);

  const [zoneForm, setZoneForm] = useState<ZoneForm>(emptyZone);
  const [methodForm, setMethodForm] = useState<MethodForm>(emptyMethod);
  const [rateForm, setRateForm] = useState<RateForm>(emptyRate);

  const [saving, setSaving] = useState(false);

  const methodById = useMemo(() => {
    const m = new Map<number, ShippingMethod>();
    methods.forEach((x) => m.set(x.id, x));
    return m;
  }, [methods]);
  const zoneById = useMemo(() => {
    const m = new Map<number, ShippingZone>();
    zones.forEach((x) => m.set(x.id, x));
    return m;
  }, [zones]);

  async function fetchAll() {
    setLoading(true);
    setError("");
    try {
      const [z, m, r] = await Promise.all([
        api.get<PaginatedResponse<ShippingZone> | ShippingZone[]>(
          "admin/shipping-zones/"
        ),
        api.get<PaginatedResponse<ShippingMethod> | ShippingMethod[]>(
          "admin/shipping-methods/"
        ),
        api.get<PaginatedResponse<ShippingRate> | ShippingRate[]>(
          "admin/shipping-rates/"
        ),
      ]);
      setZones(unwrap(z.data));
      setMethods(unwrap(m.data));
      setRates(unwrap(r.data));
    } catch (e) {
      console.error(e);
      if (axios.isAxiosError(e)) {
        const detail =
          (e.response?.data as { detail?: string } | undefined)?.detail ||
          (typeof e.response?.data === "string" ? e.response?.data : null);
        setError(detail || "Failed to load shipping rules.");
      } else {
        setError("Failed to load shipping rules.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  function openNewZone() {
    setEditingZone("new");
    setZoneForm(emptyZone);
  }
  function openEditZone(z: ShippingZone) {
    setEditingZone(z.public_id);
    setZoneForm({
      name: z.name,
      delivery_areas: z.delivery_areas || "",
      districts: z.districts || "",
      is_active: z.is_active,
    });
  }

  function openNewMethod() {
    setEditingMethod("new");
    setMethodForm(emptyMethod);
  }
  function openEditMethod(m: ShippingMethod) {
    setEditingMethod(m.public_id);
    setMethodForm({
      name: m.name,
      method_type: m.method_type,
      order: String(m.order ?? 0),
      is_active: m.is_active,
      zone_ids: Array.isArray(m.zone_ids) ? m.zone_ids : [],
    });
  }

  function openNewRate() {
    setEditingRate("new");
    setRateForm(emptyRate);
  }
  function openEditRate(r: ShippingRate) {
    setEditingRate(r.public_id);
    setRateForm({
      shipping_method: String(r.shipping_method),
      shipping_zone: String(r.shipping_zone),
      rate_type: r.rate_type,
      min_order_total: r.min_order_total || "",
      max_order_total: r.max_order_total || "",
      price: r.price,
      is_active: r.is_active,
    });
  }

  async function saveZone(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      name: zoneForm.name.trim(),
      delivery_areas: zoneForm.delivery_areas.trim(),
      districts: zoneForm.districts.trim(),
      is_active: zoneForm.is_active,
    };
    try {
      if (editingZone === "new") {
        await api.post("admin/shipping-zones/", payload);
      } else {
        await api.patch(`admin/shipping-zones/${editingZone}/`, payload);
      }
      setEditingZone(null);
      fetchAll();
    } catch (e) {
      console.error(e);
      if (axios.isAxiosError(e)) {
        const data = e.response?.data as
          | { detail?: string; name?: string[] }
          | undefined;
        const msg = data?.name?.[0] || data?.detail || "Failed to save zone.";
        setError(msg);
      } else {
        setError("Failed to save zone.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveMethod(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      name: methodForm.name.trim(),
      method_type: methodForm.method_type,
      order: parseInt(methodForm.order || "0", 10) || 0,
      is_active: methodForm.is_active,
      zone_ids: methodForm.zone_ids,
    };
    try {
      if (editingMethod === "new") {
        await api.post("admin/shipping-methods/", payload);
      } else {
        await api.patch(`admin/shipping-methods/${editingMethod}/`, payload);
      }
      setEditingMethod(null);
      fetchAll();
    } catch (e) {
      console.error(e);
      if (axios.isAxiosError(e)) {
        const data = e.response?.data as
          | { detail?: string; name?: string[] }
          | undefined;
        const msg = data?.name?.[0] || data?.detail || "Failed to save method.";
        setError(msg);
      } else {
        setError("Failed to save method.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveRate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload: Record<string, unknown> = {
      shipping_method: parseInt(rateForm.shipping_method, 10),
      shipping_zone: parseInt(rateForm.shipping_zone, 10),
      rate_type: rateForm.rate_type,
      price: rateForm.price,
      is_active: rateForm.is_active,
    };
    if (rateForm.min_order_total) payload.min_order_total = rateForm.min_order_total;
    if (rateForm.max_order_total) payload.max_order_total = rateForm.max_order_total;

    try {
      if (editingRate === "new") {
        await api.post("admin/shipping-rates/", payload);
      } else {
        await api.patch(`admin/shipping-rates/${editingRate}/`, payload);
      }
      setEditingRate(null);
      fetchAll();
    } catch (e) {
      console.error(e);
      if (axios.isAxiosError(e)) {
        const data = e.response?.data as { detail?: string } | undefined;
        setError(data?.detail || "Failed to save rate.");
      } else {
        setError("Failed to save rate.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function del(kind: "zones" | "methods" | "rates", publicId: string) {
    if (!confirm("Delete this item?")) return;
    setError("");
    try {
      await api.delete(`admin/shipping-${kind}/${publicId}/`);
      fetchAll();
    } catch (e) {
      console.error(e);
      setError("Failed to delete item.");
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
          <h1 className="text-2xl font-medium text-foreground">Shipping</h1>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium">Zones ({zones.length})</h2>
            <button
              type="button"
              onClick={openNewZone}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>

          {editingZone && (
            <form onSubmit={saveZone} className="mb-4 space-y-3">
              <input
                value={zoneForm.name}
                onChange={(e) => setZoneForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                placeholder="Zone name (e.g. Dhaka / Inside)"
                required
              />
              <input
                value={zoneForm.delivery_areas}
                onChange={(e) =>
                  setZoneForm((f) => ({ ...f, delivery_areas: e.target.value }))
                }
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                placeholder="delivery_areas (e.g. inside,outside) optional"
              />
              <input
                value={zoneForm.districts}
                onChange={(e) => setZoneForm((f) => ({ ...f, districts: e.target.value }))}
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                placeholder="districts (e.g. Dhaka) optional"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={zoneForm.is_active}
                  onChange={(e) =>
                    setZoneForm((f) => ({ ...f, is_active: e.target.checked }))
                  }
                />
                Active
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingZone(null)}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {zones.map((z) => (
              <div
                key={z.public_id}
                className="rounded-lg border border-border/60 bg-background px-3 py-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">
                      {z.name}{" "}
                      <span className="text-xs text-muted-foreground">
                        {z.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      areas: {z.delivery_areas || "any"} · districts:{" "}
                      {z.districts || "any"}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <button
                      type="button"
                      onClick={() => openEditZone(z)}
                      className="mr-2 text-primary hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => del("zones", z.public_id)}
                      className="text-destructive hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {zones.length === 0 && (
              <div className="rounded-lg border border-dashed border-border/60 bg-background px-3 py-8 text-center text-sm text-muted-foreground">
                No zones yet.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium">Methods ({methods.length})</h2>
            <button
              type="button"
              onClick={openNewMethod}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>

          {editingMethod && (
            <form onSubmit={saveMethod} className="mb-4 space-y-3">
              <input
                value={methodForm.name}
                onChange={(e) => setMethodForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                placeholder="Method name (e.g. Standard)"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={methodForm.method_type}
                  onChange={(e) =>
                    setMethodForm((f) => ({
                      ...f,
                      method_type: e.target.value as ShippingMethod["method_type"],
                    }))
                  }
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="standard">Standard</option>
                  <option value="express">Express</option>
                  <option value="pickup">Pickup</option>
                  <option value="other">Other</option>
                </select>
                <input
                  value={methodForm.order}
                  onChange={(e) => setMethodForm((f) => ({ ...f, order: e.target.value }))}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Sort order"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Applies to zones</label>
                <select
                  multiple
                  value={methodForm.zone_ids.map(String)}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map((o) =>
                      parseInt(o.value, 10)
                    );
                    setMethodForm((f) => ({ ...f, zone_ids: selected }));
                  }}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                >
                  {zones.map((z) => (
                    <option key={z.public_id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-xs text-muted-foreground">
                  Leave empty to apply to all zones.
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={methodForm.is_active}
                  onChange={(e) =>
                    setMethodForm((f) => ({ ...f, is_active: e.target.checked }))
                  }
                />
                Active
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingMethod(null)}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {methods.map((m) => (
              <div
                key={m.public_id}
                className="rounded-lg border border-border/60 bg-background px-3 py-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">
                      {m.name}{" "}
                      <span className="text-xs text-muted-foreground">
                        {m.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      type: {m.method_type} · order: {m.order} · zones:{" "}
                      {(m.zone_ids || [])
                        .map((id) => zoneById.get(id)?.name || `#${id}`)
                        .join(", ") || "all"}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <button
                      type="button"
                      onClick={() => openEditMethod(m)}
                      className="mr-2 text-primary hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => del("methods", m.public_id)}
                      className="text-destructive hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {methods.length === 0 && (
              <div className="rounded-lg border border-dashed border-border/60 bg-background px-3 py-8 text-center text-sm text-muted-foreground">
                No methods yet.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium">Rates ({rates.length})</h2>
            <button
              type="button"
              onClick={openNewRate}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>

          {editingRate && (
            <form onSubmit={saveRate} className="mb-4 space-y-3">
              <select
                value={rateForm.shipping_method}
                onChange={(e) =>
                  setRateForm((f) => ({ ...f, shipping_method: e.target.value }))
                }
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                required
              >
                <option value="" disabled>
                  Select method
                </option>
                {methods.map((m) => (
                  <option key={m.public_id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <select
                value={rateForm.shipping_zone}
                onChange={(e) =>
                  setRateForm((f) => ({ ...f, shipping_zone: e.target.value }))
                }
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                required
              >
                <option value="" disabled>
                  Select zone
                </option>
                {zones.map((z) => (
                  <option key={z.public_id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={rateForm.rate_type}
                  onChange={(e) =>
                    setRateForm((f) => ({
                      ...f,
                      rate_type: e.target.value as ShippingRate["rate_type"],
                    }))
                  }
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="flat">Flat</option>
                  <option value="order_total">By order total</option>
                  <option value="weight">By weight</option>
                </select>
                <input
                  value={rateForm.price}
                  onChange={(e) => setRateForm((f) => ({ ...f, price: e.target.value }))}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Price (e.g. 60.00)"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={rateForm.min_order_total}
                  onChange={(e) =>
                    setRateForm((f) => ({ ...f, min_order_total: e.target.value }))
                  }
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Min order total (optional)"
                />
                <input
                  value={rateForm.max_order_total}
                  onChange={(e) =>
                    setRateForm((f) => ({ ...f, max_order_total: e.target.value }))
                  }
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Max order total (optional)"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={rateForm.is_active}
                  onChange={(e) =>
                    setRateForm((f) => ({ ...f, is_active: e.target.checked }))
                  }
                />
                Active
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingRate(null)}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {rates.map((r) => (
              <div
                key={r.public_id}
                className="rounded-lg border border-border/60 bg-background px-3 py-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">
                      {methodById.get(r.shipping_method)?.name || `Method #${r.shipping_method}`}{" "}
                      → {zoneById.get(r.shipping_zone)?.name || `Zone #${r.shipping_zone}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.is_active ? "Active" : "Inactive"} · {r.rate_type} · price:{" "}
                      {r.price}
                      {(r.min_order_total || r.max_order_total) && (
                        <>
                          {" "}
                          · range: {r.min_order_total || "—"} – {r.max_order_total || "—"}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <button
                      type="button"
                      onClick={() => openEditRate(r)}
                      className="mr-2 text-primary hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => del("rates", r.public_id)}
                      className="text-destructive hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {rates.length === 0 && (
              <div className="rounded-lg border border-dashed border-border/60 bg-background px-3 py-8 text-center text-sm text-muted-foreground">
                No rates yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

