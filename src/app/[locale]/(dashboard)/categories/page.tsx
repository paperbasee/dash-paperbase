"use client";

import { Fragment, useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ChevronDown, ChevronRight, Undo2 } from "lucide-react";
import api from "@/lib/api";
import { ClickableText } from "@/components/ui/clickable-text";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { AdminCategoryTreeNode } from "@/types";
import {
  collectDescendantPublicIds,
  findCategoryNode,
  flattenCategoryOptions,
} from "@/lib/category-tree";

type FormMode = "closed" | "new_root" | "new_child" | "edit";

type CatForm = {
  name: string;
  description: string;
  parent: string;
  order: string;
  is_active: boolean;
};

const emptyForm: CatForm = {
  name: "",
  description: "",
  parent: "",
  order: "0",
  is_active: true,
};

function CategoryTreeRows({
  nodes,
  depth,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onAddChild,
  labels,
}: {
  nodes: AdminCategoryTreeNode[];
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (n: AdminCategoryTreeNode) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  labels: {
    addChild: string;
    delete: string;
    active: string;
    inactive: string;
  };
}) {
  return (
    <>
      {nodes.map((node) => {
        const children = node.children ?? [];
        const hasKids = children.length > 0;
        const isOpen = expanded.has(node.public_id);
        return (
          <Fragment key={node.public_id}>
            <tr className="hover:bg-muted/40">
              <td className="px-4 py-3">
                <div
                  className="flex items-center gap-1"
                  style={{ paddingLeft: depth * 16 }}
                >
                  {hasKids ? (
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      className="rounded p-0.5 text-muted-foreground hover:bg-muted"
                      onClick={() => onToggle(node.public_id)}
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  ) : (
                    <span className="inline-block w-5 shrink-0" />
                  )}
                  <ClickableText
                    onClick={() => onEdit(node)}
                    className="font-medium text-foreground"
                  >
                    {node.name}
                  </ClickableText>
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{node.slug}</td>
              <td className="px-4 py-3 text-foreground">{node.child_count}</td>
              <td className="px-4 py-3 text-foreground">{node.product_count}</td>
              <td className="px-4 py-3 text-foreground">{node.order}</td>
              <td className="px-4 py-3">
                <ActiveBadge active={node.is_active} activeLabel={labels.active} inactiveLabel={labels.inactive} />
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <ClickableText
                    onClick={() => onAddChild(node.public_id)}
                    className="text-sm"
                  >
                    {labels.addChild}
                  </ClickableText>
                  <ClickableText
                    variant="destructive"
                    onClick={() => onDelete(node.public_id)}
                    className="text-sm"
                  >
                    {labels.delete}
                  </ClickableText>
                </div>
              </td>
            </tr>
            {hasKids && isOpen ? (
              <CategoryTreeRows
                nodes={children}
                depth={depth + 1}
                expanded={expanded}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddChild={onAddChild}
                labels={labels}
              />
            ) : null}
          </Fragment>
        );
      })}
    </>
  );
}

