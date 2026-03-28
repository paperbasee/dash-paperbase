"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Undo2, Pencil, Trash2, Plus } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClickableText } from "@/components/ui/clickable-text";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type {
  Product,
  ProductAttributeAdmin,
  ProductVariant,
  PaginatedResponse,
} from "@/types";

async function fetchAllProducts(): Promise<Product[]> {
  const out: Product[] = [];
  let page = 1;
  while (true) {
    const { data } = await api.get<PaginatedResponse<Product>>("admin/products/", {
      params: { page, page_size: 100 },
    });
    out.push(...data.results);
    if (!data.next) break;
    page += 1;
  }
  return out;
}

async function fetchAllAttributes(): Promise<ProductAttributeAdmin[]> {
  const out: ProductAttributeAdmin[] = [];
  let page = 1;
  while (true) {
    const { data } = await api.get<PaginatedResponse<ProductAttributeAdmin>>(
      "admin/product-attributes/",
      { params: { page, page_size: 100 } }
    );
    out.push(...data.results);
    if (!data.next) break;
    page += 1;
  }
  return out;
}

type VariantForm = {
  sku: string;
  price_override: string;
  is_active: boolean;
  /** one value public_id per attribute (or empty) */
  picks: Record<string, string>;
};

const emptyForm = (attrs: ProductAttributeAdmin[]): VariantForm => {
  const picks: Record<string, string> = {};
  for (const a of attrs) picks[a.public_id] = "";
  return {
    sku: "",
    price_override: "",
    is_active: true,
    picks,
  };
};

