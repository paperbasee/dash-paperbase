"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { toLocaleDigits } from "@/lib/locale-digits";
import { digitsInNumberFont, numberTextClass } from "@/lib/number-font";
import { Download, Loader2, Truck, Undo2 } from "lucide-react";
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
import {
  ORDER_STATUS_OPTIONS,
  formatOrderStatusLabel,
} from "@/lib/orders/order-statuses";
import {
  ORDER_PAYMENT_STATUS_OPTIONS,
  formatOrderPaymentStatusLabel,
} from "@/lib/orders/payment-statuses";
import { ORDER_FLAG_OPTIONS, formatOrderFlagLabel } from "@/lib/orders/order-flags";
import type { Order, PaginatedResponse } from "@/types";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { notify, normalizeError } from "@/notifications";

import { FraudCheckButton } from "./_components/FraudCheckButton";
import type { FraudCheckApiOk, FraudCheckState } from "./_components/types";
import { useFeatures } from "@/hooks/useFeatures";
import { useAuth } from "@/context/AuthContext";
import {
  canUserDeleteProducts,
  type MeForProductDeletePermission,
} from "@/lib/product-delete-permission";

const FraudCheckDialog = dynamic(
  () => import("./_components/FraudCheckDialog").then((mod) => mod.FraudCheckDialog),
  { ssr: false, loading: () => null }
);

type OrderExportPollResponse = {
  status: string;
  progress: number;
  download_url: string | null;
  expires_at: string | null;
  error_message?: string;
};

/**
 * When downloading a blob, the browser does not use the server's filename unless
 * we read `Content-Disposition` and set `<a download>`. Hardcoding a name overrides the API.
 */
