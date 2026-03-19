"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Undo2, Plus, Pencil, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ProductAttributeAdmin,
  ProductAttributeValueAdmin,
  PaginatedResponse,
} from "@/types";

type AttrForm = { name: string; slug: string; order: string };
type ValueForm = { value: string; order: string };

const emptyAttr: AttrForm = { name: "", slug: "", order: "0" };
const emptyValue: ValueForm = { value: "", order: "0" };

export default function ProductAttributesPage() {
  const [attributes, setAttributes] = useState<ProductAttributeAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [attrEditing, setAttrEditing] = useState<number | "new" | null>(null);
  const [attrForm, setAttrForm] = useState<AttrForm>(emptyAttr);
  const [attrSaving, setAttrSaving] = useState(false);

  const [valueEditing, setValueEditing] = useState<
    { attributeId: number; id: number | "new" } | null
  >(null);
  const [valueForm, setValueForm] = useState<ValueForm>(emptyValue);
  const [valueSaving, setValueSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const acc: ProductAttributeAdmin[] = [];
      let page = 1;
      while (true) {
        const { data } = await api.get<PaginatedResponse<ProductAttributeAdmin>>(
          "admin/product-attributes/",
          { params: { page, page_size: 100 } }
        );
        acc.push(...data.results);
        if (!data.next) break;
        page += 1;
      }
      setAttributes(acc);
    } catch {
      setError("Could not load attributes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openAttrNew() {
    setAttrEditing("new");
    setAttrForm(emptyAttr);
  }

  function openAttrEdit(a: ProductAttributeAdmin) {
    setAttrEditing(a.id);
    setAttrForm({
      name: a.name,
      slug: a.slug,
      order: String(a.order),
    });
  }

  async function saveAttr(e: FormEvent) {
    e.preventDefault();
    setAttrSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: attrForm.name.trim(),
        order: parseInt(attrForm.order, 10) || 0,
      };
      const s = attrForm.slug.trim();
      if (s) payload.slug = s;
      if (attrEditing === "new") {
        await api.post("admin/product-attributes/", payload);
      } else if (typeof attrEditing === "number") {
        await api.patch(`admin/product-attributes/${attrEditing}/`, payload);
      }
      setAttrEditing(null);
      await fetchData();
    } catch (err: unknown) {
      const d = err as { response?: { data?: unknown } };
      setError(JSON.stringify(d.response?.data ?? "Save failed"));
    } finally {
      setAttrSaving(false);
    }
  }

  async function deleteAttr(id: number, name: string) {
    if (!confirm(`Delete attribute "${name}" and all its values?`)) return;
    try {
      await api.delete(`admin/product-attributes/${id}/`);
      await fetchData();
    } catch {
      setError("Delete failed (attribute may be in use).");
    }
  }

  function openValueNew(attributeId: number) {
    setValueEditing({ attributeId, id: "new" });
    setValueForm(emptyValue);
  }

  function openValueEdit(attributeId: number, v: ProductAttributeValueAdmin) {
    setValueEditing({ attributeId, id: v.id });
    setValueForm({ value: v.value, order: String(v.order) });
  }

  async function saveValue(e: FormEvent) {
    e.preventDefault();
    if (!valueEditing) return;
    setValueSaving(true);
    try {
      const payload = {
        attribute: valueEditing.attributeId,
        value: valueForm.value.trim(),
        order: parseInt(valueForm.order, 10) || 0,
      };
      if (valueEditing.id === "new") {
        await api.post("admin/product-attribute-values/", payload);
      } else {
        await api.patch(`admin/product-attribute-values/${valueEditing.id}/`, payload);
      }
      setValueEditing(null);
      await fetchData();
    } catch (err: unknown) {
      const d = err as { response?: { data?: unknown } };
      setError(JSON.stringify(d.response?.data ?? "Save failed"));
    } finally {
      setValueSaving(false);
    }
  }

  async function deleteValue(id: number, label: string) {
    if (!confirm(`Delete value "${label}"?`)) return;
    try {
      await api.delete(`admin/product-attribute-values/${id}/`);
      await fetchData();
    } catch {
      setError("Delete failed (value may be linked to variants).");
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">Attributes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Option types and values used on variants (e.g. Color → Red, Blue). Then assign them on{" "}
            <Link href="/variants" className="text-primary underline-offset-2 hover:underline">
              Variants
            </Link>
            .
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/variants">
            <Undo2 className="mr-2 size-4" />
            Variants
          </Link>
        </Button>
      </header>

      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={openAttrNew} disabled={attrEditing !== null}>
          <Plus className="mr-2 size-4" />
          New attribute
        </Button>
      </div>

      {attrEditing !== null ? (
        <Card className="border-primary/30 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">
              {attrEditing === "new" ? "New attribute" : "Edit attribute"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveAttr} className="grid gap-3 sm:max-w-md">
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Name *</span>
                <input
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={attrForm.name}
                  onChange={(e) => setAttrForm({ ...attrForm, name: e.target.value })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Slug (optional)</span>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={attrForm.slug}
                  onChange={(e) => setAttrForm({ ...attrForm, slug: e.target.value })}
                  placeholder="Auto from name if empty"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Order</span>
                <input
                  type="number"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-numbers"
                  value={attrForm.order}
                  onChange={(e) => setAttrForm({ ...attrForm, order: e.target.value })}
                />
              </label>
              <div className="flex gap-2">
                <Button type="submit" disabled={attrSaving}>
                  {attrSaving ? "Saving…" : "Save"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setAttrEditing(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        {attributes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No attributes yet. Create one (e.g. &quot;Color&quot;, &quot;Size&quot;), then add values.
          </p>
        ) : (
          attributes.map((a) => (
            <Card key={a.id} className="shadow-sm">
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-2">
                <div>
                  <CardTitle className="text-base">{a.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    slug: <code className="rounded bg-muted px-1">{a.slug}</code> · order {a.order}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={attrEditing !== null}
                    onClick={() => openAttrEdit(a)}
                  >
                    <Pencil className="mr-1 size-3.5" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={attrEditing !== null}
                    onClick={() => deleteAttr(a.id, a.name)}
                  >
                    <Trash2 className="mr-1 size-3.5 text-destructive" />
                    Delete
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Values
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={valueEditing !== null || attrEditing !== null}
                    onClick={() => openValueNew(a.id)}
                  >
                    <Plus className="mr-1 size-3.5" />
                    Add value
                  </Button>
                </div>

                {valueEditing?.attributeId === a.id ? (
                  <form
                    onSubmit={saveValue}
                    className="rounded-lg border border-border bg-muted/20 p-3 space-y-2"
                  >
                    <p className="text-sm font-medium">
                      {valueEditing.id === "new" ? "New value" : "Edit value"}
                    </p>
                    <input
                      required
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={valueForm.value}
                      onChange={(e) => setValueForm({ ...valueForm, value: e.target.value })}
                      placeholder="e.g. Red, M"
                    />
                    <input
                      type="number"
                      className="w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm font-numbers"
                      value={valueForm.order}
                      onChange={(e) => setValueForm({ ...valueForm, order: e.target.value })}
                      title="Order"
                    />
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={valueSaving}>
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setValueEditing(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : null}

                {a.values.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No values yet.</p>
                ) : (
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {a.values.map((v) => (
                      <li
                        key={v.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                      >
                        <span>
                          {v.value}{" "}
                          <span className="text-xs text-muted-foreground">(order {v.order})</span>
                        </span>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Edit value"
                            disabled={valueEditing !== null || attrEditing !== null}
                            onClick={() => openValueEdit(a.id, v)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Delete value"
                            disabled={valueEditing !== null || attrEditing !== null}
                            onClick={() => deleteValue(v.id, v.value)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
