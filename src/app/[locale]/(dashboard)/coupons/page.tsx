"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "@/i18n/navigation";
import { Undo2, Plus } from "lucide-react";
import api from "@/lib/api";
import { ClickableText } from "@/components/ui/clickable-text";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  BulkDiscount,
  Category,
  Coupon,
  PaginatedResponse,
  ParentCategory,
  Product,
} from "@/types";

type Tab = "codes" | "bulk";

type CouponForm = {
  code: string;
  discount_type: string;
  discount_value: string;
  min_order_value: string;
  max_uses: string;
  per_identity_max_uses: string;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
};

const emptyCouponForm: CouponForm = {
  code: "",
  discount_type: "percentage",
  discount_value: "",
  min_order_value: "",
  max_uses: "",
  per_identity_max_uses: "",
  valid_from: "",
  valid_until: "",
  is_active: true,
};

type BulkDiscountForm = {
  target_type: "category" | "subcategory" | "product";
  category_public_id: string;
  product_public_id: string;
  discount_type: "percentage" | "fixed";
  discount_value: string;
  priority: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

const emptyBulkForm: BulkDiscountForm = {
  target_type: "category",
  category_public_id: "",
  product_public_id: "",
  discount_type: "percentage",
  discount_value: "",
  priority: "0",
  start_date: "",
  end_date: "",
  is_active: true,
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatBulkApiError(data: unknown): string {
  if (data == null) return "Could not save bulk discount.";
  if (typeof data === "string") {
    const t = data.trimStart().toLowerCase();
    if (t.startsWith("<!doctype") || t.startsWith("<html")) {
      return "Server error while saving. If this persists, check the API logs.";
    }
    return data;
  }
  if (typeof data !== "object") return "Could not save bulk discount.";
  const o = data as Record<string, unknown>;
  if (typeof o.detail === "string") return o.detail;
  if (Array.isArray(o.detail) && typeof o.detail[0] === "string") return o.detail[0];
  for (const [key, val] of Object.entries(o)) {
    if (key === "detail") continue;
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === "string") {
      return val[0];
    }
    if (typeof val === "string") return val;
  }
  return "Could not save bulk discount.";
}

export default function CouponsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("codes");

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [couponEditing, setCouponEditing] = useState<string | "new" | null>(null);
  const [couponForm, setCouponForm] = useState<CouponForm>(emptyCouponForm);
  const [savingCoupon, setSavingCoupon] = useState(false);

  const [rules, setRules] = useState<BulkDiscount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [parentCategories, setParentCategories] = useState<ParentCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingBulk, setLoadingBulk] = useState(false);
  const [bulkEditing, setBulkEditing] = useState<string | "new" | null>(null);
  const [bulkForm, setBulkForm] = useState<BulkDiscountForm>(emptyBulkForm);
  const [savingBulk, setSavingBulk] = useState(false);
  const [bulkSaveError, setBulkSaveError] = useState("");

  const fetchCoupons = useCallback(() => {
    setLoadingCoupons(true);
    api
      .get<PaginatedResponse<Coupon> | Coupon[]>("admin/coupons/")
      .then((res) => {
        const data = res.data;
        setCoupons(Array.isArray(data) ? data : data.results);
      })
      .catch(console.error)
      .finally(() => setLoadingCoupons(false));
  }, []);

  const fetchBulkData = useCallback(() => {
    setLoadingBulk(true);
    Promise.all([
      api.get<PaginatedResponse<BulkDiscount> | BulkDiscount[]>("admin/bulk-discounts/"),
      api.get<PaginatedResponse<Category> | Category[]>("admin/categories/"),
      api.get<PaginatedResponse<ParentCategory> | ParentCategory[]>(
        "admin/parent-categories/"
      ),
      api.get<PaginatedResponse<Product> | Product[]>("admin/products/", {
        params: { status: "active", page_size: 200 },
      }),
    ])
      .then(([rulesRes, catRes, parentRes, prodRes]) => {
        setRules(Array.isArray(rulesRes.data) ? rulesRes.data : rulesRes.data.results);
        setCategories(Array.isArray(catRes.data) ? catRes.data : catRes.data.results);
        setParentCategories(
          Array.isArray(parentRes.data) ? parentRes.data : parentRes.data.results
        );
        setProducts(Array.isArray(prodRes.data) ? prodRes.data : prodRes.data.results);
      })
      .catch(console.error)
      .finally(() => setLoadingBulk(false));
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  useEffect(() => {
    if (tab === "bulk") {
      fetchBulkData();
    }
  }, [tab, fetchBulkData]);

  function openNewCoupon() {
    setBulkEditing(null);
    setCouponEditing("new");
    setCouponForm(emptyCouponForm);
  }

  function openEditCoupon(coupon: Coupon) {
    setBulkEditing(null);
    setCouponEditing(coupon.public_id);
    setCouponForm({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_value: coupon.min_order_value || "",
      max_uses: coupon.max_uses != null ? String(coupon.max_uses) : "",
      per_identity_max_uses: coupon.per_identity_max_uses != null ? String(coupon.per_identity_max_uses) : "",
      valid_from: coupon.valid_from ? coupon.valid_from.slice(0, 10) : "",
      valid_until: coupon.valid_until ? coupon.valid_until.slice(0, 10) : "",
      is_active: coupon.is_active,
    });
  }

  async function handleSaveCoupon(e: FormEvent) {
    e.preventDefault();
    setSavingCoupon(true);
    const payload: Record<string, unknown> = {
      code: couponForm.code.trim(),
      discount_type: couponForm.discount_type,
      discount_value: couponForm.discount_value,
      is_active: couponForm.is_active,
    };
    if (couponForm.min_order_value) payload.min_order_value = couponForm.min_order_value;
    if (couponForm.max_uses) payload.max_uses = parseInt(couponForm.max_uses, 10);
    if (couponForm.per_identity_max_uses)
      payload.per_identity_max_uses = parseInt(couponForm.per_identity_max_uses, 10);
    if (couponForm.valid_from) payload.valid_from = `${couponForm.valid_from}T00:00:00Z`;
    if (couponForm.valid_until) payload.valid_until = `${couponForm.valid_until}T23:59:59Z`;

    try {
      if (couponEditing === "new") {
        await api.post("admin/coupons/", payload);
      } else {
        await api.patch(`admin/coupons/${couponEditing}/`, payload);
      }
      setCouponEditing(null);
      fetchCoupons();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingCoupon(false);
    }
  }

  async function handleDeleteCoupon(publicId: string) {
    if (!confirm("Delete this coupon?")) return;
    try {
      await api.delete(`admin/coupons/${publicId}/`);
      fetchCoupons();
    } catch (err) {
      console.error(err);
    }
  }

  function openNewBulk() {
    setCouponEditing(null);
    setBulkEditing("new");
    setBulkForm(emptyBulkForm);
    setBulkSaveError("");
  }

  function openEditBulk(rule: BulkDiscount) {
    setCouponEditing(null);
    setBulkEditing(rule.public_id);
    setBulkSaveError("");
    setBulkForm({
      target_type: rule.target_type,
      category_public_id: rule.category_public_id ?? "",
      product_public_id: rule.product_public_id ?? "",
      discount_type: rule.discount_type,
      discount_value: rule.discount_value,
      priority: String(rule.priority),
      start_date: rule.start_date ? rule.start_date.slice(0, 10) : "",
      end_date: rule.end_date ? rule.end_date.slice(0, 10) : "",
      is_active: rule.is_active,
    });
  }

  async function handleSaveBulk(e: FormEvent) {
    e.preventDefault();
    setSavingBulk(true);
    setBulkSaveError("");
    const payload: Record<string, unknown> = {
      target_type: bulkForm.target_type,
      discount_type: bulkForm.discount_type,
      discount_value: bulkForm.discount_value,
      priority: parseInt(bulkForm.priority || "0", 10),
      is_active: bulkForm.is_active,
      category_public_id: null,
      product_public_id: null,
    };
    if (bulkForm.target_type === "product") {
      const pid = bulkForm.product_public_id.trim();
      payload.product_public_id = pid || null;
    } else {
      const cid = bulkForm.category_public_id.trim();
      payload.category_public_id = cid || null;
    }
    if (bulkForm.start_date) payload.start_date = `${bulkForm.start_date}T00:00:00Z`;
    if (bulkForm.end_date) payload.end_date = `${bulkForm.end_date}T23:59:59Z`;
    try {
      if (bulkEditing === "new") {
        await api.post("admin/bulk-discounts/", payload);
      } else {
        await api.patch(`admin/bulk-discounts/${bulkEditing}/`, payload);
      }
      setBulkEditing(null);
      fetchBulkData();
    } catch (err: unknown) {
      const data =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: unknown } }).response?.data
          : null;
      setBulkSaveError(formatBulkApiError(data));
    } finally {
      setSavingBulk(false);
    }
  }

  async function handleDeleteBulk(publicId: string) {
    if (!confirm("Delete this discount rule?")) return;
    try {
      await api.delete(`admin/bulk-discounts/${publicId}/`);
      fetchBulkData();
    } catch (err) {
      console.error(err);
    }
  }

  const subcategories = categories.filter((c) => !!c.parent);

  function bulkRuleTargetLabel(rule: BulkDiscount): string {
    if (rule.target_type === "product") {
      const p = products.find((x) => x.public_id === rule.product_public_id);
      return p ? `Product · ${p.name}` : "Product";
    }
    const cat =
      categories.find((c) => c.public_id === rule.category_public_id) ??
      parentCategories.find((c) => c.public_id === rule.category_public_id);
    const name = cat?.name ?? "—";
    return `${rule.target_type === "subcategory" ? "Subcategory" : "Category"} · ${name}`;
  }

  const showFullPageSpinner = tab === "codes" && loadingCoupons;

  if (showFullPageSpinner) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
          <div>
            <h1 className="text-2xl font-medium text-foreground">Coupons &amp; discounts</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Coupon codes and automatic bulk discounts (category, subcategory, product).
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={tab === "codes" ? openNewCoupon : openNewBulk}
          className="flex w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          {tab === "codes" ? "Add coupon" : "Add bulk rule"}
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Promotion type"
        className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "codes"}
          onClick={() => setTab("codes")}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors",
            tab === "codes"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Coupon codes ({coupons.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "bulk"}
          onClick={() => setTab("bulk")}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors",
            tab === "bulk"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Bulk discounts ({rules.length})
        </button>
      </div>

      {tab === "codes" && (
        <>
          {couponEditing && (
            <form
              onSubmit={handleSaveCoupon}
              className="space-y-4 rounded-xl border border-border bg-card p-6"
            >
              <h2 className="text-lg font-medium">
                {couponEditing === "new" ? "New coupon" : "Edit coupon"}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Code</label>
                  <Input
                    type="text"
                    value={couponForm.code}
                    onChange={(e) => setCouponForm((f) => ({ ...f, code: e.target.value }))}
                    className="text-sm"
                    placeholder="SAVE20"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Discount type</label>
                  <Select
                    value={couponForm.discount_type}
                    onChange={(e) =>
                      setCouponForm((f) => ({ ...f, discount_type: e.target.value }))
                    }
                    className="text-sm"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed amount</option>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Discount value</label>
                  <Input
                    type="text"
                    value={couponForm.discount_value}
                    onChange={(e) =>
                      setCouponForm((f) => ({ ...f, discount_value: e.target.value }))
                    }
                    className="text-sm"
                    placeholder={couponForm.discount_type === "percentage" ? "20" : "10.00"}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Min order value</label>
                  <Input
                    type="text"
                    value={couponForm.min_order_value}
                    onChange={(e) =>
                      setCouponForm((f) => ({ ...f, min_order_value: e.target.value }))
                    }
                    className="text-sm"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Max uses</label>
                  <Input
                    type="text"
                    value={couponForm.max_uses}
                    onChange={(e) =>
                      setCouponForm((f) => ({ ...f, max_uses: e.target.value }))
                    }
                    className="text-sm"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Max uses per customer (phone / email / session)</label>
                  <Input
                    type="text"
                    value={couponForm.per_identity_max_uses}
                    onChange={(e) =>
                      setCouponForm((f) => ({ ...f, per_identity_max_uses: e.target.value }))
                    }
                    className="text-sm"
                    placeholder="Optional — guests included via phone, email, or session"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Valid from</label>
                  <Input
                    type="date"
                    value={couponForm.valid_from}
                    onChange={(e) =>
                      setCouponForm((f) => ({ ...f, valid_from: e.target.value }))
                    }
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Valid until</label>
                  <Input
                    type="date"
                    value={couponForm.valid_until}
                    onChange={(e) =>
                      setCouponForm((f) => ({ ...f, valid_until: e.target.value }))
                    }
                    className="text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="coupon_is_active"
                    className="form-checkbox"
                    checked={couponForm.is_active}
                    onChange={(e) =>
                      setCouponForm((f) => ({ ...f, is_active: e.target.checked }))
                    }
                  />
                  <label htmlFor="coupon_is_active" className="text-sm">
                    Active
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={savingCoupon}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {savingCoupon ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setCouponEditing(null)}
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
                  <th className="th">Code</th>
                  <th className="th">Discount</th>
                  <th className="th">Uses</th>
                  <th className="th">Per customer</th>
                  <th className="th">Valid</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {coupons.map((c) => (
                  <tr key={c.public_id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">{c.code}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.discount_type === "percentage"
                        ? `${c.discount_value}%`
                        : `$${c.discount_value}`}
                    </td>
                    <td className="px-4 py-3">
                      {c.times_used}
                      {c.max_uses != null ? ` / ${c.max_uses}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      {c.per_identity_max_uses != null ? c.per_identity_max_uses : "—"}
                      {(c.successful_uses != null || c.reversed_uses != null) && (
                        <div className="text-xs text-muted-foreground">
                          {c.successful_uses ?? 0} success / {c.reversed_uses ?? 0} reversed
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(c.valid_from)} – {formatDate(c.valid_until)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          c.is_active
                            ? "text-green-600 dark:text-green-400"
                            : "text-muted-foreground"
                        }
                      >
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ClickableText
                        onClick={() => openEditCoupon(c)}
                        className="mr-2 text-sm"
                      >
                        Edit
                      </ClickableText>
                      <ClickableText
                        variant="destructive"
                        onClick={() => handleDeleteCoupon(c.public_id)}
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

          {coupons.length === 0 && !couponEditing && (
            <div className="rounded-xl border border-dashed border-card-border bg-card py-12 text-center text-sm text-muted-foreground">
              No coupons yet. Click &quot;Add coupon&quot; to create one.
            </div>
          )}
        </>
      )}

      {tab === "bulk" && (
        <>
          {loadingBulk ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              {bulkEditing && (
                <form
                  onSubmit={handleSaveBulk}
                  className="space-y-4 rounded-xl border border-border bg-card p-6"
                >
                  <h2 className="text-lg font-medium">
                    {bulkEditing === "new" ? "New bulk rule" : "Edit bulk rule"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Product rules override subcategory; subcategory overrides parent category. Higher
                    priority wins within the same level.
                  </p>
                  {bulkSaveError && (
                    <div
                      role="alert"
                      className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                    >
                      {bulkSaveError}
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Target type</label>
                      <Select
                        value={bulkForm.target_type}
                        onChange={(e) =>
                          setBulkForm((prev) => ({
                            ...prev,
                            target_type: e.target.value as BulkDiscountForm["target_type"],
                            category_public_id: "",
                            product_public_id: "",
                          }))
                        }
                      >
                        <option value="category">Category</option>
                        <option value="subcategory">Subcategory</option>
                        <option value="product">Product</option>
                      </Select>
                    </div>
                    {bulkForm.target_type === "product" ? (
                      <div>
                        <label className="mb-1 block text-sm font-medium">Product</label>
                        <Select
                          value={bulkForm.product_public_id}
                          onChange={(e) =>
                            setBulkForm((prev) => ({ ...prev, product_public_id: e.target.value }))
                          }
                          required
                        >
                          <option value="">Select product</option>
                          {products.map((product) => (
                            <option key={product.public_id} value={product.public_id}>
                              {product.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    ) : (
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          {bulkForm.target_type === "subcategory" ? "Subcategory" : "Category"}
                        </label>
                        <Select
                          value={bulkForm.category_public_id}
                          onChange={(e) =>
                            setBulkForm((prev) => ({ ...prev, category_public_id: e.target.value }))
                          }
                          required
                        >
                          <option value="">Select category</option>
                          {(bulkForm.target_type === "subcategory"
                            ? subcategories
                            : parentCategories
                          ).map((category) => (
                            <option key={category.public_id} value={category.public_id}>
                              {category.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    )}
                    <div>
                      <label className="mb-1 block text-sm font-medium">Discount type</label>
                      <Select
                        value={bulkForm.discount_type}
                        onChange={(e) =>
                          setBulkForm((prev) => ({
                            ...prev,
                            discount_type: e.target.value as BulkDiscountForm["discount_type"],
                          }))
                        }
                      >
                        <option value="percentage">Percentage</option>
                        <option value="fixed">Fixed</option>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Discount value</label>
                      <Input
                        value={bulkForm.discount_value}
                        onChange={(e) =>
                          setBulkForm((prev) => ({ ...prev, discount_value: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Priority</label>
                      <Input
                        type="number"
                        value={bulkForm.priority}
                        onChange={(e) =>
                          setBulkForm((prev) => ({ ...prev, priority: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Start date</label>
                      <Input
                        type="date"
                        value={bulkForm.start_date}
                        onChange={(e) =>
                          setBulkForm((prev) => ({ ...prev, start_date: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">End date</label>
                      <Input
                        type="date"
                        value={bulkForm.end_date}
                        onChange={(e) =>
                          setBulkForm((prev) => ({ ...prev, end_date: e.target.value }))
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="bulk_is_active"
                        type="checkbox"
                        className="form-checkbox"
                        checked={bulkForm.is_active}
                        onChange={(e) =>
                          setBulkForm((prev) => ({ ...prev, is_active: e.target.checked }))
                        }
                      />
                      <label htmlFor="bulk_is_active" className="text-sm">
                        Active
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={savingBulk}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                    >
                      {savingBulk ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBulkEditing(null);
                        setBulkSaveError("");
                      }}
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
                      <th className="th">Target</th>
                      <th className="th">Discount</th>
                      <th className="th">Priority</th>
                      <th className="th">Dates</th>
                      <th className="th">Status</th>
                      <th className="th text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {rules.map((rule) => (
                      <tr key={rule.public_id} className="hover:bg-muted/40">
                        <td className="px-4 py-3">{bulkRuleTargetLabel(rule)}</td>
                        <td className="px-4 py-3">
                          {rule.discount_type === "percentage"
                            ? `${rule.discount_value}%`
                            : rule.discount_value}
                        </td>
                        <td className="px-4 py-3">{rule.priority}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {rule.start_date?.slice(0, 10) || "—"} –{" "}
                          {rule.end_date?.slice(0, 10) || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {rule.is_active ? "Active" : "Inactive"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ClickableText
                            onClick={() => openEditBulk(rule)}
                            className="mr-2 text-sm"
                          >
                            Edit
                          </ClickableText>
                          <ClickableText
                            variant="destructive"
                            onClick={() => handleDeleteBulk(rule.public_id)}
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

              {rules.length === 0 && !bulkEditing && (
                <div className="rounded-xl border border-dashed border-card-border bg-card py-12 text-center text-sm text-muted-foreground">
                  No bulk discount rules yet. Click &quot;Add bulk rule&quot; to create one.
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
