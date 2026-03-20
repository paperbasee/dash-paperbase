"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import api from "@/lib/api";
import type { Notification, PaginatedResponse } from "@/types";

type CtaForm = {
  text: string;
  notification_type: string;
  is_active: boolean;
  link: string;
  link_text: string;
  start_date: string;
  end_date: string;
  order: string;
};

const emptyForm: CtaForm = {
  text: "",
  notification_type: "banner",
  is_active: true,
  link: "",
  link_text: "",
  start_date: "",
  end_date: "",
  order: "0",
};

function formatDate(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function CtaPage() {
  const router = useRouter();
  const [ctas, setCtas] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<CtaForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  function fetchData() {
    setLoading(true);
    api
      .get<PaginatedResponse<Notification> | Notification[]>("admin/notifications/")
      .then((res) => {
        const data = res.data;
        setCtas(Array.isArray(data) ? data : data.results);
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

  function openEdit(n: Notification) {
    setEditing(n.public_id);
    setForm({
      text: n.text,
      notification_type: n.notification_type,
      is_active: n.is_active,
      link: n.link || "",
      link_text: n.link_text || "",
      start_date: n.start_date ? n.start_date.slice(0, 16) : "",
      end_date: n.end_date ? n.end_date.slice(0, 16) : "",
      order: String(n.order),
    });
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload: Record<string, unknown> = {
      text: form.text,
      notification_type: form.notification_type,
      is_active: form.is_active,
      order: Number(form.order),
      link: form.link || null,
      link_text: form.link_text,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };

    try {
      if (editing === "new") {
        await api.post("admin/notifications/", payload);
      } else {
        await api.patch(`admin/notifications/${editing}/`, payload);
      }
      setEditing(null);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(n: Notification) {
    try {
      const { data } = await api.patch<Notification>(
        `admin/notifications/${n.public_id}/`,
        { is_active: !n.is_active }
      );
      setCtas((prev) =>
        prev.map((x) => (x.public_id === data.public_id ? data : x))
      );
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(publicId: string) {
    if (!confirm("Delete this CTA?")) return;
    try {
      await api.delete(`admin/notifications/${publicId}/`);
      setCtas((prev) => prev.filter((n) => n.public_id !== publicId));
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
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
            CTA banners ({ctas.length})
          </h1>
        </div>
        <button
          onClick={openNew}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Add CTA
        </button>
      </div>

      {editing !== null && (
        <form
          onSubmit={handleSave}
          className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4"
        >
          <p className="text-sm font-semibold text-primary">
            {editing === "new" ? "New CTA" : "Edit CTA"}
          </p>
          <textarea
            required
            placeholder="CTA text"
            rows={2}
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
            className="input"
          />
          <div className="grid grid-cols-3 gap-3">
            <select
              value={form.notification_type}
              onChange={(e) =>
                setForm({ ...form, notification_type: e.target.value })
              }
              className="input"
            >
              <option value="banner">Banner</option>
              <option value="alert">Alert</option>
              <option value="promo">Promotion</option>
            </select>
            <input
              type="number"
              placeholder="Order"
              value={form.order}
              onChange={(e) => setForm({ ...form, order: e.target.value })}
              className="input"
            />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
              />{" "}
              Active
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Link URL (optional)"
              type="url"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              className="input"
            />
            <input
              placeholder="Link text (optional)"
              value={form.link_text}
              onChange={(e) =>
                setForm({ ...form, link_text: e.target.value })
              }
              className="input"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Start date (optional)
              </label>
              <input
                type="datetime-local"
                value={form.start_date}
                onChange={(e) =>
                  setForm({ ...form, start_date: e.target.value })
                }
                className="input"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                End date (optional)
              </label>
              <input
                type="datetime-local"
                value={form.end_date}
                onChange={(e) =>
                  setForm({ ...form, end_date: e.target.value })
                }
                className="input"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save CTA"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
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
                Text
              </th>
              <th className="th">
                Type
              </th>
              <th className="th">
                Active
              </th>
              <th className="th">
                Schedule
              </th>
              <th className="th">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {ctas.map((n) => (
              <tr key={n.public_id} className="hover:bg-muted/40">
                <td className="max-w-xs truncate px-4 py-3 font-medium text-foreground">
                  {n.text}
                </td>
                <td className="px-4 py-3 text-muted-foreground capitalize">
                  {n.notification_type}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(n)}
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      n.is_active
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {n.is_active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {n.start_date
                    ? `${formatDate(n.start_date)} - ${
                        n.end_date ? formatDate(n.end_date) : "∞"
                      }`
                    : "Always"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(n)}
                      className="text-sm text-primary hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(n.public_id)}
                      className="text-sm text-destructive hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