export default function VariantsPage() {
  const searchParams = useSearchParams();
  const productFromQuery =
    searchParams.get("product_public_id")?.trim() ||
    searchParams.get("product")?.trim() ||
    "";

  const [products, setProducts] = useState<Product[]>([]);
  const [attributes, setAttributes] = useState<ProductAttributeAdmin[]>([]);
  const [productId, setProductId] = useState<string>(productFromQuery);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<VariantForm | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((p) => p.public_id === productId) ?? null,
    [products, productId]
  );

  const loadMeta = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [prods, attrs] = await Promise.all([fetchAllProducts(), fetchAllAttributes()]);
      setProducts(prods);
      setAttributes(attrs);
    } catch {
      setError("Could not load products or attributes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (productFromQuery) setProductId(productFromQuery);
  }, [productFromQuery]);

  const loadVariants = useCallback(async () => {
    if (!productId) {
      setVariants([]);
      return;
    }
    setVariantsLoading(true);
    try {
      const acc: ProductVariant[] = [];
      let page = 1;
      while (true) {
        const { data } = await api.get<PaginatedResponse<ProductVariant>>(
          "admin/product-variants/",
          { params: { product_public_id: productId, page, page_size: 100 } }
        );
        acc.push(...data.results);
        if (!data.next) break;
        page += 1;
      }
      setVariants(acc);
    } catch {
      setVariants([]);
      setError("Could not load variants for this product.");
    } finally {
      setVariantsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadVariants();
  }, [loadVariants]);

  function openNew() {
    setEditing("new");
    setForm(emptyForm(attributes));
  }

  function openEdit(v: ProductVariant) {
    const picks: Record<string, string> = {};
    for (const a of attributes) picks[a.public_id] = "";
    for (const valPublicId of v.attribute_value_public_ids) {
      for (const a of attributes) {
        const match = a.values.find((x) => x.public_id === valPublicId);
        if (match) {
          picks[a.public_id] = valPublicId;
          break;
        }
      }
    }
    setEditing(v.public_id);
    setForm({
      sku: v.sku,
      price_override: v.price_override ?? "",
      is_active: v.is_active,
      picks,
    });
  }

  function closePanel() {
    setEditing(null);
    setForm(null);
  }

  async function saveVariant(e: FormEvent) {
    e.preventDefault();
    if (!productId || !form) return;
    setSaving(true);
    setError("");
    const attribute_value_public_ids: string[] = [];
    for (const a of attributes) {
      const raw = form.picks[a.public_id];
      if (raw) attribute_value_public_ids.push(raw);
    }
    const payload: Record<string, unknown> = {
      product_public_id: productId,
      is_active: form.is_active,
      attribute_value_public_ids,
    };
    const sku = form.sku.trim();
    if (sku) payload.sku = sku;
    const po = form.price_override.trim();
    if (po) payload.price_override = po;
    else payload.price_override = null;

    try {
      if (editing === "new") {
        await api.post("admin/product-variants/", payload);
      } else if (typeof editing === "string") {
        await api.patch(`admin/product-variants/${editing}/`, payload);
      }
      closePanel();
      await loadVariants();
      await loadMeta();
    } catch (err: unknown) {
      const d = err as { response?: { data?: Record<string, unknown> } };
      const data = d.response?.data;
      const msgFromData = (x: unknown): string => {
        if (typeof x === "string") return x;
        if (Array.isArray(x)) return x.map((v) => (typeof v === "string" ? v : JSON.stringify(v))).join(" ");
        if (x && typeof x === "object") {
          const obj = x as Record<string, unknown>;
          if (typeof obj.detail === "string") return obj.detail;
          const parts: string[] = [];
          for (const [k, v] of Object.entries(obj)) {
            if (v == null) continue;
            const vv = Array.isArray(v) ? v : [v];
            const joined = vv
              .map((t) => (typeof t === "string" ? t : JSON.stringify(t)))
              .join(" ");
            parts.push(`${k}: ${joined}`);
          }
          if (parts.length) return parts.join(" | ");
        }
        return "Save failed";
      };
      setError(msgFromData(data));
    } finally {
      setSaving(false);
    }
  }

  async function deleteVariant(v: ProductVariant) {
    if (!confirm(`Delete variant SKU "${v.sku}"?`)) return;
    try {
      await api.delete(`admin/product-variants/${v.public_id}/`);
      await loadVariants();
      await loadMeta();
    } catch {
      setError("Delete failed.");
    }
  }

  if (loading && products.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">Loading catalog…</div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">Variants</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            SKUs and options per product. Define option types under{" "}
            <ClickableText href="/product-attributes" className="underline-offset-2">
              Catalog → Attributes
            </ClickableText>
            .
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/products">
            <Undo2 className="mr-2 size-4" />
            Back to products
          </Link>
        </Button>
      </header>

      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Product</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select
            className="max-w-xl text-sm"
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              closePanel();
            }}
          >
            <option value="">Select a product…</option>
            {products.map((p) => (
              <option key={p.public_id} value={p.public_id}>
                {p.name}
              </option>
            ))}
          </Select>
          {selectedProduct ? (
            <p className="text-xs text-muted-foreground">
              Base price:{" "}
              <span className="font-numbers text-foreground">{selectedProduct.price}</span>
              {selectedProduct.variant_count != null ? (
                <>
                  {" "}
                  · {selectedProduct.variant_count} variant
                  {selectedProduct.variant_count === 1 ? "" : "s"}
                </>
              ) : null}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {productId ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-medium text-foreground">SKUs</h2>
            <Button type="button" size="sm" onClick={openNew} disabled={editing !== null}>
              <Plus className="mr-2 size-4" />
              Add variant
            </Button>
          </div>

          {editing !== null && form ? (
            <Card className="border-primary/30 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">
                  {editing === "new" ? "New variant" : "Edit variant"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={saveVariant} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">SKU</span>
                      <Input
                        className="w-full text-sm"
                        value={form.sku}
                        onChange={(e) => setForm({ ...form, sku: e.target.value })}
                        placeholder="Leave empty to auto-generate"
                      />
                    </label>
                    <label className="block space-y-1 sm:col-span-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Price override (optional)
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        className="max-w-xs font-numbers text-sm"
                        value={form.price_override}
                        onChange={(e) => setForm({ ...form, price_override: e.target.value })}
                        placeholder="Uses product base price if empty"
                      />
                    </label>
                  </div>

                  {attributes.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Options (at most one per type)
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {attributes.map((a) => (
                          <label key={a.public_id} className="block space-y-1">
                            <span className="text-xs text-muted-foreground">{a.name}</span>
                            <Select
                              className="text-sm"
                              value={form.picks[a.public_id] ?? ""}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  picks: { ...form.picks, [a.public_id]: e.target.value },
                                })
                              }
                            >
                              <option value="">— None —</option>
                              {a.values.map((v) => (
                                <option key={v.public_id} value={v.public_id}>
                                  {v.value}
                                </option>
                              ))}
                            </Select>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No attributes yet. Add some under{" "}
                      <ClickableText href="/product-attributes" className="underline-offset-2">
                        Attributes
                      </ClickableText>{" "}
                      to tag variants (e.g. Color, Size).
                    </p>
                  )}

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="form-checkbox"
                    />
                    <span className="text-sm">Active</span>
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving…" : "Save"}
                    </Button>
                    <Button type="button" variant="outline" onClick={closePanel}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {variantsLoading ? (
            <p className="text-sm text-muted-foreground">Loading variants…</p>
          ) : variants.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No variants yet. Add a SKU to sell this product with options.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">SKU</th>
                    <th className="px-4 py-3 font-medium">Options</th>
                    <th className="px-4 py-3 font-medium">Price</th>
                    <th className="px-4 py-3 font-medium">Stock</th>
                    <th className="px-4 py-3 font-medium">Active</th>
                    <th className="px-4 py-3 font-medium w-28"> </th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v) => (
                    <tr key={v.public_id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium text-foreground">{v.sku}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {v.option_labels?.length
                          ? v.option_labels.join(" · ")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 font-numbers text-foreground">
                        {v.price_override ?? selectedProduct?.price ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-numbers">{v.available_quantity}</td>
                      <td className="px-4 py-3">{v.is_active ? "Yes" : "No"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Edit"
                            disabled={editing !== null}
                            onClick={() => openEdit(v)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Delete"
                            disabled={editing !== null}
                            onClick={() => deleteVariant(v)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Choose a product to manage its variants.</p>
      )}
    </div>
  );
}
