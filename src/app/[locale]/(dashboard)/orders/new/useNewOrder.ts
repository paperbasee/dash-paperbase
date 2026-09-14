"use client";

import { useCallback, useEffect, useState, useRef, useMemo, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useDeferredNavigate } from "@/hooks/useDeferredNavigate";
import { useShippingMethodsQuery } from "@/hooks/useShippingMethodsQuery";
import { useShippingZonesQuery } from "@/hooks/useShippingZonesQuery";
import { useOrderEditorVariants } from "@/hooks/useOrderEditorVariants";
import api from "@/lib/api";
import { notify } from "@/notifications";
import type {
  Product,
  PaginatedResponse,
  OrderPricingPreview,
} from "@/types";
import { joinVillageThanaDistrict } from "@/lib/orders/shipping-address-parts";
import {
  createOrderEditorVariantsFailureReporter,
  ensureOrderEditorVariants,
  invalidateOrderEditorVariants,
} from "@/lib/orders/order-editor-variants";
import { createProductSearchScheduler } from "@/lib/orders/product-search-scheduler";
import { buildOrderCreateSchema, parseValidation } from "@/lib/validation";
import {
  dashboardAnalyticsQueryKeyRoot,
  navCountsQueryKey,
  ordersListQueryKeyRoot,
} from "@/lib/query-keys";

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
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigate = useDeferredNavigate();

  const invalidateAfterOrderCreate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ordersListQueryKeyRoot });
    void queryClient.invalidateQueries({ queryKey: navCountsQueryKey });
    void queryClient.invalidateQueries({ queryKey: dashboardAnalyticsQueryKeyRoot });
    // The order took stock: the next editor must not show the old available quantities.
    void invalidateOrderEditorVariants(queryClient);
  }, [queryClient]);
  const t = useTranslations("pages");
  const tCommon = useTranslations("common");
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
  const [error, setError] = useState(""); // kept for legacy callers; do not render inline
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

  // Same shared per-product cache as the order edit page: products loaded together share a request.
  const itemProductIds = useMemo(
    () => [...new Set(items.map((item) => item.product_public_id).filter(Boolean))],
    [items],
  );
  const { variantsByProductId, variantsLoadingByProductId, variantErrors } =
    useOrderEditorVariants(itemProductIds);

  // Report each failed variants request once (a retry that fails again is a new failure).
  const [unreportedVariantErrors] = useState(createOrderEditorVariantsFailureReporter);
  useEffect(() => {
    for (const { error } of unreportedVariantErrors(variantErrors)) {
      notify.error(error, {
        title: t("toastTitleVariantsUnavailable"),
        fallbackMessage: t("toastDescVariantsUnavailable"),
      });
    }
  }, [variantErrors, unreportedVariantErrors, t]);

  const zonesQuery = useShippingZonesQuery();
  const methodsQuery = useShippingMethodsQuery();
  const shippingZones = zonesQuery.data ?? [];
  const shippingMethods = methodsQuery.data ?? [];
  const [pricingPreview, setPricingPreview] = useState<OrderPricingPreview | null>(null);

  const shippingSetupError = zonesQuery.isError
    ? zonesQuery.error
    : methodsQuery.isError
      ? methodsQuery.error
      : null;
  useEffect(() => {
    if (!shippingSetupError) return;
    notify.error(shippingSetupError, {
      title: t("toastTitleShippingSetupUnavailable"),
      fallbackMessage: t("toastDescShippingSetupUnavailable"),
    });
  }, [shippingSetupError, t]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced, newest-query-wins product search: an older response never replaces newer results.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);
  const [productSearch] = useState(() =>
    createProductSearchScheduler(
      async (search, signal) => {
        // The spinner shows while a request runs, not while the user is still typing.
        setSearching(true);
        const { data } = await api.get<PaginatedResponse<Product>>("admin/products/", {
          params: { search, status: "active" },
          signal,
        });
        return data.results;
      },
      {
        onSearching: () => {},
        onResults: (found) => {
          setResults(found);
          setShowResults(true);
        },
        onError: (err) => {
          setResults([]);
          notify.error(err, {
            title: tRef.current("toastTitleProductSearchFailed"),
            fallbackMessage: tRef.current("toastDescProductSearchFailed"),
          });
        },
        onSettled: () => setSearching(false),
        onCleared: () => {
          setResults([]);
          setShowResults(false);
          setSearching(false);
        },
      },
    ),
  );
  useEffect(() => () => productSearch.cancel(), [productSearch]);

  function handleSearch(value: string) {
    setQuery(value);
    productSearch.search(value);
  }

  function ensureVariantsLoaded(productId: string) {
    ensureOrderEditorVariants(queryClient, productId);
  }

  function addProduct(product: Product) {
    if (!product?.public_id) return;
    setFieldErrors({});
    // Adding the row adds its product to itemProductIds, which loads its variants.
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
    // A search still pending for an older query must not reopen the results after the pick.
    productSearch.cancel();
    setSearching(false);
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
        .catch((err) => {
          if (ac.signal.aborted) return;
          setPricingPreview(null);
          notify.info(t("toastDescTotalsPreviewPaused"), {
            title: t("toastTitleTotalsPreviewPaused"),
            dedupeKey: "orderNewTotalsPreviewPaused",
          });
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
      notify.validation(
        "orderNew",
        firstMissingIndex >= 0
          ? { [`items.${firstMissingIndex}.variant_public_id`]: t("orderValidationVariantRequired") }
          : {},
      );
      return;
    }

    const validation = parseValidation(orderCreateSchema, { ...form, items });
    if (!validation.success) {
      setFieldErrors(validation.errors);
      notify.validation("orderNew", validation.errors);
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
      invalidateAfterOrderCreate();
      notify.success(t("toastDescOrderCreated"), {
        title: t("toastTitleOrderCreated"),
        action: {
          label: tCommon("toastActionViewOrders"),
          onClick: () => void navigate("/orders"),
        },
      });
      void navigate("/orders");
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
        notify.validation("orderNew", backendFieldErrors);
      }
      if (backendDetail) {
        setError(backendDetail);
        notify.error(err, {
          title: t("toastTitleOrderNotCreated"),
          fallbackMessage: t("toastDescOrderNotCreated"),
        });
      } else {
        setError(t("orderNewCreateFailed"));
        notify.error(err, {
          title: t("toastTitleOrderNotCreated"),
          fallbackMessage: t("toastDescOrderNotCreated"),
        });
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
    navigate,
  };
}
