 "use client";

import { useEffect, useState, type FormEvent } from "react";
import api from "@/lib/api";
import type { Brand, PaginatedResponse } from "@/types";

type BrandForm = {
  name: string; slug: string; redirect_url: string;
  brand_type: string; order: string; is_active: boolean;
};

const emptyForm: BrandForm = { name: "", slug: "", redirect_url: "", brand_type: "gadgets", order: "0", is_active: true };

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<BrandForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  function fetchData() {
    setLoading(true);
    api
      .get<PaginatedResponse<Brand> | Brand[]>("/api/admin/brands/")
      .then((res) => {
        const data = res.data;
        setBrands(Array.isArray(data) ? data : data.results);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, []);

  function openNew() {
    setEditing("new");
    setForm(emptyForm);
    setImageFile(null);
  }

  function openEdit(brand: Brand) {
    setEditing(brand.id);
    setForm({
      name: brand.name, slug: brand.slug, redirect_url: brand.redirect_url,
      brand_type: brand.brand_type, order: String(brand.order), is_active: brand.is_active,
    });
    setImageFile(null);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("slug", form.slug);
    fd.append("redirect_url", form.redirect_url);
    fd.append("brand_type", form.brand_type);
    fd.append("order", form.order);
    fd.append("is_active", String(form.is_active));
    if (imageFile) fd.append("image", imageFile);

    try {
      if (editing === "new") {
        await api.post("/api/admin/brands/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        await api.patch(`/api/admin/brands/${editing}/`, fd, { headers: { "Content-Type": "multipart/form-data" } });
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
    if (!confirm("Delete this brand?")) return;
    try {
      await api.delete(`/api/admin/brands/${id}/`);
      fetchData();
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
        <h1 className="text-2xl font-medium text-gray-900">Brands ({brands.length})</h1>
        <button onClick={openNew} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Add Brand</button>
      </div>

      {editing !== null && (
        <form onSubmit={handleSave} className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-800">{editing === "new" ? "New Brand" : "Edit Brand"}</p>
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
            <input required placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="input" />
          </div>
          <input required placeholder="Redirect URL" type="url" value={form.redirect_url} onChange={(e) => setForm({ ...form, redirect_url: e.target.value })} className="input" />
          <div className="grid grid-cols-4 gap-3">
            <select value={form.brand_type} onChange={(e) => setForm({ ...form, brand_type: e.target.value })} className="input">
              <option value="gadgets">Gadgets</option>
              <option value="accessories">Accessories</option>
            </select>
            <input type="number" placeholder="Order" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} className="input" />
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} className="input" />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">Brand</th>
              <th className="px-4 py-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">Order</th>
              <th className="px-4 py-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">Created</th>
              <th className="px-4 py-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {brands.map((brand) => (
              <tr key={brand.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {brand.image && <img src={brand.image} alt={brand.name} className="h-8 w-8 rounded-lg object-contain" />}
                    <span className="font-medium text-gray-900">{brand.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 capitalize">{brand.brand_type}</td>
                <td className="px-4 py-3 text-gray-700">{brand.order}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${brand.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {brand.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {formatDate(brand.created_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(brand)} className="text-sm text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(brand.id)} className="text-sm text-red-600 hover:underline">Delete</button>
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
