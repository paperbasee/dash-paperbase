"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Plus, Undo2 } from "lucide-react";

import api from "@/lib/api";
import { ClickableText } from "@/components/ui/clickable-text";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { notify, normalizeError } from "@/notifications";
import type {
  ShippingMethod,
  ShippingRate,
  ShippingZone,
  PaginatedResponse,
} from "@/types";
import { DashboardDetailSkeleton } from "@/components/skeletons/dashboard-skeletons";
import { useEnterNavigation } from "@/hooks/useEnterNavigation";

const multiSelectClass =
  "w-full min-h-[6rem] rounded-ui border border-border bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

type ZoneForm = {
  name: string;
  is_active: boolean;
};

type MethodForm = {
  name: string;
  method_type: ShippingMethod["method_type"];
  order: string;
  is_active: boolean;
  zone_public_ids: string[];
};

type RateForm = {
  shipping_method_public_id: string;
  shipping_zone_public_id: string;
  rate_type: ShippingRate["rate_type"];
  min_order_total: string;
  max_order_total: string;
  price: string;
  is_active: boolean;
};

const emptyZone: ZoneForm = {
  name: "",
  is_active: true,
};

const emptyMethod: MethodForm = {
  name: "",
  method_type: "standard",
  order: "0",
  is_active: true,
  zone_public_ids: [],
};

