"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { toLocaleDigits } from "@/lib/locale-digits";
import { numberTextClass } from "@/lib/number-font";
import { Undo2, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { formatDashboardDateTime } from "@/lib/datetime-display";
import type { PaginatedResponse, TrashEntityType, TrashItem } from "@/types";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { notify, normalizeError } from "@/notifications";
import { useAdminDeleteCapabilities } from "@/hooks/useAdminDeleteCapabilities";
import { DashboardTableSkeleton } from "@/components/skeletons/dashboard-skeletons";

export default function TrashPage() {
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const tPages = useTranslations("pages");
  const tNav = useTranslations("nav");
  const { canDelete, loading: capsLoading } = useAdminDeleteCapabilities();
  const confirm = useConfirm();
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<TrashItem[]>([]);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkRestoring, setBulkRestoring] = useState(false);

  const isOrderRow = useCallback((row: TrashItem) => row.entity_type === "order", []);

  const typeLabel = useCallback(
    (t: TrashEntityType) =>
      t === "order" ? tPages("trashTypeOrder") : tPages("trashTypeProduct"),
    [tPages],
  );

  const fetchTrash = useCallback(() => {
    if (!canDelete) {
      setLoading(false);
      setRows([]);
      setCount(0);
      setHasNext(false);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .get<PaginatedResponse<TrashItem>>("admin/trash/", { params: { page } })
      .then((res) => {
        setRows(res.data.results ?? []);
        setCount(res.data.count ?? 0);
        setHasNext(!!res.data.next);
      })
      .catch((err: unknown) => {
        const norm = normalizeError(err, tPages("trashLoadError"));
        if (
          err &&
          typeof err === "object" &&
          "response" in err &&
          (err as { response?: { status?: number } }).response?.status === 403
        ) {
          setError(tPages("trashForbidden"));
        } else {
          setError(norm.message);
        }
        setRows([]);
        setCount(0);
        setHasNext(false);
      })
      .finally(() => setLoading(false));
  }, [canDelete, page, tPages]);

  useEffect(() => {
    if (capsLoading) return;
    fetchTrash();
  }, [capsLoading, fetchTrash]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pageIds = rows.map((r) => r.id);
    const allOnPage =
      pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPage) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const allSelected =
    rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const someSelected = selectedIds.size > 0;

  const bulkBusy = bulkDeleting || bulkRestoring;

  async function handleRestoreSelected() {
    if (selectedIds.size === 0) return;
    const n = selectedIds.size;
    const ok = await confirm({
      title: tPages("confirmDialogTitleRestoreFromTrashBulk", {
        count: n,
      }),
      message: tPages("trashBulkConfirmRestore", {
        count: n,
      }),
      variant: "default",
    });
    if (!ok) return;
    setBulkRestoring(true);
    const ids = Array.from(selectedIds);
    try {
      // Sequential: parallel restores each run sync_product_stock_cache(select_for_update on
      // all store products/inventory) and can deadlock the DB.
      for (const id of ids) {
        const row = rows.find((r) => r.id === id);
        if (row && isOrderRow(row)) continue;
        await api.post(`admin/trash/${id}/restore/`);
      }
      setSelectedIds(new Set());
      notify.success(
        tPages("trashBulkRestoreSuccess", {
          count: toLocaleDigits(String(n), locale),
        })
      );
      fetchTrash();
    } catch (err) {
      console.error(err);
      notify.error(err, { fallbackMessage: tPages("trashRestoreFailed") });
    } finally {
      setBulkRestoring(false);
    }
  }

  async function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    const n = selectedIds.size;
    const ok = await confirm({
      title: tPages("confirmDialogTitleDeleteFromTrashBulk", {
        count: n,
      }),
      message: tPages("trashBulkConfirmPermanent", {
        count: n,
      }),
      variant: "danger",
    });
    if (!ok) return;
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    try {
      for (const id of ids) {
        const row = rows.find((r) => r.id === id);
        if (row && isOrderRow(row)) continue;
        await api.delete(`admin/trash/${id}/`);
      }
      setSelectedIds(new Set());
      notify.warning(
        tPages("trashBulkRemovedSuccess", {
          count: toLocaleDigits(String(n), locale),
        })
      );
      fetchTrash();
    } catch (err) {
      console.error(err);
      notify.error(err, { fallbackMessage: tPages("trashPermanentFailed") });
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleRestore(row: TrashItem) {
    if (isOrderRow(row)) return;
    const ok = await confirm({
      title: tPages("confirmDialogTitleRestoreFromTrash", {
        type: typeLabel(row.entity_type),
      }),
      message: tPages("trashConfirmRestore", { type: typeLabel(row.entity_type) }),
      variant: "default",
    });
    if (!ok) return;
    setBusyId(row.id);
    try {
      await api.post(`admin/trash/${row.id}/restore/`);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
      notify.success(tPages("trashRestoredSuccess"));
      fetchTrash();
    } catch (err) {
      console.error(err);
      notify.error(err, { fallbackMessage: tPages("trashRestoreFailed") });
    } finally {
      setBusyId(null);
    }
  }

  async function handlePermanentDelete(row: TrashItem) {
    if (isOrderRow(row)) return;
    const ok = await confirm({
      title: tPages("confirmDialogTitleDeleteFromTrashRow"),
      message: tPages("trashConfirmPermanent"),
      variant: "danger",
    });
    if (!ok) return;
    setBusyId(row.id);
    try {
      await api.delete(`admin/trash/${row.id}/`);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
      notify.warning(tPages("trashRemovedSuccess"));
      fetchTrash();
    } catch (err) {
      console.error(err);
      notify.error(err, { fallbackMessage: tPages("trashPermanentFailed") });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-card bg-muted/80 px-1 py-1 hidden md:block">
            <Link
              href="/"
              className="flex items-center justify-center rounded-ui p-1 text-muted-foreground hover:bg-muted"
              aria-label={tPages("goBack")}
            >
              <Undo2 className="h-4 w-4" />
            </Link>
          </div>
          <div>
            <h1 className="text-2xl font-medium text-foreground">{tNav("trash")}</h1>
          </div>
        </div>
        {canDelete && someSelected && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRestoreSelected}
              disabled={bulkBusy || busyId !== null}
              className="shrink-0 rounded-card border border-border bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:bg-secondary/80 disabled:opacity-50"
            >
              {bulkRestoring
                ? tPages("trashRestoring")
                : tPages("trashRestoreSelected", {
                    count: toLocaleDigits(String(selectedIds.size), locale),
                  })}
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={bulkBusy || busyId !== null}
              className="shrink-0 rounded-card bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive/90 disabled:opacity-50"
            >
              {bulkDeleting
                ? tPages("deleting")
                : tPages("deleteSelectedPermanent", {
                    count: toLocaleDigits(String(selectedIds.size), locale),
                  })}
            </button>
          </div>
        )}
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {tPages("trashSubtitle")}
      </p>

      {!capsLoading && !canDelete ? (
        <p className="text-sm text-muted-foreground">{tPages("trashForbidden")}</p>
      ) : loading ? (
        <DashboardTableSkeleton columns={7} rows={5} showHeader={false} showFilters={false} />
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tPages("trashEmpty")}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-card border border-dashed border-card-border bg-card">
            <table className="w-max min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="w-10 whitespace-nowrap px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      disabled={bulkBusy || busyId !== null}
                      className="form-checkbox"
                      aria-label={tPages("trashListSelectAllAria")}
                    />
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 font-medium">{tPages("trashColType")}</th>
                  <th className="whitespace-nowrap px-3 py-3 font-medium">{tPages("trashColName")}</th>
                  <th className="whitespace-nowrap px-3 py-3 font-medium">{tPages("trashColPublicId")}</th>
                  <th className="whitespace-nowrap px-3 py-3 font-medium">{tPages("trashColDeleted")}</th>
                  <th className="whitespace-nowrap px-3 py-3 font-medium">{tPages("trashColExpires")}</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right font-medium">{tPages("trashColActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((row) => {
                  const pub = (row.entity_public_id || "").trim();
                  const busy = busyId === row.id;
                  const displayName = (row.entity_name || "").trim();
                  return (
                    <tr key={row.id} className="hover:bg-muted/40">
                      <td className="w-10 whitespace-nowrap px-3 py-3 align-middle">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={() => toggleSelect(row.id)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={bulkBusy || busy}
                          className="form-checkbox"
                          aria-label={tPages("trashListSelectRowAria", {
                            name: displayName || pub || String(row.id),
                          })}
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 align-middle">{typeLabel(row.entity_type)}</td>
                      <td
                        className="whitespace-nowrap px-3 py-3 align-middle text-foreground"
                        title={displayName}
                      >
                        {displayName || "—"}
                      </td>
                      <td
                        className={`whitespace-nowrap px-3 py-3 align-middle text-xs text-muted-foreground ${numClass}`}
                      >
                        {pub || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 align-middle text-muted-foreground">
                        {formatDashboardDateTime(row.deleted_at, locale)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 align-middle text-muted-foreground">
                        {formatDashboardDateTime(row.expires_at, locale)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right align-middle">
                        <div className="flex flex-nowrap items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="shrink-0 whitespace-nowrap"
                            disabled={busy || bulkBusy || isOrderRow(row)}
                            onClick={() => handleRestore(row)}
                          >
                            <Undo2 className="mr-1 size-3.5 shrink-0" />
                            {tPages("trashRestore")}
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="shrink-0 whitespace-nowrap"
                            disabled={busy || bulkBusy || isOrderRow(row)}
                            onClick={() => handlePermanentDelete(row)}
                          >
                            <Trash2 className="mr-1 size-3.5 shrink-0" />
                            {tPages("trashPermanentDelete")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              <span className={numClass}>{toLocaleDigits(String(count), locale)}</span>{" "}
              {count === 1 ? tPages("trashCountSingular") : tPages("trashCountPlural")}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {tPages("trashPrev")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasNext || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                {tPages("trashNext")}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
