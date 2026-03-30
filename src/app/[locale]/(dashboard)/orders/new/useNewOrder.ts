"use client";

import { useEffect, useState, useRef, useMemo, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import api from "@/lib/api";
import type {
  Product,
  PaginatedResponse,
  ProductVariant,
  ShippingMethod,
  ShippingZone,
  OrderPricingPreview,
} from "@/types";
import { joinVillageThanaDistrict } from "@/lib/orders/shipping-address-parts";
import { buildOrderCreateSchema, parseValidation } from "@/lib/validation";

export interface OrderItemRow {
  key: number;
  product_public_id: string;
  product_name: string;
  product_image: string | null;
  variant_public_id: string | null;
  quantity: number;
  unit_price: string;
}

export interface OrderForm {
  shipping_name: string;
  phone: string;
  email: string;
  /** Composed with thana + district into API `shipping_address`. */
  village: string;
  thana: string;
  district: string;
  shipping_zone_public_id: string;
  shipping_method_public_id: string;
}

export function useNewOrder() {
  const router = useRouter();
  const t = useTranslations("pages");
  const orderCreateSchema = useMemo(
    () =>
      buildOrderCreateSchema({
        shippingNameRequired: t("orderValidationShippingNameRequired"),
        phoneRequired: t("orderValidationPhoneRequired"),
        emailInvalid: t("orderValidationEmailInvalid"),
        roadVillageRequired: t("orderValidationRoadVillageRequired"),
        thanaRequired: t("orderValidationThanaRequired"),
        districtRequired: t("orderValidationDistrictRequired"),
        zoneRequired: t("orderValidationZoneRequired"),
        itemsRequired: t("orderValidationItemsRequired"),
      }),
    [t],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<OrderForm>({
    shipping_name: "",
    phone: "",
    email: "",
    village: "",
    thana: "",
    district: "",
    shipping_zone_public_id: "",
    shipping_method_public_id: "",
  });

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
  const [pricingPreview, setPricingPreview] = useState<OrderPricingPreview | null>(null);

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
        product_name: product.name || t("orderNewProductUnavailable"),
        product_image: product.image_url ?? product.image ?? null,
        variant_public_id: null,
        quantity: 1,
        unit_price: String(product.price ?? "0"),
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

  const displayTotal = pricingPreview ? Number(pricingPreview.total || 0) : 0;

  useEffect(() => {
    if (items.length === 0) {
      setPricingPreview(null);
      return;
    }
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      api
        .post<OrderPricingPreview>(
          "admin/orders/pricing-preview/",
          {
            shipping_zone_public_id: form.shipping_zone_public_id,
            shipping_method_public_id: form.shipping_method_public_id || null,
            items: items.map((item) => ({
              product_public_id: item.product_public_id,
              variant_public_id: item.variant_public_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const hasMissingRequiredVariant = items.some((item, index) => {
      const variants = variantsByProductId[item.product_public_id] ?? [];
      return variants.length > 0 && !item.variant_public_id && index >= 0;
    });
    if (hasMissingRequiredVariant) {
      const firstMissingIndex = items.findIndex((item) => {
        const variants = variantsByProductId[item.product_public_id] ?? [];
        return variants.length > 0 && !item.variant_public_id;
      });
      setFieldErrors(
        firstMissingIndex >= 0
          ? { [`items.${firstMissingIndex}.variant_public_id`]: t("orderValidationVariantRequired") }
          : {}
      );
      setError("");
      return;
    }

    const validation = parseValidation(orderCreateSchema, { ...form, items });
    if (!validation.success) {
      setFieldErrors(validation.errors);
      const hasItemErrors = Object.keys(validation.errors).some(
        (k) => k === "items" || k.startsWith("items."),
      );
      if (hasItemErrors) {
        setError("");
        return;
      }
      const firstMessage =
        Object.values(validation.errors)[0] ?? t("orderFormFixHighlightedFields");
      setError(firstMessage);
      return;
    }

    const { village, thana, district, items: validatedItems, ...rest } = validation.data;

    setFieldErrors({});
    setSaving(true);
    setError("");

    try {
      const payload = {
        shipping_name: rest.shipping_name,
        phone: rest.phone,
        email: rest.email,
        shipping_address: joinVillageThanaDistrict(village, thana, district),
        district,
        shipping_zone_public_id: rest.shipping_zone_public_id,
        shipping_method_public_id: rest.shipping_method_public_id || null,
        items: validatedItems.map((item) => ({
          product_public_id: item.product_public_id,
          variant_public_id: item.variant_public_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      };
      await api.post("admin/orders/", payload);
      router.push("/orders");
    } catch (err: unknown) {
      const data =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: Record<string, unknown> } }).response?.data
          : undefined;
      const backendDetail =
        typeof data?.detail === "string"
          ? data.detail
          : undefined;
      const backendFieldErrors: Record<string, string> = {};
      if (data && typeof data === "object") {
        for (const [key, value] of Object.entries(data)) {
          if (key === "detail") continue;
          if (Array.isArray(value) && typeof value[0] === "string") {
            backendFieldErrors[key] = value[0];
          } else if (typeof value === "string") {
            backendFieldErrors[key] = value;
          }
        }
      }
      if (Object.keys(backendFieldErrors).length > 0) {
        setFieldErrors(backendFieldErrors);
      }
      if (backendDetail) {
        setError(backendDetail);
      } else {
        setError(t("orderNewCreateFailed"));
      }
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
