"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Undo2, Plus } from "lucide-react";
import api from "@/lib/api";
import type { Coupon, PaginatedResponse } from "@/types";

type CouponForm = {
  code: string;
  discount_type: string;
  discount_value: string;
  min_order_value: string;
  max_uses: string;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
};

const emptyForm: CouponForm = {
  code: "",
  discount_type: "percentage",
  discount_value: "",
  min_order_value: "",
  max_uses: "",
  valid_from: "",
  valid_until: "",
  is_active: true,
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function CouponsPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  function fetchData() {
    setLoading(true);
    api
      .get<PaginatedResponse<Coupon> | Coupon[]>("admin/coupons/")
      .then((res) => {
        const data = res.data;
        setCoupons(Array.isArray(data) ? data : data.results);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchData();
  }, []);

  function openNew() {
    setEditing("new");
    setForm(emptyForm);
  }

  function openEdit(coupon: Coupon) {
    setEditing(coupon.public_id);
    setForm({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_value: coupon.min_order_value || "",
      max_uses: coupon.max_uses != null ? String(coupon.max_uses) : "",
      valid_from: coupon.valid_from ? coupon.valid_from.slice(0, 10) : "",
      valid_until: coupon.valid_until ? coupon.valid_until.slice(0, 10) : "",
      is_active: coupon.is_active,
    });
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: Record<string, unknown> = {
      code: form.code.trim(),
      discount_type: form.discount_type,
      discount_value: form.discount_value,
      is_active: form.is_active,
    };
    if (form.min_order_value) payload.min_order_value = form.min_order_value;
    if (form.max_uses) payload.max_uses = parseInt(form.max_uses, 10);
    if (form.valid_from) payload.valid_from = `${form.valid_from}T00:00:00Z`;
    if (form.valid_until) payload.valid_until = `${form.valid_until}T23:59:59Z`;

    try {
      if (editing === "new") {
        await api.post("admin/coupons/", payload);
      } else {
        await api.patch(`admin/coupons/${editing}/`, payload);
      }
      setEditing(null);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(publicId: string) {
    if (!confirm("Delete this coupon?")) return;
    try {
      await api.delete(`admin/coupons/${publicId}/`);
      fetchData();
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
          <h1 className="text-2xl font-medium text-foreground">
            Coupons ({coupons.length})
          </h1>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <Plus className="h-4 w-4" />
          Add Coupon
        </button>
      </div>

      {editing && (
        <form
          onSubmit={handleSave}
          className="rounded-xl border border-border bg-card p-6 space-y-4"
        >
          <h2 className="text-lg font-medium">
            {editing === "new" ? "New Coupon" : "Edit Coupon"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Code</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                placeholder="SAVE20"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Discount type</label>
              <select
                value={form.discount_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discount_type: e.target.value }))
                }
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed amount</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Discount value</label>
              <input
                type="text"
                value={form.discount_value}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discount_value: e.target.value }))
                }
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                placeholder={form.discount_type === "percentage" ? "20" : "10.00"}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Min order value</label>
              <input
                type="text"
                value={form.min_order_value}
                onChange={(e) =>
                  setForm((f) => ({ ...f, min_order_value: e.target.value }))
                }
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Max uses</label>
              <input
                type="text"
                value={form.max_uses}
                onChange={(e) =>
                  setForm((f) => ({ ...f, max_uses: e.target.value }))
                }
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Valid from</label>
              <input
                type="date"
                value={form.valid_from}
                onChange={(e) =>
                  setForm((f) => ({ ...f, valid_from: e.target.value }))
                }
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Valid until</label>
              <input
                type="date"
                value={form.valid_until}
                onChange={(e) =>
                  setForm((f) => ({ ...f, valid_until: e.target.value }))
                }
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, is_active: e.target.checked }))
                }
              />
              <label htmlFor="is_active" className="text-sm">Active</label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-dashed border-card-border bg-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="th">
                Code
              </th>
              <th className="th">
                Discount
              </th>
              <th className="th">
                Uses
              </th>
              <th className="th">
                Valid
              </th>
              <th className="th">
                Status
              </th>
              <th className="th text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {coupons.map((c) => (
              <tr key={c.public_id} className="hover:bg-muted/40">
                <td className="px-4 py-3 font-medium">{c.code}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {c.discount_type === "percentage"
                    ? `${c.discount_value}%`
                    : `$${c.discount_value}`}
                </td>
                <td className="px-4 py-3">
                  {c.times_used}
                  {c.max_uses != null ? ` / ${c.max_uses}` : ""}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(c.valid_from)} – {formatDate(c.valid_until)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      c.is_active
                        ? "text-green-600 dark:text-green-400"
                        : "text-muted-foreground"
                    }
                  >
                    {c.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    className="mr-2 text-primary hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.public_id)}
                    className="text-destructive hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {coupons.length === 0 && !editing && (
        <div className="rounded-xl border border-dashed border-card-border bg-card py-12 text-center text-sm text-muted-foreground">
          No coupons yet. Click "Add Coupon" to create one.
        </div>
      )}
    </div>
  );
}
