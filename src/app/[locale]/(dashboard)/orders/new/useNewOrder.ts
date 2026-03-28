"use client";

import {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
  type FormEvent,
} from "react";
import { useRouter } from "@/i18n/navigation";
import api from "@/lib/api";
import { useExtraFieldsSchema } from "@/hooks/useExtraFieldsSchema";
import type { ExtraFieldValues } from "@/types/extra-fields";
import type {
  Product,
  PaginatedResponse,
  ProductVariant,
  ShippingMethod,
  ShippingZone,
} from "@/types";
import {
  orderCreateSchema,
  parseValidation,
  validateRequiredExtraFields,
} from "@/lib/validation";

export interface OrderItemRow {
  key: number;
  product_public_id: string;
  product_name: string;
  product_image: string | null;
  variant_public_id: string | null;
  quantity: number;
  price: string;
}

export interface OrderForm {
  shipping_name: string;
  phone: string;
  email: string;
  shipping_address: string;
  district: string;
  tracking_number: string;
  shipping_zone_public_id: string;
  shipping_method_public_id: string;
}

export function useNewOrder() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<OrderForm>({
    shipping_name: "",
    phone: "",
    email: "",
    shipping_address: "",
    district: "",
    tracking_number: "",
    shipping_zone_public_id: "",
    shipping_method_public_id: "",
  });

  const [extraFields, setExtraFieldsState] = useState<ExtraFieldValues>({});
  const setExtraFields = useCallback(
    (value: ExtraFieldValues | ((prev: ExtraFieldValues) => ExtraFieldValues)) => {
      setFieldErrors({});
      setExtraFieldsState(value);
    },
    [],
  );
  const [extraFieldsErrors, setExtraFieldsErrors] = useState<Record<string, string>>({});
  const { schema: extraFieldsSchema } = useExtraFieldsSchema("order");

  const [items, setItems] = useState<OrderItemRow[]>([]);
  const nextKey = useRef(0);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [variantsByProductId, setVariantsByProductId] = useState<Record<string, ProductVariant[]>>({});
  const [variantsLoadingByProductId, setVariantsLoadingByProductId] = useState<Record<string, boolean>>({});

  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [pricingPreview, setPricingPreview] = useState<{
    base_subtotal: string;
    shipping_cost: string;
    final_total: string;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<PaginatedResponse<ShippingZone> | ShippingZone[]>("admin/shipping-zones/"),
      api.get<PaginatedResponse<ShippingMethod> | ShippingMethod[]>("admin/shipping-methods/"),
    ])
      .then(([z, m]) => {
        setShippingZones(Array.isArray(z.data) ? z.data : (z.data.results ?? []));
        setShippingMethods(Array.isArray(m.data) ? m.data : (m.data.results ?? []));
      })
      .catch(() => {
        setShippingZones([]);
        setShippingMethods([]);
      });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearch(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get<PaginatedResponse<Product>>("admin/products/", {
          params: { search: value.trim(), status: "active" },
        });
        setResults(data.results);
        setShowResults(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  async function ensureVariantsLoaded(productId: string) {
    if (!productId) return;
    if (variantsByProductId[productId]) return;
    setVariantsLoadingByProductId((p) => ({ ...p, [productId]: true }));
    try {
      const { data } = await api.get<PaginatedResponse<ProductVariant> | ProductVariant[]>(
        "admin/product-variants/",
        { params: { product_public_id: productId } }
      );
      const list = Array.isArray(data) ? data : data.results;
      setVariantsByProductId((p) => ({ ...p, [productId]: list ?? [] }));
    } catch {
      setVariantsByProductId((p) => ({ ...p, [productId]: [] }));
    } finally {
      setVariantsLoadingByProductId((p) => ({ ...p, [productId]: false }));
    }
  }

  function addProduct(product: Product) {
    if (!product?.public_id) return;
    setFieldErrors({});
    ensureVariantsLoaded(product.public_id);
    setItems((prev) => [
      ...prev,
      {
        key: nextKey.current++,
        product_public_id: product.public_id,
        product_name: product.name || "Unavailable",
        product_image: product.image_url ?? product.image ?? null,
        variant_public_id: null,
        quantity: 1,
        price: product.price,
      },
    ]);
    setQuery("");
    setResults([]);
    setShowResults(false);
  }

  function updateItem<K extends keyof OrderItemRow>(
    key: number,
    field: K,
    value: OrderItemRow[K]
  ) {
    setFieldErrors({});
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, [field]: value } : item))
    );
  }

  function removeItem(key: number) {
    setFieldErrors({});
    setItems((prev) => prev.filter((item) => item.key !== key));
  }

  function updateForm(patch: Partial<OrderForm>) {
    setFieldErrors({});
    setForm((prev) => ({ ...prev, ...patch }));
  }

  const merchandiseTotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0),
    [items]
  );

  const displayTotal = pricingPreview
    ? Number(pricingPreview.final_total || 0)
    : merchandiseTotal;

  useEffect(() => {
    if (items.length === 0) {
      setPricingPreview(null);
      return;
    }
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      api
        .post<{
          base_subtotal: string;
          shipping_cost: string;
          final_total: string;
        }>(
          "admin/orders/pricing-preview/",
          {
            shipping_zone_public_id: form.shipping_zone_public_id,
            shipping_method_public_id: form.shipping_method_public_id || null,
            items: items.map((item) => ({
              product_public_id: item.product_public_id,
              variant_public_id: item.variant_public_id,
              quantity: item.quantity,
            })),
          },
          { signal: ac.signal }
        )
        .then(({ data }) => setPricingPreview(data))
        .catch(() => {
          if (!ac.signal.aborted) setPricingPreview(null);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [items, form.shipping_zone_public_id, form.shipping_method_public_id]);

  const schemaWithNames = useMemo(
    () => extraFieldsSchema.filter((f) => f.name.trim()),
    [extraFieldsSchema]
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validation = parseValidation(orderCreateSchema, { ...form, items });
    if (!validation.success) {
      setFieldErrors(validation.errors);
      const firstMessage =
        Object.values(validation.errors)[0] ?? "Please correct the highlighted fields.";
      setError(firstMessage);
      return;
    }

    const extraErrors = validateRequiredExtraFields(schemaWithNames, extraFields);
    if (Object.keys(extraErrors).length > 0) {
      setExtraFieldsErrors(extraErrors);
      setFieldErrors({});
      setError("Please fill in all required extra fields.");
      return;
    }
    setExtraFieldsErrors({});
    setFieldErrors({});
    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        shipping_method_public_id: form.shipping_method_public_id || null,
        items: items.map((item) => ({
          product_public_id: item.product_public_id,
          variant_public_id: item.variant_public_id,
          quantity: item.quantity,
          price: item.price,
        })),
        ...(Object.keys(extraFields).length > 0 && { extra_data: extraFields }),
      };
      await api.post("admin/orders/", payload);
      router.push("/orders");
    } catch {
      setError("Failed to create order. Please check the details and try again.");
    } finally {
      setSaving(false);
    }
  }

  return {
    saving,
    error,
    fieldErrors,
    form,
    updateForm,
    extraFields,
    setExtraFields,
    extraFieldsErrors,
    extraFieldsSchema,
    items,
    query,
    results,
    searching,
    showResults,
    setShowResults,
    searchRef,
    variantsByProductId,
    variantsLoadingByProductId,
    shippingZones,
    shippingMethods,
    merchandiseTotal,
    displayTotal,
    pricingPreview,
    handleSearch,
    addProduct,
    updateItem,
    removeItem,
    ensureVariantsLoaded,
    handleSubmit,
    router,
  };
}