function filenameFromContentDisposition(
  header: string | null | undefined,
  fallback: string
): string {
  if (!header || typeof header !== "string") return fallback;
  const star = /filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i.exec(header);
  if (star?.[1]) {
    const raw = star[1].trim().replace(/^["']|["']$/g, "");
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  const quoted = /filename\s*=\s*"((?:\\.|[^"])*)"/i.exec(header);
  if (quoted?.[1]) return quoted[1].replace(/\\(.)/g, "$1");
  const unquoted = /filename\s*=\s*([^;\s]+)/i.exec(header);
  if (unquoted?.[1]) return unquoted[1].replace(/^["']|["']$/g, "");
  return fallback;
}

/** Shown after dispatch: Steadfast consignment id only (not provider name). */
function courierCell(order: Order): string {
  if (!order.sent_to_courier) return "—";
  const c = (order.courier_consignment_id || "").trim();
  return c || "—";
}

export default function OrdersPage() {
  const router = useRouter();
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const tNav = useTranslations("nav");
  const tPages = useTranslations("pages");
  const { currencySymbol } = useBranding();
  const confirm = useConfirm();
  const { page, filters, setFilter, setPage, clearFilters } = useFilters([
    "customer",
    "status",
    "flag",
    "date_range",
    "payment_status",
    "search",
  ]);
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const debouncedSearch = useDebouncedValue(searchInput);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
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
  const { hasFeature } = useFeatures();
  const canFraudCheck = hasFeature("fraud_check");
  const { meProfile } = useAuth();
  const canExportOrders = Boolean(
    meProfile &&
      canUserDeleteProducts(meProfile as MeForProductDeletePermission)
  );

  const [globalSelectActive, setGlobalSelectActive] = useState(false);
  const [exportSubmitting, setExportSubmitting] = useState(false);
  const [activeExportJobId, setActiveExportJobId] = useState<string | null>(null);
  const [exportPoll, setExportPoll] = useState<OrderExportPollResponse | null>(null);

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

  const fetchOrders = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page };
    if (filters.customer) params.customer = filters.customer;
    if (filters.status) params.status = filters.status;
    if (filters.flag) params.flag = filters.flag;
    if (filters.date_range) params.date_range = filters.date_range;
    if (filters.payment_status) params.payment_status = filters.payment_status;
    if (filters.search) params.search = filters.search;
    api
      .get<PaginatedResponse<Order>>("admin/orders/", {
        params,
      })
      .then((res) => {
        setOrders(res.data.results);
        setCount(res.data.count);
        setHasNext(!!res.data.next);
      })
      .catch((err) => {
        console.error(err);
        notify.error(err);
      })
      .finally(() => setLoading(false));
  }, [
    filters.customer,
    filters.date_range,
    filters.flag,
    filters.payment_status,
    filters.search,
    filters.status,
    page,
  ]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setGlobalSelectActive(false);
  }, [
    filters.customer,
    filters.date_range,
    filters.flag,
    filters.payment_status,
    filters.search,
    filters.status,
  ]);

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
        console.error(e);
        if (!cancelled) notify.error(e, { fallbackMessage: tPages("ordersExportPollFailed") });
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
      notify.success(tPages("ordersExportStarted"));
    } catch (err) {
      console.error(err);
      notify.error(err, { fallbackMessage: tPages("ordersExportStartFailed") });
    } finally {
      setExportSubmitting(false);
    }
  }

  async function handleExportDownload() {
    const path = exportPoll?.download_url;
    if (!path) return;
    try {
      const res = await api.get<Blob>(path, { responseType: "blob" });
      // Cross-origin: Content-Disposition is hidden from JS unless the API sets
      // Access-Control-Expose-Headers (see api CORS). Prefer X-Export-Filename, then parse CD.
      const h = res.headers;
      const rawX =
        typeof h.get === "function" ? h.get("X-Export-Filename") : undefined;
      const xName = typeof rawX === "string" ? rawX.trim() : "";
      const cd =
        (typeof h.get === "function" && h.get("Content-Disposition")) ||
        (res.headers as { "content-disposition"?: string })["content-disposition"];
      const filename =
        xName ||
        filenameFromContentDisposition(
          typeof cd === "string" ? cd : undefined,
          ""
        ) ||
        "orders-export.csv";
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      notify.error(err, { fallbackMessage: tPages("ordersExportDownloadFailed") });
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
      const failedMsgs = results
        .filter((r) => !r.ok)
        .map(
          (r) =>
            `${r.public_id}: ${r.error || tPages("ordersBulkDispatchRowFailed")}`
        );
      if (summary.failed > 0) {
        notify.warning(
          tPages("ordersBulkDispatchSummary", {
            ok: toLocaleDigits(String(summary.ok), locale),
            failed: toLocaleDigits(String(summary.failed), locale),
            details: `${failedMsgs.slice(0, 8).join("\n")}${failedMsgs.length > 8 ? "\n…" : ""}`,
          })
        );
      }
      if (summary.ok > 0) notify.success(tPages("ordersConfirmSendCourier"));
      setSelectedIds(new Set());
      fetchOrders();
    } catch (err) {
      console.error(err);
      notify.error(err, { fallbackMessage: tPages("ordersBulkDispatchFailed") });
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
      console.error(e);
      notify.error(e, { fallbackMessage: tPages("orderDetailStatusUpdateFailed") });
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
      console.error(e);
      notify.error(e, { fallbackMessage: "Failed to update flag." });
    } finally {
      setFlagUpdatingId(null);
    }
  }

  async function handleSendToCourierRow(order: Order) {
    if (order.status !== "confirmed" || order.sent_to_courier) return;
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
      notify.error(normalized.message);
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
            {tNav("orders")} (
            <span className={numClass}>{toLocaleDigits(String(count), locale)}</span>)
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {canExportOrders &&
          count > 0 &&
          selectedIds.size > 0 &&
          !globalSelectActive ? (
            <button
              type="button"
              onClick={selectAllMatchingFilters}
              className="rounded-card border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted whitespace-nowrap"
            >
              {tPages("ordersExportSelectAllMatching", {
                count: toLocaleDigits(String(count), locale),
              })}
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

      <FilterBar>
        <FilterDropdown
          value={filters.status}
          onChange={(value) => setFilter("status", value)}
          placeholder={tPages("filtersStatus")}
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
              labelDisplay: digitsInNumberFont(
                tPages("filtersLast7Days"),
                locale
              ),
            },
            {
              value: "last_30_days",
              label: tPages("filtersLast30Days"),
              labelDisplay: digitsInNumberFont(
                tPages("filtersLast30Days"),
                locale
              ),
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

      {globalSelectActive ? (
        <div className="rounded-card border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
          {tPages("ordersExportGlobalSelectionBanner", {
            count: toLocaleDigits(String(count), locale),
          })}
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
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
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
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <>
          <div
            ref={setScrollContainer}
            className="overflow-x-auto rounded-card border border-dashed border-card-border bg-card"
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
                  <th className="th">{tPages("filtersStatus")}</th>
                  <th className="th">Flag</th>
                  <th className="th">{tPages("ordersListColTotal")}</th>
                  <th className="th">{tPages("ordersListConsignmentId")}</th>
                  <th className="th">{tPages("ordersListColPayment")}</th>
                  <th className="th">{tPages("ordersListColTransactionId")}</th>
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
                        <td
                          className={`px-4 py-3 whitespace-nowrap font-medium text-foreground ${numClass}`}
                        >
                          {order.order_number}
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
                              <p className="text-xs text-muted-foreground">
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
                                className="w-[180px] capitalize"
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
                                  <option key={s} value={s}>
                                    {formatOrderStatusLabel(s, (key) => tPages(key))}
                                  </option>
                                ))}
                              </Select>
                            )}
                            {!order.has_unavailable_products &&
                            (order.unavailable_products_count ?? 0) > 0 ? (
                              <p className="text-xs text-muted-foreground">
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
                            className="w-[180px]"
                            value={(order.flag || "") as string}
                            disabled={flagUpdatingId === order.public_id}
                            onChange={(e) =>
                              handleRowFlagChange(order, e.target.value)
                            }
                            aria-label={`Flag for order ${order.order_number}`}
                          >
                            <option value="">{formatOrderFlagLabel(null)}</option>
                            {ORDER_FLAG_OPTIONS.map((f) => (
                              <option key={f} value={f}>
                                {formatOrderFlagLabel(f)}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td
                          className={`px-4 py-3 whitespace-nowrap text-foreground ${numClass}`}
                        >
                          {currencySymbol}
                          {Number(order.total).toLocaleString()}
                        </td>
                        <td
                          className={`px-4 py-3 text-muted-foreground whitespace-nowrap max-w-[220px] ${numClass}`}
                        >
                          {order.status === "confirmed" && !order.sent_to_courier ? (
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
                          ) : (
                            <span className="block truncate" title={courierCell(order)}>
                              {courierCell(order)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap capitalize text-muted-foreground">
                          {formatOrderPaymentStatusLabel(
                            order.payment_status,
                            (key) => tPages(key),
                          )}
                        </td>
                        <td
                          className={`px-4 py-3 whitespace-nowrap text-muted-foreground ${numClass}`}
                        >
                          {order.transaction_id
                            ? order.transaction_id
                            : "—"}
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

          <div className="flex items-center justify-between">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="btn-page"
            >
              {tPages("supportTicketsPrevious")}
            </button>
            <span className="text-sm text-muted-foreground">
              {tPages("supportTicketsPageLabel", {
                page: toLocaleDigits(String(page), locale),
              })}
            </span>
            <button
              disabled={!hasNext}
              onClick={() => setPage(page + 1)}
              className="btn-page"
            >
              {tPages("supportTicketsNext")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
