"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { toLocaleDigits } from "@/lib/locale-digits";
import { cursorFromLink } from "@/lib/cursor-from-link";
import { digitsInNumberFont, numberTextClass } from "@/lib/number-font";
import { Download, Loader2, FunnelIcon, Truck, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FilterBar } from "@/components/filters/FilterBar";
import { FilterDropdown } from "@/components/filters/FilterDropdown";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useFilters } from "@/hooks/useFilters";
import { useHorizontalWheelScroll } from "@/hooks/useHorizontalWheelScroll";
import api from "@/lib/api";
import { useBranding } from "@/context/BrandingContext";
import { formatDashboardDateTime } from "@/lib/datetime-display";
import { flattenCategoryOptionsRich } from "@/lib/category-tree";
import {
  ORDER_STATUS_OPTIONS,
  formatOrderStatusLabel,
} from "@/lib/orders/order-statuses";
import {
  ORDER_PAYMENT_STATUS_OPTIONS,
  formatOrderPaymentStatusLabel,
} from "@/lib/orders/payment-statuses";
import {
  ORDER_DELIVERY_STATUS_OPTIONS,
  formatOrderDeliveryStatusLabel,
} from "@/lib/orders/delivery-statuses";
import { ORDER_FLAG_OPTIONS, formatOrderFlagLabel } from "@/lib/orders/order-flags";
import type { AdminCategoryTreeNode, Order, PaginatedResponse } from "@/types";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { notify, normalizeError } from "@/notifications";
import { DashboardTableSkeleton } from "@/components/skeletons/dashboard-skeletons";
import { BelowFoldScrollHint } from "@/components/BelowFoldScrollHint";

import { OrderPreviewTriggerButton } from "@/components/orders/order-preview";
import { FraudCheckButton } from "./_components/FraudCheckButton";
import type { FraudCheckApiOk, FraudCheckState } from "./_components/types";
import { useFeatures } from "@/hooks/useFeatures";
import { useAuth } from "@/context/AuthContext";
import { useNavCounts } from "@/hooks/useNavCounts";
import {
  canUserDeleteProducts,
  type MeForProductDeletePermission,
} from "@/lib/product-delete-permission";

const FraudCheckDialog = dynamic(
  () => import("./_components/FraudCheckDialog").then((mod) => mod.FraudCheckDialog),
  { ssr: false, loading: () => null }
);

const OrderPreviewDialog = dynamic(
  () =>
    import("@/components/orders/order-preview").then((mod) => mod.OrderPreviewDialog),
  { ssr: false, loading: () => null }
);

type OrderExportPollResponse = {
  status: string;
  progress: number;
  download_url: string | null;
  expires_at: string | null;
  error_message?: string;
};

/** Shown after dispatch: Steadfast consignment id only (not provider name). */
function courierCell(order: Order): string {
  if (order.courier_dispatch_pending) return "…";
  if (!order.sent_to_courier) return "—";
  const c = (order.courier_consignment_id || "").trim();
  return c || "—";
}

function deliveryStatusBadge(order: Order) {
  const s = order.delivery_status || "unknown";
  const cfg: Record<
    string,
    { label: string; className: string }
  > = {
    not_dispatched: {
      label: "Not Dispatched",
      className: "bg-muted text-muted-foreground",
    },
    in_transit: {
      label: "In Transit",
      className: "bg-blue-600/10 text-blue-700 dark:text-blue-300",
    },
    delivered: {
      label: "Delivered",
      className: "bg-emerald-600/10 text-emerald-700 dark:text-emerald-300",
    },
    partial_delivered: {
      label: "Partial Delivered",
      className: "bg-amber-600/10 text-amber-700 dark:text-amber-300",
    },
    cancelled: {
      label: "Delivery Failed",
      className: "bg-rose-600/10 text-rose-700 dark:text-rose-300",
    },
    unknown: {
      label: "Unknown",
      className: "bg-muted text-muted-foreground",
    },
  };
  const hit = cfg[s] || cfg.unknown;
  return (
    <span
      className={`inline-flex items-center rounded-ui px-2 py-0.5 text-xs font-medium whitespace-nowrap ${hit.className}`}
      aria-label={`Delivery status: ${hit.label}`}
    >
      {hit.label}
    </span>
  );
}

type BulkCourierResultRow = { public_id: string; ok: boolean; error: string | null };

