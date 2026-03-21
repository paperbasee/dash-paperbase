"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import api from "@/lib/api";
import { ClickableText } from "@/components/ui/clickable-text";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ParentCategory, Category, PaginatedResponse } from "@/types";

type ParentForm = { name: string; slug: string; description: string; order: string; is_active: boolean };
type ChildForm = { name: string; slug: string; description: string; parent: string; order: string; is_active: boolean };

const emptyParentForm: ParentForm = { name: "", slug: "", description: "", order: "0", is_active: true };
const emptyChildForm: ChildForm = { name: "", slug: "", description: "", parent: "", order: "0", is_active: true };

export default function CategoriesPage() {
  const router = useRouter();
  const [parentCategories, setParentCategories] = useState<ParentCategory[]>([]);
  const [childCategories, setChildCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [parentEditing, setParentEditing] = useState<string | "new" | null>(null);
  const [parentForm, setParentForm] = useState<ParentForm>(emptyParentForm);
  const [parentImageFile, setParentImageFile] = useState<File | null>(null);
  const [parentSaving, setParentSaving] = useState(false);

  const [childEditing, setChildEditing] = useState<string | "new" | null>(null);
  const [childForm, setChildForm] = useState<ChildForm>(emptyChildForm);
  const [childImageFile, setChildImageFile] = useState<File | null>(null);
  const [childSaving, setChildSaving] = useState(false);

  function fetchData() {
    setLoading(true);
    Promise.all([
      api.get<PaginatedResponse<ParentCategory> | ParentCategory[]>("admin/parent-categories/"),
      api.get<PaginatedResponse<Category> | Category[]>("admin/categories/"),
    ])
      .then(([parentRes, catRes]) => {
        const parentData = parentRes.data;
        const catData = catRes.data;
        setParentCategories(Array.isArray(parentData) ? parentData : parentData.results);
        setChildCategories(Array.isArray(catData) ? catData : catData.results);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, []);

  function openParentEdit(cat: ParentCategory) {
    setParentEditing(cat.public_id);
    setParentForm({ name: cat.name, slug: cat.slug, description: cat.description, order: String(cat.order), is_active: cat.is_active });
    setParentImageFile(null);
  }

  function openParentNew() {
    setParentEditing("new");
    setParentForm(emptyParentForm);
    setParentImageFile(null);
  }

  async function saveParent(e: FormEvent) {
    e.preventDefault();
    setParentSaving(true);
    const fd = new FormData();
    fd.append("name", parentForm.name);
    fd.append("slug", parentForm.slug);
    fd.append("description", parentForm.description);
    fd.append("order", parentForm.order);
    fd.append("is_active", String(parentForm.is_active));
    if (parentImageFile) fd.append("image", parentImageFile);

    try {
      if (parentEditing === "new") {
        await api.post("admin/parent-categories/", fd);
      } else {
        await api.patch(`admin/parent-categories/${parentEditing}/`, fd);
      }
      setParentEditing(null);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setParentSaving(false);
    }
  }

  async function deleteParent(publicId: string) {
    if (!confirm("Delete this parent category? All child categories under it will also be deleted.")) return;
    try {
      await api.delete(`admin/parent-categories/${publicId}/`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  }

  function openChildEdit(cat: Category) {
    setChildEditing(cat.public_id);
    setChildForm({ name: cat.name, slug: cat.slug, description: cat.description, parent: String(cat.parent ?? ""), order: String(cat.order), is_active: cat.is_active });
    setChildImageFile(null);
  }

  function openChildNew() {
    setChildEditing("new");
    setChildForm(emptyChildForm);
    setChildImageFile(null);
  }

  async function saveChild(e: FormEvent) {
    e.preventDefault();
    setChildSaving(true);
    const fd = new FormData();
    fd.append("name", childForm.name);
    fd.append("slug", childForm.slug);
    fd.append("description", childForm.description);
    if (childForm.parent) fd.append("parent", childForm.parent);
    fd.append("order", childForm.order);
    fd.append("is_active", String(childForm.is_active));
    if (childImageFile) fd.append("image", childImageFile);

    try {
      if (childEditing === "new") {
        await api.post("admin/categories/", fd);
      } else {
        await api.patch(`admin/categories/${childEditing}/`, fd);
      }
      setChildEditing(null);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setChildSaving(false);
    }
  }

  async function deleteChild(publicId: string) {
    if (!confirm("Delete this child category?")) return;
    try {
      await api.delete(`admin/categories/${publicId}/`);
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

      {/* ── Parent Categories (top-level) ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-foreground">
            Parent Categories ({parentCategories.length})
          </h2>
          <button
            onClick={openParentNew}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add Parent Category
          </button>
        </div>

        {parentEditing !== null && (
          <form
            onSubmit={saveParent}
            className="mb-4 space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4"
          >
            <p className="text-sm font-medium text-primary">
              {parentEditing === "new" ? "New Parent Category" : "Edit Parent Category"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input required placeholder="Name" value={parentForm.name} onChange={(e) => setParentForm({ ...parentForm, name: e.target.value })} />
              <Input required placeholder="Slug" value={parentForm.slug} onChange={(e) => setParentForm({ ...parentForm, slug: e.target.value })} />
            </div>
            <Input placeholder="Description" value={parentForm.description} onChange={(e) => setParentForm({ ...parentForm, description: e.target.value })} />
            <div className="grid grid-cols-3 gap-3">
              <Input
                type="number"
                placeholder="Order"
                value={parentForm.order}
                onChange={(e) => setParentForm({ ...parentForm, order: e.target.value })}
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setParentImageFile(e.target.files?.[0] ?? null)}
                className="form-file-input"
              />
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={parentForm.is_active}
                  onChange={(e) =>
                    setParentForm({ ...parentForm, is_active: e.target.checked })
                  }
                  className="form-checkbox"
                />{" "}
                Active
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={parentSaving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {parentSaving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setParentEditing(null)}
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
                  Name
                </th>
                <th className="th">
                  Slug
                </th>
                <th className="th">
                  Children
                </th>
                <th className="th">
                  Order
                </th>
                <th className="th">
                  Status
                </th>
                <th className="th">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {parentCategories.map((cat) => (
                <tr key={cat.public_id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium text-foreground">{cat.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{cat.slug}</td>
                  <td className="px-4 py-3 text-foreground">{cat.child_count}</td>
                  <td className="px-4 py-3 text-foreground">{cat.order}</td>
                  <td className="px-4 py-3">
                    <ActiveBadge active={cat.is_active} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <ClickableText
                        onClick={() => openParentEdit(cat)}
                        className="text-sm"
                      >
                        Edit
                      </ClickableText>
                      <ClickableText
                        variant="destructive"
                        onClick={() => deleteParent(cat.public_id)}
                        className="text-sm"
                      >
                        Delete
                      </ClickableText>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Child Categories (nested) ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-foreground">
            Child Categories ({childCategories.length})
          </h2>
          <button
            onClick={openChildNew}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Add Child Category
          </button>
        </div>

        {childEditing !== null && (
          <form
            onSubmit={saveChild}
            className="mb-4 space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4"
          >
            <p className="text-sm font-semibold text-primary">
              {childEditing === "new" ? "New Child Category" : "Edit Child Category"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input required placeholder="Name" value={childForm.name} onChange={(e) => setChildForm({ ...childForm, name: e.target.value })} />
              <Input required placeholder="Slug" value={childForm.slug} onChange={(e) => setChildForm({ ...childForm, slug: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select required value={childForm.parent} onChange={(e) => setChildForm({ ...childForm, parent: e.target.value })}>
                <option value="">Parent category...</option>
                {parentCategories.map((pc) => (
                  <option key={pc.public_id} value={pc.public_id}>{pc.name}</option>
                ))}
              </Select>
              <Input placeholder="Description" value={childForm.description} onChange={(e) => setChildForm({ ...childForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input
                type="number"
                placeholder="Order"
                value={childForm.order}
                onChange={(e) => setChildForm({ ...childForm, order: e.target.value })}
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setChildImageFile(e.target.files?.[0] ?? null)}
                className="form-file-input"
              />
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={childForm.is_active}
                  onChange={(e) =>
                    setChildForm({ ...childForm, is_active: e.target.checked })
                  }
                  className="form-checkbox"
                />{" "}
                Active
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={childSaving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {childSaving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setChildEditing(null)}
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
                  Name
                </th>
                <th className="th">
                  Parent
                </th>
                <th className="th">
                  Products
                </th>
                <th className="th">
                  Order
                </th>
                <th className="th">
                  Status
                </th>
                <th className="th">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {childCategories.map((cat) => (
                <tr key={cat.public_id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium text-foreground">{cat.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {cat.parent_name}
                  </td>
                  <td className="px-4 py-3 text-foreground">{cat.product_count}</td>
                  <td className="px-4 py-3 text-foreground">{cat.order}</td>
                  <td className="px-4 py-3">
                    <ActiveBadge active={cat.is_active} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <ClickableText
                        onClick={() => openChildEdit(cat)}
                        className="text-sm"
                      >
                        Edit
                      </ClickableText>
                      <ClickableText
                        variant="destructive"
                        onClick={() => deleteChild(cat.public_id)}
                        className="text-sm"
                      >
                        Delete
                      </ClickableText>
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
