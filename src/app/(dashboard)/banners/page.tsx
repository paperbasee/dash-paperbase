"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Undo2, Plus } from "lucide-react";
import { isAxiosError } from "axios";
import api from "@/lib/api";
import { ClickableText } from "@/components/ui/clickable-text";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Banner, PaginatedResponse } from "@/types";

type BannerForm = {
  title: string;
  description: string;
  cta_text: string;
  redirect_url: string;
  is_clickable: boolean;
  placement: string;
  position: string;
  is_active: boolean;
  start_date: string;
  end_date: string;
};

const emptyForm: BannerForm = {
  title: "",
  description: "",
  cta_text: "",
  redirect_url: "",
  is_clickable: false,
  placement: "homepage_hero",
  position: "0",
  is_active: true,
  start_date: "",
  end_date: "",
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
      title: banner.title,
      description: banner.description || "",
      cta_text: banner.cta_text || "",
      redirect_url: banner.redirect_url || "",
      is_clickable: banner.is_clickable,
      placement: banner.placement,
      position: String(banner.position),
      is_active: banner.is_active,
      start_date: toDateTimeLocal(banner.start_date),
      end_date: toDateTimeLocal(banner.end_date),
    });
    setImageFile(null);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("description", form.description);
    fd.append("cta_text", form.cta_text);
    const redirectUrl = form.redirect_url.trim();
    if (redirectUrl) fd.append("redirect_url", redirectUrl);
    fd.append("is_clickable", String(form.is_clickable));
    fd.append("placement", form.placement);
    fd.append("position", form.position);
    fd.append("is_active", String(form.is_active));
    if (form.start_date) fd.append("start_date", form.start_date);
    if (form.end_date) fd.append("end_date", form.end_date);
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
          className="rounded-xl border border-border bg-card p-6 space-y-4"
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
              <label className="mb-1 block text-sm font-medium">Placement</label>
              <Textarea
                value={form.placement}
                onChange={(e) =>
                  setForm((f) => ({ ...f, placement: e.target.value }))
                }
                className="text-sm"
                placeholder="e.g. homepage_hero"
                rows={2}
                maxLength={50}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className="text-sm"
                placeholder="Optional"
                rows={3}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">CTA Text</label>
              <Input
                type="text"
                value={form.cta_text}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cta_text: e.target.value }))
                }
                className="text-sm"
                placeholder='e.g. "Shop Now"'
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Position</label>
              <Input
                type="number"
                value={form.position}
                onChange={(e) =>
                  setForm((f) => ({ ...f, position: e.target.value }))
                }
                className="text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">Redirect URL</label>
              <Input
                type="url"
                value={form.redirect_url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, redirect_url: e.target.value }))
                }
                className="text-sm"
                placeholder="https://..."
                required={form.is_clickable}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Start Date</label>
              <Input
                type="datetime-local"
                value={form.start_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, start_date: e.target.value }))
                }
                className="text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">End Date</label>
              <Input
                type="datetime-local"
                value={form.end_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, end_date: e.target.value }))
                }
                className="text-sm"
              />
            </div>
            <div>
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
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_clickable"
                className="form-checkbox"
                checked={form.is_clickable}
                onChange={(e) =>
                  setForm((f) => ({ ...f, is_clickable: e.target.checked }))
                }
              />
              <label htmlFor="is_clickable" className="text-sm">
                Clickable
              </label>
            </div>
            <div className="flex items-center gap-2">
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
              <th className="th">
                Title
              </th>
              <th className="th">
                Placement
              </th>
              <th className="th">
                Position
              </th>
              <th className="th">
                Start Date
              </th>
              <th className="th">
                End Date
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
            {banners.map((b) => (
              <tr key={b.public_id} className="hover:bg-muted/40">
                <td className="px-4 py-3 font-medium">
                  {b.title || "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground capitalize">
                  {b.placement}
                </td>
                <td className="px-4 py-3">{b.position}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {b.start_date ? new Date(b.start_date).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {b.end_date ? new Date(b.end_date).toLocaleString() : "—"}
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
