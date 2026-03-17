"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import api from "@/lib/api";
import type { NavbarCategory, Category, PaginatedResponse } from "@/types";

type NavForm = { name: string; slug: string; description: string; order: string; is_active: boolean };
type SubForm = { name: string; slug: string; description: string; navbar_category: string; order: string; is_active: boolean };

const emptyNavForm: NavForm = { name: "", slug: "", description: "", order: "0", is_active: true };
const emptySubForm: SubForm = { name: "", slug: "", description: "", navbar_category: "", order: "0", is_active: true };

export default function CategoriesPage() {
  const router = useRouter();
  const [navCategories, setNavCategories] = useState<NavbarCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [navEditing, setNavEditing] = useState<number | "new" | null>(null);
  const [navForm, setNavForm] = useState<NavForm>(emptyNavForm);
  const [navImageFile, setNavImageFile] = useState<File | null>(null);
  const [navSaving, setNavSaving] = useState(false);

  const [subEditing, setSubEditing] = useState<number | "new" | null>(null);
  const [subForm, setSubForm] = useState<SubForm>(emptySubForm);
  const [subImageFile, setSubImageFile] = useState<File | null>(null);
  const [subSaving, setSubSaving] = useState(false);

  function fetchData() {
    setLoading(true);
    Promise.all([
      api.get<PaginatedResponse<NavbarCategory> | NavbarCategory[]>("/api/admin/navbar-categories/"),
      api.get<PaginatedResponse<Category> | Category[]>("/api/admin/categories/"),
    ])
      .then(([navRes, catRes]) => {
        const navData = navRes.data;
        const catData = catRes.data;
        setNavCategories(Array.isArray(navData) ? navData : navData.results);
        setCategories(Array.isArray(catData) ? catData : catData.results);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, []);

  function openNavEdit(cat: NavbarCategory) {
    setNavEditing(cat.id);
    setNavForm({ name: cat.name, slug: cat.slug, description: cat.description, order: String(cat.order), is_active: cat.is_active });
    setNavImageFile(null);
  }

  function openNavNew() {
    setNavEditing("new");
    setNavForm(emptyNavForm);
    setNavImageFile(null);
  }

  async function saveNav(e: FormEvent) {
    e.preventDefault();
    setNavSaving(true);
    const fd = new FormData();
    fd.append("name", navForm.name);
    fd.append("slug", navForm.slug);
    fd.append("description", navForm.description);
    fd.append("order", navForm.order);
    fd.append("is_active", String(navForm.is_active));
    if (navImageFile) fd.append("image", navImageFile);

    try {
      if (navEditing === "new") {
        await api.post("/api/admin/navbar-categories/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        await api.patch(`/api/admin/navbar-categories/${navEditing}/`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      setNavEditing(null);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setNavSaving(false);
    }
  }

  async function deleteNav(id: number) {
    if (!confirm("Delete this navbar category? All subcategories under it will also be deleted.")) return;
    try {
      await api.delete(`/api/admin/navbar-categories/${id}/`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  }

  function openSubEdit(cat: Category) {
    setSubEditing(cat.id);
    setSubForm({ name: cat.name, slug: cat.slug, description: cat.description, navbar_category: String(cat.navbar_category), order: String(cat.order), is_active: cat.is_active });
    setSubImageFile(null);
  }

  function openSubNew() {
    setSubEditing("new");
    setSubForm(emptySubForm);
    setSubImageFile(null);
  }

  async function saveSub(e: FormEvent) {
    e.preventDefault();
    setSubSaving(true);
    const fd = new FormData();
    fd.append("name", subForm.name);
    fd.append("slug", subForm.slug);
    fd.append("description", subForm.description);
    fd.append("navbar_category", subForm.navbar_category);
    fd.append("order", subForm.order);
    fd.append("is_active", String(subForm.is_active));
    if (subImageFile) fd.append("image", subImageFile);

    try {
      if (subEditing === "new") {
        await api.post("/api/admin/categories/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        await api.patch(`/api/admin/categories/${subEditing}/`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      setSubEditing(null);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubSaving(false);
    }
  }

  async function deleteSub(id: number) {
    if (!confirm("Delete this subcategory?")) return;
    try {
      await api.delete(`/api/admin/categories/${id}/`);
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
    <div className="space-y-8">
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
        <h1 className="text-2xl font-medium text-foreground">Categories</h1>
      </div>

      {/* ── Navbar Categories ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-foreground">
            Navbar Categories ({navCategories.length})
          </h2>
          <button
            onClick={openNavNew}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add Category
          </button>
        </div>

        {navEditing !== null && (
          <form
            onSubmit={saveNav}
            className="mb-4 space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4"
          >
            <p className="text-sm font-medium text-primary">
              {navEditing === "new" ? "New Navbar Category" : "Edit Navbar Category"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="Name" value={navForm.name} onChange={(e) => setNavForm({ ...navForm, name: e.target.value })} className="input" />
              <input required placeholder="Slug" value={navForm.slug} onChange={(e) => setNavForm({ ...navForm, slug: e.target.value })} className="input" />
            </div>
            <input placeholder="Description" value={navForm.description} onChange={(e) => setNavForm({ ...navForm, description: e.target.value })} className="input" />
            <div className="grid grid-cols-3 gap-3">
              <input
                type="number"
                placeholder="Order"
                value={navForm.order}
                onChange={(e) => setNavForm({ ...navForm, order: e.target.value })}
                className="input"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNavImageFile(e.target.files?.[0] ?? null)}
                className="input"
              />
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={navForm.is_active}
                  onChange={(e) =>
                    setNavForm({ ...navForm, is_active: e.target.checked })
                  }
                />{" "}
                Active
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={navSaving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {navSaving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setNavEditing(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto rounded-xl border border-card-border bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Slug
                </th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Subcategories
                </th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Order
                </th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {navCategories.map((cat) => (
                <tr key={cat.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium text-foreground">{cat.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{cat.slug}</td>
                  <td className="px-4 py-3 text-foreground">{cat.subcategory_count}</td>
                  <td className="px-4 py-3 text-foreground">{cat.order}</td>
                  <td className="px-4 py-3">
                    <ActiveBadge active={cat.is_active} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openNavEdit(cat)}
                        className="text-sm text-primary hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteNav(cat.id)}
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
      </section>

      {/* ── Subcategories ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-foreground">
            Subcategories ({categories.length})
          </h2>
          <button
            onClick={openSubNew}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Add Subcategory
          </button>
        </div>

        {subEditing !== null && (
          <form
            onSubmit={saveSub}
            className="mb-4 space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4"
          >
            <p className="text-sm font-semibold text-primary">
              {subEditing === "new" ? "New Subcategory" : "Edit Subcategory"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="Name" value={subForm.name} onChange={(e) => setSubForm({ ...subForm, name: e.target.value })} className="input" />
              <input required placeholder="Slug" value={subForm.slug} onChange={(e) => setSubForm({ ...subForm, slug: e.target.value })} className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select required value={subForm.navbar_category} onChange={(e) => setSubForm({ ...subForm, navbar_category: e.target.value })} className="input">
                <option value="">Parent category...</option>
                {navCategories.map((nc) => (
                  <option key={nc.id} value={nc.id}>{nc.name}</option>
                ))}
              </select>
              <input placeholder="Description" value={subForm.description} onChange={(e) => setSubForm({ ...subForm, description: e.target.value })} className="input" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input
                type="number"
                placeholder="Order"
                value={subForm.order}
                onChange={(e) => setSubForm({ ...subForm, order: e.target.value })}
                className="input"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSubImageFile(e.target.files?.[0] ?? null)}
                className="input"
              />
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={subForm.is_active}
                  onChange={(e) =>
                    setSubForm({ ...subForm, is_active: e.target.checked })
                  }
                />{" "}
                Active
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={subSaving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {subSaving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setSubEditing(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto rounded-xl border border-card-border bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Parent
                </th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Products
                </th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Order
                </th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium text-foreground">{cat.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {cat.navbar_category_name}
                  </td>
                  <td className="px-4 py-3 text-foreground">{cat.product_count}</td>
                  <td className="px-4 py-3 text-foreground">{cat.order}</td>
                  <td className="px-4 py-3">
                    <ActiveBadge active={cat.is_active} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openSubEdit(cat)}
                        className="text-sm text-primary hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteSub(cat.id)}
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
      </section>
    </div>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        active ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}