const emptyRate: RateForm = {
  shipping_method_public_id: "",
  shipping_zone_public_id: "",
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
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const confirm = useConfirm();

  const methodTypeLabel = useMemo(
    () =>
      ({
        standard: tPages("shippingMethodTypeStandard"),
        express: tPages("shippingMethodTypeExpress"),
        pickup: tPages("shippingMethodTypePickup"),
        other: tPages("shippingMethodTypeOther"),
      }) as Record<ShippingMethod["method_type"], string>,
    [tPages],
  );

  const rateTypeLabel = useMemo(
    () =>
      ({
        flat: tPages("shippingRateTypeFlat"),
        order_total: tPages("shippingRateTypeOrderTotal"),
        weight: tPages("shippingRateTypeWeight"),
      }) as Record<ShippingRate["rate_type"], string>,
    [tPages],
  );
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
  const zoneFormRef = useRef<HTMLFormElement>(null);
  const methodFormRef = useRef<HTMLFormElement>(null);
  const rateFormRef = useRef<HTMLFormElement>(null);
  const { handleKeyDown } = useEnterNavigation(() => {
    if (editingRate) rateFormRef.current?.requestSubmit();
    else if (editingMethod) methodFormRef.current?.requestSubmit();
    else if (editingZone) zoneFormRef.current?.requestSubmit();
  });

  const methodByPublicId = useMemo(() => {
    const m = new Map<string, ShippingMethod>();
    methods.forEach((x) => m.set(x.public_id, x));
    return m;
  }, [methods]);
  const zoneByPublicId = useMemo(() => {
    const m = new Map<string, ShippingZone>();
    zones.forEach((x) => m.set(x.public_id, x));
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
      const normalized = normalizeError(e, tPages("shippingLoadFailed"));
      setError(normalized.message);
      notify.error(normalized.message);
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
      zone_public_ids: Array.isArray(m.zone_public_ids) ? m.zone_public_ids : [],
    });
  }

  function openNewRate() {
    setEditingRate("new");
    setRateForm(emptyRate);
  }
  function openEditRate(r: ShippingRate) {
    setEditingRate(r.public_id);
    setRateForm({
      shipping_method_public_id: r.shipping_method_public_id,
      shipping_zone_public_id: r.shipping_zone_public_id,
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
      const normalized = normalizeError(e, tPages("shippingSaveZoneFailed"));
      setError(normalized.message);
      notify.error(normalized.message);
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
      zone_public_ids: methodForm.zone_public_ids,
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
      const normalized = normalizeError(e, tPages("shippingSaveMethodFailed"));
      setError(normalized.message);
      notify.error(normalized.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveRate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload: Record<string, unknown> = {
      shipping_method_public_id: rateForm.shipping_method_public_id,
      shipping_zone_public_id: rateForm.shipping_zone_public_id,
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
      const normalized = normalizeError(e, tPages("shippingSaveRateFailed"));
      setError(normalized.message);
      notify.error(normalized.message);
    } finally {
      setSaving(false);
    }
  }

  async function del(kind: "zones" | "methods" | "rates", publicId: string) {
    const ok = await confirm({
      title: tPages("confirmDialogTitleDeleteShipping"),
      message: tPages("shippingConfirmDelete"),
      variant: "danger",
    });
    if (!ok) return;
    setError("");
    try {
      await api.delete(`admin/shipping-${kind}/${publicId}/`);
      notify.warning(tPages("shippingDeletedSuccess"));
      fetchAll();
    } catch (e) {
      console.error(e);
      setError(tPages("shippingDeleteFailed"));
      notify.error(e, { fallbackMessage: tPages("shippingDeleteFailed") });
    }
  }

  if (loading) {
    return <DashboardDetailSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-card bg-muted/80 px-1 py-1 hidden md:block">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label={tPages("shippingGoBackAria")}
              className="flex items-center justify-center rounded-ui p-1 text-muted-foreground hover:bg-muted"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          </div>
          <h1 className="text-2xl font-medium text-foreground">{tPages("shippingTitle")}</h1>
        </div>
      </div>

      {error && (
        <div className="rounded-card border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-card border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium">
              {tPages("shippingZonesTitle", { count: zones.length })}
            </h2>
            <button
              type="button"
              onClick={openNewZone}
              className="flex items-center gap-2 rounded-card border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              {tCommon("add")}
            </button>
          </div>

          {editingZone && (
            <form ref={zoneFormRef} onSubmit={saveZone} className="mb-4 space-y-3">
              <Input
                value={zoneForm.name}
                onChange={(e) => setZoneForm((f) => ({ ...f, name: e.target.value }))}
                className="text-sm"
                placeholder={tPages("shippingZoneNamePlaceholder")}
                required
                onKeyDown={handleKeyDown}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={zoneForm.is_active}
                  onChange={(e) =>
                    setZoneForm((f) => ({ ...f, is_active: e.target.checked }))
                  }
                  onKeyDown={handleKeyDown}
                />
                {tCommon("active")}
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-card bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? tCommon("saving") : tCommon("save")}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingZone(null)}
                  className="rounded-card border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
                >
                  {tCommon("cancel")}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {zones.map((z) => (
              <div
                key={z.public_id}
                className="rounded-card border border-border/60 bg-background px-3 py-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">
                      <ClickableText
                        onClick={() => openEditZone(z)}
                        className="font-medium text-foreground"
                      >
                        {z.name}
                      </ClickableText>{" "}
                      <span className="text-xs text-muted-foreground">
                        {z.is_active ? tCommon("active") : tCommon("inactive")}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {z.public_id}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <ClickableText
                      variant="destructive"
                      onClick={() => del("zones", z.public_id)}
                      className="text-sm"
                    >
                      {tCommon("delete")}
                    </ClickableText>
                  </div>
                </div>
              </div>
            ))}
            {zones.length === 0 && (
              <div className="rounded-card border border-dashed border-border/60 bg-background px-3 py-8 text-center text-sm text-muted-foreground">
                {tPages("shippingZonesEmpty")}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-card border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium">
              {tPages("shippingMethodsTitle", { count: methods.length })}
            </h2>
            <button
              type="button"
              onClick={openNewMethod}
              className="flex items-center gap-2 rounded-card border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              {tCommon("add")}
            </button>
          </div>

          {editingMethod && (
            <form ref={methodFormRef} onSubmit={saveMethod} className="mb-4 space-y-3">
              <Input
                value={methodForm.name}
                onChange={(e) => setMethodForm((f) => ({ ...f, name: e.target.value }))}
                className="text-sm"
                placeholder={tPages("shippingMethodNamePlaceholder")}
                required
                onKeyDown={handleKeyDown}
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  value={methodForm.method_type}
                  onChange={(e) =>
                    setMethodForm((f) => ({
                      ...f,
                      method_type: e.target.value as ShippingMethod["method_type"],
                    }))
                  }
                  className="text-sm"
                >
                  <option value="standard">{tPages("shippingMethodTypeStandard")}</option>
                  <option value="express">{tPages("shippingMethodTypeExpress")}</option>
                  <option value="pickup">{tPages("shippingMethodTypePickup")}</option>
                  <option value="other">{tPages("shippingMethodTypeOther")}</option>
                </Select>
                <Input
                  value={methodForm.order}
                  onChange={(e) => setMethodForm((f) => ({ ...f, order: e.target.value }))}
                  className="text-sm"
                  placeholder={tPages("shippingSortOrderPlaceholder")}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {tPages("shippingAppliesToZones")}
                </label>
                <select
                  multiple
                  value={methodForm.zone_public_ids}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                    setMethodForm((f) => ({ ...f, zone_public_ids: selected }));
                  }}
                  className={multiSelectClass}
                >
                  {zones.map((z) => (
                    <option key={z.public_id} value={z.public_id}>
                      {z.name}
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-xs text-muted-foreground">
                  {tPages("shippingZonesEmptyHint")}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={methodForm.is_active}
                  onChange={(e) =>
                    setMethodForm((f) => ({ ...f, is_active: e.target.checked }))
                  }
                  onKeyDown={handleKeyDown}
                />
                {tCommon("active")}
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-card bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? tCommon("saving") : tCommon("save")}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingMethod(null)}
                  className="rounded-card border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
                >
                  {tCommon("cancel")}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {methods.map((m) => (
              <div
                key={m.public_id}
                className="rounded-card border border-border/60 bg-background px-3 py-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">
                      <ClickableText
                        onClick={() => openEditMethod(m)}
                        className="font-medium text-foreground"
                      >
                        {m.name}
                      </ClickableText>{" "}
                      <span className="text-xs text-muted-foreground">
                        {m.is_active ? tCommon("active") : tCommon("inactive")}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tPages("shippingMethodMeta", {
                        type: methodTypeLabel[m.method_type],
                        order: m.order,
                        zones:
                          (m.zone_public_ids || [])
                            .map((pid) => zoneByPublicId.get(pid)?.name || pid)
                            .join(", ") || tPages("shippingZonesAll"),
                      })}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <ClickableText
                      variant="destructive"
                      onClick={() => del("methods", m.public_id)}
                      className="text-sm"
                    >
                      {tCommon("delete")}
                    </ClickableText>
                  </div>
                </div>
              </div>
            ))}
            {methods.length === 0 && (
              <div className="rounded-card border border-dashed border-border/60 bg-background px-3 py-8 text-center text-sm text-muted-foreground">
                {tPages("shippingMethodsEmpty")}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-card border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium">
              {tPages("shippingRatesTitle", { count: rates.length })}
            </h2>
            <button
              type="button"
              onClick={openNewRate}
              className="flex items-center gap-2 rounded-card border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              {tCommon("add")}
            </button>
          </div>

          {editingRate && (
            <form ref={rateFormRef} onSubmit={saveRate} className="mb-4 space-y-3">
              <Select
                value={rateForm.shipping_method_public_id}
                onChange={(e) =>
                  setRateForm((f) => ({ ...f, shipping_method_public_id: e.target.value }))
                }
                className="text-sm"
                required
              >
                <option value="" disabled>
                  {tPages("shippingSelectMethod")}
                </option>
                {methods.map((m) => (
                  <option key={m.public_id} value={m.public_id}>
                    {m.name}
                  </option>
                ))}
              </Select>
              <Select
                value={rateForm.shipping_zone_public_id}
                onChange={(e) =>
                  setRateForm((f) => ({ ...f, shipping_zone_public_id: e.target.value }))
                }
                className="text-sm"
                required
              >
                <option value="" disabled>
                  {tPages("shippingSelectZone")}
                </option>
                {zones.map((z) => (
                    <option key={z.public_id} value={z.public_id}>
                      {z.name}
                    </option>
                  ))}
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  value={rateForm.rate_type}
                  onChange={(e) =>
                    setRateForm((f) => ({
                      ...f,
                      rate_type: e.target.value as ShippingRate["rate_type"],
                    }))
                  }
                  className="text-sm"
                >
                  <option value="flat">{tPages("shippingRateTypeFlat")}</option>
                  <option value="order_total">{tPages("shippingRateTypeOrderTotal")}</option>
                  <option value="weight">{tPages("shippingRateTypeWeight")}</option>
                </Select>
                <Input
                  value={rateForm.price}
                  onChange={(e) => setRateForm((f) => ({ ...f, price: e.target.value }))}
                  className="text-sm"
                  placeholder={tPages("shippingPricePlaceholder")}
                  required
                  onKeyDown={handleKeyDown}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  value={rateForm.min_order_total}
                  onChange={(e) =>
                    setRateForm((f) => ({ ...f, min_order_total: e.target.value }))
                  }
                  className="text-sm"
                  placeholder={tPages("shippingMinOrderPlaceholder")}
                  onKeyDown={handleKeyDown}
                />
                <Input
                  value={rateForm.max_order_total}
                  onChange={(e) =>
                    setRateForm((f) => ({ ...f, max_order_total: e.target.value }))
                  }
                  className="text-sm"
                  placeholder={tPages("shippingMaxOrderPlaceholder")}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={rateForm.is_active}
                  onChange={(e) =>
                    setRateForm((f) => ({ ...f, is_active: e.target.checked }))
                  }
                  onKeyDown={handleKeyDown}
                />
                {tCommon("active")}
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-card bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? tCommon("saving") : tCommon("save")}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingRate(null)}
                  className="rounded-card border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
                >
                  {tCommon("cancel")}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {rates.map((r) => (
              <div
                key={r.public_id}
                className="rounded-card border border-border/60 bg-background px-3 py-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">
                      <ClickableText
                        onClick={() => openEditRate(r)}
                        className="font-medium text-foreground"
                      >
                        {methodByPublicId.get(r.shipping_method_public_id)?.name ||
                          r.shipping_method_public_id}{" "}
                        →{" "}
                        {zoneByPublicId.get(r.shipping_zone_public_id)?.name ||
                          r.shipping_zone_public_id}
                      </ClickableText>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tPages("shippingRateMeta", {
                        status: r.is_active ? tCommon("active") : tCommon("inactive"),
                        rateType: rateTypeLabel[r.rate_type],
                        price: r.price,
                      })}
                      {(r.min_order_total || r.max_order_total) &&
                        tPages("shippingRateRange", {
                          min: r.min_order_total || "—",
                          max: r.max_order_total || "—",
                        })}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <ClickableText
                      variant="destructive"
                      onClick={() => del("rates", r.public_id)}
                      className="text-sm"
                    >
                      {tCommon("delete")}
                    </ClickableText>
                  </div>
                </div>
              </div>
            ))}
            {rates.length === 0 && (
              <div className="rounded-card border border-dashed border-border/60 bg-background px-3 py-8 text-center text-sm text-muted-foreground">
                {tPages("shippingRatesEmpty")}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