export default function CategoriesPage() {
  const router = useRouter();
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const treeLabels = {
    addChild: tPages("categoriesAddChild"),
    delete: tCommon("delete"),
    active: tCommon("active"),
    inactive: tCommon("inactive"),
  };
  const [tree, setTree] = useState<AdminCategoryTreeNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<FormMode>("closed");
  const [editingPublicId, setEditingPublicId] = useState<string | null>(null);
  const [form, setForm] = useState<CatForm>(emptyForm);
  /** Slug from API when editing (read-only; backend regenerates from name on save). */
  const [editingSlugPreview, setEditingSlugPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchTree = useCallback(() => {
    setLoading(true);
    api
      .get<AdminCategoryTreeNode[]>("admin/categories/?tree=1")
      .then((res) => {
        const d = res.data;
        setTree(Array.isArray(d) ? d : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  function toggleExpand(publicId: string) {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(publicId)) {
        n.delete(publicId);
      } else {
        n.add(publicId);
      }
      return n;
    });
  }

  function openNewRoot() {
    setMode("new_root");
    setEditingPublicId(null);
    setEditingSlugPreview(null);
    setForm({ ...emptyForm, parent: "" });
    setImageFile(null);
  }

  function openNewChild(parentPublicId: string) {
    setMode("new_child");
    setEditingPublicId(null);
    setEditingSlugPreview(null);
    setForm({ ...emptyForm, parent: parentPublicId });
    setImageFile(null);
  }

  function openEdit(node: AdminCategoryTreeNode) {
    setMode("edit");
    setEditingPublicId(node.public_id);
    setEditingSlugPreview(node.slug);
    setForm({
      name: node.name,
      description: node.description,
      parent: node.parent ?? "",
      order: String(node.order),
      is_active: node.is_active,
    });
    setImageFile(null);
  }

  const parentOptions = (() => {
    const flat = flattenCategoryOptions(tree);
    if (mode === "edit" && editingPublicId) {
      const node = findCategoryNode(tree, editingPublicId);
      if (node) {
        const ban = collectDescendantPublicIds(node);
        return flat.filter((o) => !ban.has(o.value));
      }
    }
    return flat;
  })();

  async function saveCategory(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("description", form.description);
    fd.append("order", form.order);
    fd.append("is_active", String(form.is_active));
    if (form.parent) {
      fd.append("parent", form.parent);
    } else if (mode === "edit") {
      fd.append("parent", "");
    }
    if (imageFile) {
      fd.append("image", imageFile);
    }
    try {
      if (mode === "edit" && editingPublicId) {
        await api.patch(`admin/categories/${editingPublicId}/`, fd);
      } else {
        await api.post("admin/categories/", fd);
      }
      setMode("closed");
      setEditingSlugPreview(null);
      fetchTree();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(publicId: string) {
    if (!confirm(tPages("categoriesConfirmDelete"))) {
      return;
    }
    try {
      await api.delete(`admin/categories/${publicId}/`);
      fetchTree();
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

  const formTitle =
    mode === "edit"
      ? tPages("categoriesEditCategory")
      : mode === "new_child"
        ? tPages("categoriesNewSubcategory")
        : mode === "new_root"
          ? tPages("categoriesNewRoot")
          : "";

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-muted/80 px-1 py-1">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={tPages("categoriesGoBackAria")}
            className="flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <Undo2 className="h-4 w-4" />
          </button>
        </div>
        <h1 className="text-2xl font-medium text-foreground">{tPages("categoriesTitle")}</h1>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={openNewRoot}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {tPages("categoriesAddRoot")}
        </button>
        {mode !== "closed" ? (
          <button
            type="button"
            onClick={() => {
              setMode("closed");
              setEditingSlugPreview(null);
            }}
            className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
          >
            {tPages("categoriesCancelForm")}
          </button>
        ) : null}
      </div>

      {mode !== "closed" ? (
        <form
          onSubmit={saveCategory}
          className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4"
        >
          <p className="text-sm font-medium text-primary">{formTitle}</p>
          <div className="space-y-1">
            <Input
              required
              placeholder={tPages("categoriesPlaceholderName")}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="max-w-xl"
            />
            {mode === "edit" && editingSlugPreview ? (
              <p className="text-xs text-muted-foreground">
                {tPages("categoriesSlugEditHint", { slug: editingSlugPreview })}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {tPages("categoriesSlugAutoHint")}
              </p>
            )}
          </div>
          <Input
            placeholder={tPages("categoriesPlaceholderDescription")}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              value={form.parent}
              onChange={(e) => setForm({ ...form, parent: e.target.value })}
              disabled={mode === "new_child"}
            >
              <option value="">{tPages("categoriesParentRoot")}</option>
              {parentOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Input
              type="number"
              placeholder={tPages("categoriesPlaceholderOrder")}
              value={form.order}
              onChange={(e) => setForm({ ...form, order: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="form-file-input"
            />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
                className="form-checkbox"
              />{" "}
              {tPages("categoriesActiveLabel")}
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? tCommon("saving") : tCommon("save")}
            </button>
          </div>
        </form>
      ) : null}

      <section>
        <h2 className="mb-4 text-lg font-medium text-foreground">
          {tPages("categoriesTreeHeading", {
            count: flattenCategoryOptions(tree).length,
          })}
        </h2>
        <div className="overflow-x-auto rounded-xl border border-dashed border-card-border bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="th">{tPages("categoriesColName")}</th>
                <th className="th">{tPages("categoriesColSlug")}</th>
                <th className="th">{tPages("categoriesColChildren")}</th>
                <th className="th">{tPages("categoriesColProducts")}</th>
                <th className="th">{tPages("categoriesColOrder")}</th>
                <th className="th">{tPages("categoriesColStatus")}</th>
                <th className="th">{tPages("categoriesColActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {tree.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    {tPages("categoriesEmpty")}
                  </td>
                </tr>
              ) : (
                <CategoryTreeRows
                  nodes={tree}
                  depth={0}
                  expanded={expanded}
                  onToggle={toggleExpand}
                  onEdit={openEdit}
                  onDelete={deleteCategory}
                  onAddChild={openNewChild}
                  labels={treeLabels}
                />
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ActiveBadge({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        active
          ? "bg-emerald-500/20 text-emerald-400"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}
