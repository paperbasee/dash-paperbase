 "use client";

import { useEffect, useState, type FormEvent } from "react";
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
  const [ctas, setCtas] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<CtaForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  function fetchData() {
    setLoading(true);
    api
      .get<PaginatedResponse<Notification> | Notification[]>("/api/admin/notifications/")
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
    setEditing(n.id);
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
        await api.post("/api/admin/notifications/", payload);
      } else {
        await api.patch(`/api/admin/notifications/${editing}/`, payload);
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
        `/api/admin/notifications/${n.id}/`,
        { is_active: !n.is_active }
      );
      setCtas((prev) => prev.map((x) => (x.id === data.id ? data : x)));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this CTA?")) return;
    try {
      await api.delete(`/api/admin/notifications/${id}/`);
      setCtas((prev) => prev.filter((n) => n.id !== id));
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
        <h1 className="text-2xl font-medium text-gray-900">
          CTA banners ({ctas.length})
        </h1>
        <button
          onClick={openNew}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Add CTA
        </button>
      </div>

      {editing !== null && (
        <form
          onSubmit={handleSave}
          className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4"
        >
          <p className="text-sm font-semibold text-blue-800">
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
            <label className="flex items-center gap-2 text-sm text-gray-700">
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
              <label className="mb-1 block text-xs text-gray-500">
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
              <label className="mb-1 block text-xs text-gray-500">
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
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save CTA"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Text
              </th>
              <th className="px-4 py-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Type
              </th>
              <th className="px-4 py-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Active
              </th>
              <th className="px-4 py-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Schedule
              </th>
              <th className="px-4 py-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ctas.map((n) => (
              <tr key={n.id} className="hover:bg-gray-50">
                <td className="max-w-xs truncate px-4 py-3 font-medium text-gray-900">
                  {n.text}
                </td>
                <td className="px-4 py-3 text-gray-500 capitalize">
                  {n.notification_type}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(n)}
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      n.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {n.is_active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
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
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="text-sm text-red-600 hover:underline"
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

