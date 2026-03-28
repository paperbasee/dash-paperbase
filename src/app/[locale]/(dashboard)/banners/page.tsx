"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "@/i18n/navigation";
import { Undo2, Plus } from "lucide-react";
import { isAxiosError } from "axios";
import api from "@/lib/api";
import { ClickableText } from "@/components/ui/clickable-text";
import { Input } from "@/components/ui/input";
import type { Banner, PaginatedResponse } from "@/types";

type BannerForm = {
  title: string;
  cta_text: string;
  cta_link: string;
  order: string;
  is_active: boolean;
  start_at: string;
  end_at: string;
};

const emptyForm: BannerForm = {
  title: "",
  cta_text: "",
  cta_link: "",
  order: "0",
  is_active: true,
  start_at: "",
  end_at: "",
};

function toDateTimeLocal(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 16);
}

export default function BannersPage() {
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | "new" | null>(null);
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
    setEditing(banner.public_id);
    setForm({
      title: banner.title || "",
      cta_text: banner.cta_text || "",
      cta_link: banner.cta_link || "",
      order: String(banner.order ?? 0),
      is_active: banner.is_active,
      start_at: toDateTimeLocal(banner.start_at),
      end_at: toDateTimeLocal(banner.end_at),
    });
    setImageFile(null);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("cta_text", form.cta_text);
    fd.append("cta_link", form.cta_link.trim());
    fd.append("order", form.order || "0");
    fd.append("is_active", String(form.is_active));
    if (form.start_at) fd.append("start_at", form.start_at);
    if (form.end_at) fd.append("end_at", form.end_at);
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
      if (isAxiosError(err)) {
        console.error("Banner save failed:", err.response?.data || err.message);
      } else {
        console.error(err);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(publicId: string) {
    if (!confirm("Delete this banner?")) return;
    try {
      await api.delete(`admin/banners/${publicId}/`);
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
          className="space-y-4 rounded-xl border border-border bg-card p-6"
        >
          <h2 className="text-lg font-medium">
            {editing === "new" ? "New Banner" : "Edit Banner"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Title</label>
              <Input
                type="text"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                className="text-sm"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Display order</label>
              <Input
                type="number"
                min={0}
                value={form.order}
                onChange={(e) =>
                  setForm((f) => ({ ...f, order: e.target.value }))
                }
                className="text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">CTA text</label>
              <Input
                type="text"
                value={form.cta_text}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cta_text: e.target.value }))
                }
                className="text-sm"
                placeholder='e.g. "Shop now"'
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">CTA link (URL)</label>
              <Input
                type="url"
                value={form.cta_link}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cta_link: e.target.value }))
                }
                className="text-sm"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Start</label>
              <Input
                type="datetime-local"
                value={form.start_at}
                onChange={(e) =>
                  setForm((f) => ({ ...f, start_at: e.target.value }))
                }
                className="text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">End</label>
              <Input
                type="datetime-local"
                value={form.end_at}
                onChange={(e) =>
                  setForm((f) => ({ ...f, end_at: e.target.value }))
                }
                className="text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="form-file-input text-sm"
              />
              {editing !== "new" && !imageFile && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Leave empty to keep current image
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                id="is_active"
                className="form-checkbox"
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
              <th className="th">Preview</th>
              <th className="th">Title</th>
              <th className="th">Order</th>
              <th className="th">Start</th>
              <th className="th">End</th>
              <th className="th">Status</th>
              <th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {banners.map((b) => (
              <tr key={b.public_id} className="hover:bg-muted/40">
                <td className="px-4 py-3">
                  {b.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.image}
                      alt=""
                      className="h-12 w-20 rounded object-cover"
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium">
                  {b.title || "—"}
                </td>
                <td className="px-4 py-3">{b.order}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {b.start_at ? new Date(b.start_at).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {b.end_at ? new Date(b.end_at).toLocaleString() : "—"}
                </td>
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
                  <ClickableText
                    onClick={() => openEdit(b)}
                    className="mr-2 text-sm"
                  >
                    Edit
                  </ClickableText>
                  <ClickableText
                    variant="destructive"
                    onClick={() => handleDelete(b.public_id)}
                    className="text-sm"
                  >
                    Delete
                  </ClickableText>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {banners.length === 0 && !editing && (
        <div className="rounded-xl border border-dashed border-card-border bg-card py-12 text-center text-sm text-muted-foreground">
          No banners yet. Click Add Banner to create one.
        </div>
      )}
    </div>
  );
}
