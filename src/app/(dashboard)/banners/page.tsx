"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Undo2, Plus, Image as ImageIcon } from "lucide-react";
import api from "@/lib/api";
import type { Banner, PaginatedResponse } from "@/types";

type BannerForm = {
  title: string;
  link_url: string;
  position: string;
  order: string;
  is_active: boolean;
};

const emptyForm: BannerForm = {
  title: "",
  link_url: "",
  position: "homepage",
  order: "0",
  is_active: true,
};

const POSITIONS = [
  { value: "homepage", label: "Homepage" },
  { value: "sidebar", label: "Sidebar" },
  { value: "footer", label: "Footer" },
  { value: "header", label: "Header" },
];

function imageUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  return base ? `${base.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}` : url;
}

export default function BannersPage() {
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<BannerForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  function fetchData() {
    setLoading(true);
    api
      .get<PaginatedResponse<Banner> | Banner[]>("admin/banners/")
      .then((res) => {
        const data = res.data;
        setBanners(Array.isArray(data) ? data : data.results);
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
    setImageFile(null);
  }

  function openEdit(banner: Banner) {
    setEditing(banner.id);
    setForm({
      title: banner.title,
      link_url: banner.link_url || "",
      position: banner.position,
      order: String(banner.order),
      is_active: banner.is_active,
    });
    setImageFile(null);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("link_url", form.link_url);
    fd.append("position", form.position);
    fd.append("order", form.order);
    fd.append("is_active", String(form.is_active));
    if (imageFile) fd.append("image", imageFile);

    try {
      if (editing === "new") {
        await api.post("admin/banners/", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.patch(`admin/banners/${editing}/`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      setEditing(null);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this banner?")) return;
    try {
      await api.delete(`admin/banners/${id}/`);
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
            Banners ({banners.length})
          </h1>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Banner
        </button>
      </div>

      {editing !== null && (
        <form
          onSubmit={handleSave}
          className="rounded-xl border border-border bg-card p-6 space-y-4"
        >
          <h2 className="text-lg font-medium">
            {editing === "new" ? "New Banner" : "Edit Banner"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Position</label>
              <select
                value={form.position}
                onChange={(e) =>
                  setForm((f) => ({ ...f, position: e.target.value }))
                }
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              >
                {POSITIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">Link URL</label>
              <input
                type="url"
                value={form.link_url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, link_url: e.target.value }))
                }
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Order</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) =>
                  setForm((f) => ({ ...f, order: e.target.value }))
                }
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              />
              {editing !== "new" && !imageFile && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Leave empty to keep current image
                </p>
              )}
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
              <label htmlFor="is_active" className="text-sm">
                Active
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || (editing === "new" && !imageFile)}
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
              <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Preview
              </th>
              <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Title
              </th>
              <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Position
              </th>
              <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Order
              </th>
              <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {banners.map((b) => (
              <tr key={b.id} className="hover:bg-muted/40">
                <td className="px-4 py-3">
                  {b.image ? (
                    <img
                      src={imageUrl(b.image) || b.image}
                      alt={b.title || "Banner"}
                      className="h-12 w-20 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-20 items-center justify-center rounded bg-muted">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-medium">
                  {b.title || "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground capitalize">
                  {b.position}
                </td>
                <td className="px-4 py-3">{b.order}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      b.is_active
                        ? "text-green-600 dark:text-green-400"
                        : "text-muted-foreground"
                    }
                  >
                    {b.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => openEdit(b)}
                    className="mr-2 text-primary hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(b.id)}
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

      {banners.length === 0 && !editing && (
        <div className="rounded-xl border border-dashed border-card-border bg-card py-12 text-center text-sm text-muted-foreground">
          No banners yet. Click "Add Banner" to create one.
        </div>
      )}
    </div>
  );
}