/** Strip legacy API blobs like ``ErrorDetail(string='…', code='…')`` from bulk error strings. */
function humanizeBulkDispatchError(message: string): string {
  const s = message.trim();
  if (!s.includes("ErrorDetail(string=")) return s;
  const m = s.match(/ErrorDetail\(string=['"]([^'"]*)['"]/);
  return (m?.[1] ?? s).trim();
}

const BULK_DISPATCH_DETAIL_MAX = 160;

function truncateBulkDetail(text: string, max = BULK_DISPATCH_DETAIL_MAX): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** One readable toast body: no per-order ID spam when every row failed for the same reason. */
function bulkDispatchFailureBody(
  results: BulkCourierResultRow[],
  summary: { ok: number; failed: number },
  locale: string,
  tPages: (key: string, values?: Record<string, string>) => string,
): string {
  const okStr = toLocaleDigits(String(summary.ok), locale);
  const failedStr = toLocaleDigits(String(summary.failed), locale);
  const intro = tPages("ordersBulkDispatchIntro", { ok: okStr, failed: failedStr });

  const failedRows = results.filter((r) => !r.ok);
  if (failedRows.length === 0) return intro;

  const normalized = failedRows.map((r) => {
    const e = humanizeBulkDispatchError((r.error || "").trim());
    return e || tPages("ordersBulkDispatchRowFailed");
  });

  const nNoCourier = normalized.filter((m) => m.includes("No active courier configured")).length;
  if (nNoCourier > 0 && nNoCourier < failedRows.length) {
    const other = failedRows.length - nNoCourier;
    return tPages("ordersBulkDispatchMixedShort", {
      failed: failedStr,
      ok: okStr,
      other: toLocaleDigits(String(other), locale),
    });
  }

  const unique = [...new Set(normalized)];

  if (unique.length === 1) {
    const only = unique[0];
    if (only.includes("No active courier configured")) {
      return tPages("ordersBulkDispatchAllNoCourier", { failed: failedStr, ok: okStr });
    }
    if (only.includes("already been sent to a courier")) {
      return tPages("ordersBulkDispatchAllAlreadySent", { failed: failedStr, ok: okStr });
    }
    return `${intro}\n${truncateBulkDetail(only)}`;
  }

  const counts = new Map<string, number>();
  for (const msg of normalized) {
    counts.set(msg, (counts.get(msg) || 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const lines = sorted.slice(0, 8).map(([msg, n]) =>
    tPages("ordersBulkDispatchGroupedErrorLine", {
      count: toLocaleDigits(String(n), locale),
      message: truncateBulkDetail(msg, 96),
    }),
  );
  const trailing = sorted.length > 8 ? `\n${tPages("ordersBulkDispatchMoreErrors")}` : "";
  return `${intro}\n${lines.join("\n")}${trailing}`;
}

export default function OrdersPage() {
  const router = useRouter();
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const tNav = useTranslations("nav");
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const { currencySymbol } = useBranding();
  const confirm = useConfirm();
  const { filters, setFilter, clearFilters } = useFilters([
    "customer",
    "status",
    "flag",
    "date_range",
    "payment_status",
    "delivery_status",
    "category",
    "search",
  ]);
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const debouncedSearch = useDebouncedValue(searchInput);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersCount, setOrdersCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [listCursor, setListCursor] = useState<string | null>(null);
  const [nextLink, setNextLink] = useState<string | null>(null);
  const [prevLink, setPrevLink] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDispatching, setBulkDispatching] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [flagUpdatingId, setFlagUpdatingId] = useState<string | null>(null);
  const [courierSendingId, setCourierSendingId] = useState<string | null>(null);
  const setScrollContainer = useHorizontalWheelScroll<HTMLDivElement>();

  const [fraudByOrderId, setFraudByOrderId] = useState<Record<string, FraudCheckState>>(
    {}
  );
  const [fraudDialogOrderId, setFraudDialogOrderId] = useState<string | null>(null);
  const [previewOrder, setPreviewOrder] = useState<{
    public_id: string;
    order_number: string;
  } | null>(null);
  const { hasFeature } = useFeatures();
  const canFraudCheck = hasFeature("fraud_check");
  const { meProfile } = useAuth();
  const { counts: navCounts } = useNavCounts();
  const canExportOrders = Boolean(
    meProfile &&
      canUserDeleteProducts(meProfile as MeForProductDeletePermission)
  );

  const deliveryPillOptions: { value: string; label: string }[] = [
    { value: "", label: "All" },
    ...ORDER_DELIVERY_STATUS_OPTIONS.map((s) => ({
      value: s,
      label: formatOrderDeliveryStatusLabel(s, (key) => tPages(key)),
    })),
  ];

  function statusSelectToneClass(status: string | null | undefined): string {
    const s = (status || "").toLowerCase();
    if (s === "confirmed") {
      return [
        // Light theme: darker text + slightly stronger tint
        "[&_[data-slot=select]]:bg-emerald-50",
        "[&_[data-slot=select]]:text-emerald-950",
        // Dark theme: brighter text + stronger tint for contrast
        "dark:[&_[data-slot=select]]:bg-emerald-500/20",
        "dark:[&_[data-slot=select]]:text-emerald-200",
      ].join(" ");
    }
    if (s === "cancelled") {
      return [
        "[&_[data-slot=select]]:bg-rose-50",
        "[&_[data-slot=select]]:text-rose-950",
        "dark:[&_[data-slot=select]]:bg-rose-500/20",
        "dark:[&_[data-slot=select]]:text-rose-200",
      ].join(" ");
    }
    if (s === "pending" || s === "payment_pending") {
      return [
        "[&_[data-slot=select]]:bg-amber-50",
        "[&_[data-slot=select]]:text-amber-950",
        "dark:[&_[data-slot=select]]:bg-amber-500/20",
        "dark:[&_[data-slot=select]]:text-amber-200",
      ].join(" ");
    }
    return "";
  }

  const statusOptionStyle: React.CSSProperties = {
    backgroundColor: "#0b0b0c",
    color: "#ffffff",
  };

  const [isDarkTheme, setIsDarkTheme] = useState(true);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setIsDarkTheme(root.classList.contains("dark"));
    read();
    const obs = new MutationObserver(read);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  function themedOptionBaseStyle(): React.CSSProperties {
    return isDarkTheme
      ? { backgroundColor: "#0b0b0c", color: "#ffffff" }
      : { backgroundColor: "#ffffff", color: "#0b0b0c" };
  }

  function statusOptionStyleFor(status: string): React.CSSProperties {
    const base = themedOptionBaseStyle();
    const s = (status || "").toLowerCase();
    // Note: option styling support varies by OS/browser; keep high contrast.
    if (s === "confirmed") return { ...base, color: "#34d399" }; // emerald-400
    if (s === "cancelled") return { ...base, color: "#fb7185" }; // rose-400
    if (s === "pending" || s === "payment_pending") return { ...base, color: "#fbbf24" }; // amber-400
    return base;
  }

  function flagSelectToneClass(flag: string | null | undefined): string {
    const f = (flag || "").trim().toLowerCase();
    if (!f) return "";
    if (f === "high_priority") {
      return [
        "[&_[data-slot=select]]:bg-rose-50",
        "[&_[data-slot=select]]:text-rose-950",
        "dark:[&_[data-slot=select]]:bg-rose-500/20",
        "dark:[&_[data-slot=select]]:text-rose-200",
      ].join(" ");
    }
    if (f === "wrong_number") {
      return [
        "[&_[data-slot=select]]:bg-amber-50",
        "[&_[data-slot=select]]:text-amber-950",
        "dark:[&_[data-slot=select]]:bg-amber-500/20",
        "dark:[&_[data-slot=select]]:text-amber-200",
      ].join(" ");
    }
    if (f === "call_later") {
      return [
        "[&_[data-slot=select]]:bg-blue-50",
        "[&_[data-slot=select]]:text-blue-950",
        "dark:[&_[data-slot=select]]:bg-blue-500/20",
        "dark:[&_[data-slot=select]]:text-blue-200",
      ].join(" ");
    }
    if (f === "no_response") {
      return [
        "[&_[data-slot=select]]:bg-slate-50",
        "[&_[data-slot=select]]:text-slate-950",
        "dark:[&_[data-slot=select]]:bg-slate-500/20",
        "dark:[&_[data-slot=select]]:text-slate-200",
      ].join(" ");
    }
    if (f === "busy") {
      return [
        "[&_[data-slot=select]]:bg-violet-50",
        "[&_[data-slot=select]]:text-violet-950",
        "dark:[&_[data-slot=select]]:bg-violet-500/20",
        "dark:[&_[data-slot=select]]:text-violet-200",
      ].join(" ");
    }
    return "";
  }

  function flagOptionStyle(flag: string): React.CSSProperties {
    const base = themedOptionBaseStyle();
    const f = (flag || "").trim().toLowerCase();
    // Note: option styling support varies by OS/browser; keep high contrast.
    if (f === "high_priority") return { ...base, color: "#fb7185" }; // rose-400
    if (f === "wrong_number") return { ...base, color: "#fbbf24" }; // amber-400
    if (f === "call_later") return { ...base, color: "#60a5fa" }; // blue-400
    if (f === "busy") return { ...base, color: "#c4b5fd" }; // violet-300
    if (f === "no_response") return { ...base, color: "#cbd5e1" }; // slate-300
    return base;
  }

  const [globalSelectActive, setGlobalSelectActive] = useState(false);
  const [exportSubmitting, setExportSubmitting] = useState(false);
  const [activeExportJobId, setActiveExportJobId] = useState<string | null>(null);
  const [exportPoll, setExportPoll] = useState<OrderExportPollResponse | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<
    { value: string; label: string; labelDisplay: ReactNode }[]
  >([]);

  function fraudStatus(data: FraudCheckApiOk | null | undefined): string | undefined {
    return data?.status ? String(data.status) : undefined;
  }

  function fraudDetail(data: FraudCheckApiOk | null | undefined): string | undefined {
    const resp = data?.response;
    if (!resp || typeof resp !== "object") return undefined;
    if (!("detail" in resp)) return undefined;
    const val = (resp as Record<string, unknown>).detail;
    return typeof val === "string" ? val : undefined;
  }

  useEffect(() => {
    const next = debouncedSearch.trim();
    if (next === (filters.search || "")) return;
    setFilter("search", next);
  }, [debouncedSearch, filters.search, setFilter]);

  useEffect(() => {
    api
      .get<AdminCategoryTreeNode[]>("admin/categories/?tree=1")
      .then((res) => {
        const tree = Array.isArray(res.data) ? res.data : [];
        setCategoryOptions(flattenCategoryOptionsRich(tree));
      })
      .catch((err) => {
        notify.error(err, {
          title: tPages("toastTitleCategoryFiltersUnavailable"),
          fallbackMessage: tPages("toastDescCategoryFiltersUnavailable"),
        });
      });
  }, [tPages]);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (listCursor) params.cursor = listCursor;
    if (filters.customer) params.customer = filters.customer;
    if (filters.status) params.status = filters.status;
    if (filters.flag) params.flag = filters.flag;
    if (filters.date_range) params.date_range = filters.date_range;
    if (filters.payment_status) params.payment_status = filters.payment_status;
    if (filters.delivery_status) params.delivery_status = filters.delivery_status;
    if (filters.category) params.category = filters.category;
    if (filters.search) params.search = filters.search;
    api
      .get<PaginatedResponse<Order>>("admin/orders/", {
        params,
      })
      .then((res) => {
        setOrders(res.data.results);
        setOrdersCount(typeof res.data.count === "number" ? res.data.count : null);
        setNextLink(res.data.next);
        setPrevLink(res.data.previous);
      })
      .catch((err) => {
        notify.error(err, {
          title: tPages("toastTitleOrdersFailedToLoad"),
          fallbackMessage: tPages("toastDescOrdersFailedToLoad"),
        });
      })
      .finally(() => setLoading(false));
  }, [
    filters.customer,
    filters.date_range,
    filters.flag,
    filters.category,
    filters.payment_status,
    filters.delivery_status,
    filters.search,
    filters.status,
    listCursor,
  ]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useLayoutEffect(() => {
    setListCursor(null);
    setNextLink(null);
    setPrevLink(null);
    setOrdersCount(null);
  }, [
    filters.customer,
    filters.date_range,
    filters.flag,
    filters.category,
    filters.payment_status,
    filters.delivery_status,
    filters.search,
    filters.status,
  ]);

  useEffect(() => {
    setGlobalSelectActive(false);
  }, [
    filters.customer,
    filters.date_range,
    filters.flag,
    filters.category,
    filters.payment_status,
    filters.delivery_status,
    filters.search,
    filters.status,
  ]);

  const filtersActive = Boolean(
    (filters.customer || "").trim() ||
      (filters.status || "").trim() ||
      (filters.flag || "").trim() ||
      (filters.date_range || "").trim() ||
      (filters.payment_status || "").trim() ||
      (filters.delivery_status || "").trim() ||
      (filters.category || "").trim() ||
      (filters.search || "").trim()
  );

  useEffect(() => {
    if (!filtersActive) setFiltersOpen(false);
  }, [
    filters.category,
    filters.customer,
    filters.date_range,
    filters.delivery_status,
    filters.flag,
    filters.payment_status,
    filters.search,
    filters.status,
  ]);

  const pageOrdersCount = orders.length;
  const totalOrdersCount = filtersActive
    ? ordersCount ?? null
    : ordersCount ?? navCounts?.orders ?? null;

  useEffect(() => {
    if (!activeExportJobId) return;

    let cancelled = false;
    const terminal = new Set(["COMPLETED", "FAILED", "EXPIRED"]);

    async function pollOnce() {
      try {
        const { data } = await api.get<OrderExportPollResponse>(
          `admin/orders/export/${activeExportJobId}/`
        );
        if (cancelled) return;
        setExportPoll(data);
        return terminal.has(data.status);
      } catch (e) {
        if (!cancelled) {
          notify.error(e, {
            title: tPages("toastTitleExportStatusUnavailable"),
            fallbackMessage: tPages("toastDescExportStatusUnavailable"),
          });
        }
        return true;
      }
    }

    let interval: ReturnType<typeof setInterval> | undefined;
    (async () => {
      const done = await pollOnce();
      if (done || cancelled) return;
      interval = setInterval(async () => {
        const stop = await pollOnce();
        if (stop && interval) clearInterval(interval);
      }, 2500);
    })();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [activeExportJobId, tPages]);

  const toggleSelect = (id: string) => {
    setGlobalSelectActive(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (globalSelectActive) {
      setGlobalSelectActive(false);
      setSelectedIds(new Set());
      return;
    }
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o) => o.public_id)));
    }
  };

  function selectAllMatchingFilters() {
    setGlobalSelectActive(true);
    setSelectedIds(new Set());
  }

  async function handleExportCsv() {
    if (!canExportOrders) return;
    if (!globalSelectActive && selectedIds.size === 0) return;
    setExportSubmitting(true);
    try {
      type CreateResp = { job_id: string; status: string };
      const body = globalSelectActive
        ? {
            select_all: true,
            filters: {
              customer: filters.customer || "",
              status: filters.status || "",
              flag: filters.flag || "",
              date_range: filters.date_range || "",
              payment_status: filters.payment_status || "",
              delivery_status: filters.delivery_status || "",
              category: filters.category || "",
              search: filters.search || "",
            },
          }
        : { select_all: false, order_ids: Array.from(selectedIds) };
      const { data } = await api.post<CreateResp>("admin/orders/export/", body);
      setActiveExportJobId(data.job_id);
      setExportPoll({
        status: (data.status || "PENDING").toUpperCase(),
        progress: 0,
        download_url: null,
        expires_at: null,
      });
      notify.success(tPages("toastDescCsvExportQueued"), {
        title: tPages("toastTitleCsvExportQueued"),
      });
    } catch (err) {
      notify.error(err, {
        title: tPages("toastTitleExportCouldntStart"),
        fallbackMessage: tPages("toastDescExportCouldntStart"),
      });
    } finally {
      setExportSubmitting(false);
    }
  }

  async function handleExportDownload() {
    const path = exportPoll?.download_url;
    if (!path) return;
    try {
      type DownloadMeta = { url: string; filename?: string };
      const { data } = await api.get<DownloadMeta>(path);
      const href = typeof data?.url === "string" ? data.url.trim() : "";
      if (!href) {
        notify.error(null, {
          title: tPages("toastTitleDownloadLinkNotReady"),
          fallbackMessage: tPages("toastDescDownloadLinkNotReady"),
        });
        return;
      }
      const filename =
        (typeof data.filename === "string" && data.filename.trim()) ||
        "orders-export.csv";
      const a = document.createElement("a");
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      notify.error(err, {
        title: tPages("toastTitleDownloadFailed"),
        fallbackMessage: tPages("toastDescDownloadFailed"),
      });
    }
  }

  function dismissExportPanel() {
    setActiveExportJobId(null);
    setExportPoll(null);
  }

  async function handleBulkConfirmSendCourier() {
    if (globalSelectActive || selectedIds.size === 0) return;
    const ok = await confirm({
      title: tPages("confirmDialogTitleSendCourier", {
        count: selectedIds.size,
      }),
      message: tPages("ordersBulkConfirmCourier", {
        count: selectedIds.size,
      }),
      variant: "default",
    });
    if (!ok) return;
    setBulkDispatching(true);
    try {
      type BulkResp = {
        results: { public_id: string; ok: boolean; error: string | null }[];
        summary: { ok: number; failed: number };
      };
      const { data } = await api.post<BulkResp>(
        "admin/orders/bulk-confirm-send-courier/",
        { order_public_ids: Array.from(selectedIds) }
      );
      const { summary, results } = data;
      if (summary.failed > 0) {
        notify.warning(bulkDispatchFailureBody(results, summary, locale, tPages), {
          title: tPages("toastTitleSomeOrdersNotDispatched"),
        });
      }
      if (summary.ok > 0) {
        notify.success(tPages("toastDescCourierDispatchConfirmed"), {
          title: tPages("toastTitleCourierDispatchConfirmed"),
        });
      }
      setSelectedIds(new Set());
      fetchOrders();
    } catch (err) {
      notify.error(err, {
        title: tPages("toastTitleBulkDispatchFailed"),
        fallbackMessage: tPages("toastDescBulkDispatchFailed"),
      });
    } finally {
      setBulkDispatching(false);
    }
  }

  async function handleRowStatusChange(order: Order, next: string) {
    if (
      order.status === "cancelled" ||
      order.has_unavailable_products ||
      next === order.status
    ) {
      return;
    }
    if (next === "cancelled") {
      const ok = await confirm({
        title: tPages("confirmDialogTitleCancelOrder"),
        message: tPages("confirmCancelOrder"),
        confirmText: tPages("orderStatusCancelled"),
        cancelText: tCommon("cancel"),
        variant: "danger",
      });
      if (!ok) return;
    }
    setStatusUpdatingId(order.public_id);
    try {
      const { data } = await api.patch<{ order: Order }>(
        `admin/orders/${order.public_id}/status/`,
        { status: next }
      );
      setOrders((prev) =>
        prev.map((o) => (o.public_id === order.public_id ? data.order : o))
      );
    } catch (e) {
      notify.error(e, {
        title: tPages("toastTitleOrderStatusNotUpdated"),
        fallbackMessage: tPages("toastDescOrderStatusNotUpdated"),
      });
    } finally {
      setStatusUpdatingId(null);
    }
  }

  async function handleRowFlagChange(order: Order, next: string) {
    const normalized = (next || "").trim().toLowerCase();
    const current = ((order.flag || "") as string).trim().toLowerCase();
    if (normalized === current) return;
    setFlagUpdatingId(order.public_id);
    try {
      const payload = { flag: normalized || null };
      const { data } = await api.patch<Order>(
        `admin/orders/${order.public_id}/`,
        payload
      );
      setOrders((prev) =>
        prev.map((o) => (o.public_id === order.public_id ? data : o))
      );
    } catch (e) {
      notify.error(e, {
        title: tPages("toastTitleFlagNotSaved"),
        fallbackMessage: tPages("toastDescFlagNotSaved"),
      });
    } finally {
      setFlagUpdatingId(null);
    }
  }

  async function handleSendToCourierRow(order: Order) {
    if (
      order.status !== "confirmed" ||
      order.sent_to_courier ||
      order.courier_dispatch_pending
    ) {
      return;
    }
    setCourierSendingId(order.public_id);
    try {
      const { data } = await api.post<Order>(
        `admin/orders/${order.public_id}/send-to-courier/`
      );
      setOrders((prev) =>
        prev.map((o) => (o.public_id === order.public_id ? data : o))
      );
    } catch (err: unknown) {
      const normalized = normalizeError(err, tPages("ordersSendToCourierErrorFallback"));
      notify.error(normalized.message, {
        title: tPages("toastTitleCourierHandoffFailed"),
      });
    } finally {
      setCourierSendingId(null);
    }
  }

  const allSelected =
    globalSelectActive ||
    (orders.length > 0 && selectedIds.size === orders.length);
  const someSelected = globalSelectActive || selectedIds.size > 0;

  async function handleFraudCheck(order: Order) {
    const key = order.public_id;
    const existing = fraudByOrderId[key];
    if (existing?.kind === "ready") {
      setFraudDialogOrderId(key);
      return;
    }
    if (existing?.kind === "loading") return;

    setFraudByOrderId((prev) => ({ ...prev, [key]: { kind: "loading" } }));
    setFraudDialogOrderId(key);

    try {
      const { data } = await api.post<FraudCheckApiOk>("fraud-check/", {
        phone: order.phone,
      });
      setFraudByOrderId((prev) => ({
        ...prev,
        [key]: { kind: "ready", data },
      }));
    } catch (err: unknown) {
      const normalized = normalizeError(err, "Failed to run fraud check.");
      const status = (() => {
        if (!err || typeof err !== "object") return undefined;
        if (!("response" in err)) return undefined;
        const resp = (err as Record<string, unknown>).response;
        if (!resp || typeof resp !== "object") return undefined;
        const s = (resp as Record<string, unknown>).status;
        return typeof s === "number" ? s : undefined;
      })();
      setFraudByOrderId((prev) => ({
        ...prev,
        [key]: { kind: "error", message: normalized.message, status },
      }));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="rounded-card bg-muted/80 px-1 py-1 hidden md:block">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label={tPages("goBack")}
              className="flex items-center justify-center rounded-ui p-1 text-muted-foreground hover:bg-muted"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          </div>
          <h1 className="text-2xl font-medium leading-relaxed text-foreground">
            {tNav("orders")}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {canExportOrders &&
          orders.length > 0 &&
          selectedIds.size > 0 &&
          !globalSelectActive ? (
            <button
              type="button"
              onClick={selectAllMatchingFilters}
              className="rounded-card border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted whitespace-nowrap"
            >
              {tPages("ordersExportSelectAllMatching")}
            </button>
          ) : null}
          {canExportOrders && someSelected && (
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={exportSubmitting}
              className="rounded-card border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-50 inline-flex items-center gap-2"
            >
              {exportSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
              ) : (
                <Download className="h-4 w-4 shrink-0" aria-hidden />
              )}
              {exportSubmitting ? tPages("ordersExportStarting") : tPages("ordersExportCsv")}
            </button>
          )}
          {someSelected && (
            <>
              <button
                type="button"
                onClick={handleBulkConfirmSendCourier}
                disabled={bulkDispatching || globalSelectActive}
                className="rounded-card border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-50"
              >
                {bulkDispatching
                  ? tPages("ordersSending")
                  : tPages("ordersConfirmSendCourier")}
              </button>
            </>
          )}
          <Link
            href="/orders/new"
            className="rounded-card bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            {tPages("addOrder")}
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {deliveryPillOptions.map((opt) => {
            const active = (filters.delivery_status || "") === opt.value;
            return (
              <button
                key={opt.value || "__all__"}
                type="button"
                onClick={() => setFilter("delivery_status", opt.value)}
                aria-pressed={active}
                className={[
                  "h-9 rounded-ui border px-3 text-sm font-medium transition whitespace-nowrap",
                  active
                    ? "border-primary/40 bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-muted",
                ].join(" ")}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 px-3"
          aria-label="Toggle filters"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <FunnelIcon className="size-4" aria-hidden />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {loading
          ? tCommon("loading")
          : totalOrdersCount === null
            ? tPages("ordersListCountPageOnly", { pageCount: pageOrdersCount })
            : tPages("ordersListCountWithTotal", {
                pageCount: pageOrdersCount,
                totalCount: totalOrdersCount,
              })}
      </p>

      {filtersOpen ? (
        <FilterBar>
          <FilterDropdown
            value={filters.status}
            onChange={(value) => setFilter("status", value)}
            placeholder="Action"
            options={ORDER_STATUS_OPTIONS.map((s) => ({
              value: s,
              label: formatOrderStatusLabel(s, (key) => tPages(key)),
            }))}
          />
          <FilterDropdown
            value={filters.flag}
            onChange={(value) => setFilter("flag", value)}
            placeholder="Flag"
            options={ORDER_FLAG_OPTIONS.map((f) => ({
              value: f,
              label: formatOrderFlagLabel(f),
            }))}
          />
          <FilterDropdown
            value={filters.date_range}
            onChange={(value) => setFilter("date_range", value)}
            placeholder={tPages("filtersDateRange")}
            options={[
              { value: "today", label: tPages("filtersToday") },
              {
                value: "last_7_days",
                label: tPages("filtersLast7Days"),
                labelDisplay: digitsInNumberFont(tPages("filtersLast7Days"), locale),
              },
              {
                value: "last_30_days",
                label: tPages("filtersLast30Days"),
                labelDisplay: digitsInNumberFont(tPages("filtersLast30Days"), locale),
              },
            ]}
          />
          <FilterDropdown
            value={filters.payment_status}
            onChange={(value) => setFilter("payment_status", value)}
            placeholder={tPages("filtersPaymentStatus")}
            options={ORDER_PAYMENT_STATUS_OPTIONS.map((s) => ({
              value: s,
              label: formatOrderPaymentStatusLabel(s, (key) => tPages(key)),
            }))}
          />
          <FilterDropdown
            value={filters.category}
            onChange={(value) => setFilter("category", value)}
            placeholder="Category"
            options={categoryOptions}
            className="min-w-[180px]"
          />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={tPages("filtersSearchOrders")}
            className="w-full md:w-72"
          />
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              clearFilters();
            }}
            className="h-9 rounded-ui border border-border px-3 text-sm hover:bg-muted"
          >
            {tPages("filtersClear")}
          </button>
        </FilterBar>
      ) : null}

      {globalSelectActive ? (
        <div className="rounded-card border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
          {tPages("ordersExportGlobalSelectionBanner")}
        </div>
      ) : null}

      {activeExportJobId && exportPoll ? (
        <div className="rounded-card border border-border bg-card p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{tPages("ordersExportTitle")}</p>
              <p className="text-xs text-muted-foreground break-all">{activeExportJobId}</p>
            </div>
            <button
              type="button"
              onClick={dismissExportPanel}
              className="shrink-0 text-xs text-muted-foreground hover:text-foreground underline"
            >
              {tPages("ordersExportDismiss")}
            </button>
          </div>
          {exportPoll.status === "PENDING" || exportPoll.status === "PROCESSING" ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                {exportPoll.status === "PENDING"
                  ? tPages("ordersExportStatusPending")
                  : tPages("ordersExportStatusProcessing")}
              </p>
              <div className="h-2 w-full rounded-xs bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-[width] duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, exportPoll.progress))}%` }}
                />
              </div>
              <p className={`text-xs tabular-nums ${numClass}`}>
                {toLocaleDigits(String(exportPoll.progress), locale)}%
              </p>
            </div>
          ) : null}
          {exportPoll.status === "COMPLETED" ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" onClick={handleExportDownload}>
                <Download className="h-4 w-4 mr-1.5" aria-hidden />
                {tPages("ordersExportDownload")}
              </Button>
              {exportPoll.expires_at ? (
                <span className="text-xs text-muted-foreground">
                  {tPages("ordersExportExpiresHint")}
                </span>
              ) : null}
            </div>
          ) : null}
          {exportPoll.status === "FAILED" ? (
            <p className="text-sm text-destructive">
              {exportPoll.error_message || tPages("ordersExportFailed")}
            </p>
          ) : null}
          {exportPoll.status === "EXPIRED" ? (
            <p className="text-sm text-muted-foreground">{tPages("ordersExportExpired")}</p>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <DashboardTableSkeleton columns={12} rows={5} showHeader={false} showFilters={false} />
      ) : (
        <>
          <div
            ref={setScrollContainer}
            className="overflow-x-auto rounded-card border border-card-border bg-card"
          >
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="form-checkbox"
                      aria-label={tPages("ordersListSelectAllAria")}
                    />
                  </th>
                  <th className="th">{tPages("ordersListColOrderNumber")}</th>
                  <th className="th">{tPages("ordersListColCustomer")}</th>
                  <th className="th">{tPages("ordersListColPhone")}</th>
                  <th className="th">Fraud Check</th>
                  <th className="th">Action</th>
                  <th className="th">Flag</th>
                  <th className="th">Delivery Status</th>
                  <th className="th">{tPages("ordersListColTotal")}</th>
                  <th className="th">{tPages("ordersListColPayment")}</th>
                  <th className="th">{tPages("ordersListConsignmentId")}</th>
                  <th className="th">{tPages("ordersListColDate")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.map((order) => {
                  const fraud = fraudByOrderId[order.public_id] || { kind: "idle" };

                  return (
                    <Fragment key={order.public_id}>
                      <ClickableTableRow
                        href={`/orders/${order.public_id}`}
                        aria-label={String(order.order_number)}
                      >
                        <td className="w-10 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={globalSelectActive || selectedIds.has(order.public_id)}
                            disabled={globalSelectActive}
                            onChange={() => toggleSelect(order.public_id)}
                            className="form-checkbox"
                            aria-label={tPages("ordersListSelectOrderAria", {
                              orderNumber: order.order_number,
                            })}
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <OrderPreviewTriggerButton
                              orderNumber={String(order.order_number)}
                              onClick={() =>
                                setPreviewOrder({
                                  public_id: order.public_id,
                                  order_number: String(order.order_number),
                                })
                              }
                            />
                            <span
                              className={`text-sm font-medium leading-none text-foreground ${numClass}`}
                            >
                              {order.order_number}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-foreground whitespace-nowrap">
                          {order.shipping_name || "—"}
                        </td>
                        <td className="px-4 py-3 text-foreground whitespace-nowrap">
                          {order.phone || "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <FraudCheckButton
                            loading={fraud.kind === "loading"}
                            disabled={!order.phone}
                            locked={!canFraudCheck}
                            onClick={() => handleFraudCheck(order)}
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="space-y-1">
                            {order.has_unavailable_products ? (
                              <p className="text-xs text-rose-600 dark:text-rose-400">
                                {formatOrderStatusLabel(order.status, (key) =>
                                  tPages(key)
                                )}{" "}
                                •{" "}
                                {(order.unavailable_products_count ?? 0) === 1
                                  ? "Product data corrupted."
                                  : `${order.unavailable_products_count} products data corrupted.`}
                              </p>
                            ) : (
                              <Select
                                className={`w-[180px] capitalize ${statusSelectToneClass(order.status)}`}
                                value={order.status}
                                disabled={
                                  order.status === "cancelled" ||
                                  statusUpdatingId === order.public_id
                                }
                                onChange={(e) =>
                                  handleRowStatusChange(order, e.target.value)
                                }
                                aria-label={tPages("ordersListStatusForOrderAria", {
                                  orderNumber: order.order_number,
                                })}
                              >
                                {ORDER_STATUS_OPTIONS.filter((s) => {
                                  // Prevent manually picking confirmed when a
                                  // payment-pending order still lacks verification;
                                  // admins must use the verify-payment action.
                                  if (
                                    s === "confirmed" &&
                                    order.status === "payment_pending" &&
                                    order.payment_status !== "verified"
                                  ) {
                                    return false;
                                  }
                                  return true;
                                }).map((s) => (
                                  <option key={s} value={s} style={statusOptionStyleFor(s)}>
                                    {formatOrderStatusLabel(s, (key) => tPages(key))}
                                  </option>
                                ))}
                              </Select>
                            )}
                            {!order.has_unavailable_products &&
                            (order.unavailable_products_count ?? 0) > 0 ? (
                              <p className="text-xs text-rose-600 dark:text-rose-400">
                                {formatOrderStatusLabel(order.status, (key) =>
                                  tPages(key)
                                )}{" "}
                                •{" "}
                                {(order.unavailable_products_count ?? 0) === 1
                                  ? "Product data corrupted."
                                  : `${order.unavailable_products_count} products data corrupted.`}
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Select
                            className={`w-[180px] ${flagSelectToneClass(order.flag as string)}`}
                            value={(order.flag || "") as string}
                            disabled={flagUpdatingId === order.public_id}
                            onChange={(e) =>
                              handleRowFlagChange(order, e.target.value)
                            }
                            aria-label={`Flag for order ${order.order_number}`}
                          >
                            <option value="" style={themedOptionBaseStyle()}>
                              {formatOrderFlagLabel(null)}
                            </option>
                            {ORDER_FLAG_OPTIONS.map((f) => (
                              <option key={f} value={f} style={flagOptionStyle(f)}>
                                {formatOrderFlagLabel(f)}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {deliveryStatusBadge(order)}
                        </td>
                        <td
                          className={`px-4 py-3 whitespace-nowrap text-foreground ${numClass}`}
                        >
                          {currencySymbol}
                          {Number(order.total).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-foreground">
                          {formatOrderPaymentStatusLabel(order.payment_status, (key) =>
                            tPages(key)
                          )}
                        </td>
                        <td
                          className={`px-4 py-3 text-muted-foreground whitespace-nowrap max-w-[220px] ${numClass}`}
                        >
                          {order.status === "confirmed" &&
                          !order.sent_to_courier &&
                          !order.courier_dispatch_pending ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1 px-2.5 text-xs"
                              disabled={courierSendingId === order.public_id}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSendToCourierRow(order);
                              }}
                              aria-label={tPages("ordersListSendCourierAria", {
                                orderNumber: order.order_number,
                              })}
                            >
                              <Truck className="size-3.5 shrink-0" />
                              {courierSendingId === order.public_id
                                ? tPages("ordersSending")
                                : tPages("ordersSendToCourier")}
                            </Button>
                          ) : order.courier_dispatch_pending ? (
                            <span className="text-muted-foreground text-xs">
                              {courierSendingId === order.public_id ||
                              order.courier_dispatch_pending
                                ? tPages("ordersSending")
                                : courierCell(order)}
                            </span>
                          ) : (
                            <span className="block truncate" title={courierCell(order)}>
                              {courierCell(order)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {formatDashboardDateTime(order.created_at, locale)}
                        </td>
                      </ClickableTableRow>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <OrderPreviewDialog
            open={Boolean(previewOrder)}
            onOpenChange={(open) => {
              if (!open) setPreviewOrder(null);
            }}
            orderPublicId={previewOrder?.public_id ?? null}
            orderNumber={previewOrder?.order_number ?? null}
          />

          <FraudCheckDialog
            open={Boolean(fraudDialogOrderId)}
            onOpenChange={(open) => {
              if (!open) setFraudDialogOrderId(null);
            }}
            phone={
              fraudDialogOrderId
                ? orders.find((o) => o.public_id === fraudDialogOrderId)?.phone
                : null
            }
            loading={
              fraudDialogOrderId
                ? (fraudByOrderId[fraudDialogOrderId]?.kind ?? "idle") === "loading"
                : false
            }
            response={
              fraudDialogOrderId && fraudByOrderId[fraudDialogOrderId]?.kind === "ready"
                ? (fraudByOrderId[fraudDialogOrderId] as { kind: "ready"; data: FraudCheckApiOk }).data
                    ?.response ?? null
                : null
            }
            warningText={
              fraudDialogOrderId &&
              fraudByOrderId[fraudDialogOrderId]?.kind === "ready" &&
              fraudStatus(
                (fraudByOrderId[fraudDialogOrderId] as { kind: "ready"; data: FraudCheckApiOk }).data
              ) === "limit_exceeded"
                ? fraudDetail(
                    (fraudByOrderId[fraudDialogOrderId] as { kind: "ready"; data: FraudCheckApiOk })
                      .data
                  ) ?? "Limit exceeded."
                : null
            }
            errorText={
              fraudDialogOrderId && fraudByOrderId[fraudDialogOrderId]?.kind === "error"
                ? (fraudByOrderId[fraudDialogOrderId] as { kind: "error"; message: string }).message
                : fraudDialogOrderId &&
                    fraudByOrderId[fraudDialogOrderId]?.kind === "ready" &&
                    fraudStatus(
                      (fraudByOrderId[fraudDialogOrderId] as { kind: "ready"; data: FraudCheckApiOk })
                        .data
                    ) === "error"
                  ? fraudDetail(
                      (fraudByOrderId[fraudDialogOrderId] as { kind: "ready"; data: FraudCheckApiOk })
                        .data
                    ) ?? "Fraud check failed."
                  : null
            }
          />

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!prevLink}
              onClick={() => setListCursor(cursorFromLink(prevLink))}
            >
              {tPages("supportTicketsPrevious")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!nextLink}
              onClick={() => setListCursor(cursorFromLink(nextLink))}
            >
              {tPages("supportTicketsNext")}
            </Button>
          </div>
        </>
      )}
      <BelowFoldScrollHint />
    </div>
  );
}
