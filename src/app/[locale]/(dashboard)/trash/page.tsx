"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { DeferredNavLink } from "@/components/navigation/DeferredNavLink";
import { toLocaleDigits } from "@/lib/locale-digits";
import { numberTextClass } from "@/lib/number-font";
import { Loader2, Undo2, Trash } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { formatDashboardDateTime } from "@/lib/datetime-display";
import type { TrashItem } from "@/types";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { notify, normalizeError } from "@/notifications";
import { useAdminDeleteCapabilities } from "@/hooks/useAdminDeleteCapabilities";
import { useTrashQuery } from "@/hooks/useTrashQuery";
import {
  navCountsQueryKey,
  ordersListQueryKeyRoot,
  productsListQueryKeyRoot,
  trashQueryKey,
} from "@/lib/query-keys";

function rowKey(row: TrashItem): string {
  return row.public_id;
}

export default function TrashPage() {
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const tPages = useTranslations("pages");
  const tNav = useTranslations("nav");
  const { canViewTrash, canManageTrash, loading: capsLoading } =
    useAdminDeleteCapabilities();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);

  const invalidateTrashCaches = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: trashQueryKey(page) });
    void queryClient.invalidateQueries({ queryKey: productsListQueryKeyRoot });
    void queryClient.invalidateQueries({ queryKey: ordersListQueryKeyRoot });
    void queryClient.invalidateQueries({ queryKey: navCountsQueryKey });
  }, [queryClient, page]);
  const trashEnabled = !capsLoading && canViewTrash;
  const {
    data: trashData,
    isLoading: trashLoading,
    isError: trashIsError,
    error: trashError,
  } = useTrashQuery(page, trashEnabled);

  const rows = canViewTrash ? (trashData?.results ?? []) : [];
  const count = canViewTrash ? (trashData?.count ?? 0) : 0;
  const hasNext = canViewTrash ? (trashData?.hasNext ?? false) : false;
  const loading = capsLoading || (trashEnabled && trashLoading);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trashEnabled) {
      setError(null);
      return;
    }
    if (!trashIsError || !trashError) {
      setError(null);
      return;
    }
    const err = trashError;
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
  }, [trashEnabled, trashIsError, trashError, tPages]);
  const [busyPublicId, setBusyPublicId] = useState<string | null>(null);
  const [selectedPublicIds, setSelectedPublicIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkRestoring, setBulkRestoring] = useState(false);

  const toggleSelect = (publicId: string) => {
    setSelectedPublicIds((prev) => {
      const next = new Set(prev);
      if (next.has(publicId)) next.delete(publicId);
      else next.add(publicId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pageIds = rows.map((r) => r.public_id);
    const allOnPage =
      pageIds.length > 0 && pageIds.every((id) => selectedPublicIds.has(id));
    setSelectedPublicIds((prev) => {
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
    rows.length > 0 && rows.every((r) => selectedPublicIds.has(r.public_id));
  const someSelected = selectedPublicIds.size > 0;

  const bulkBusy = bulkDeleting || bulkRestoring;

  async function handleRestoreSelected() {
    if (selectedPublicIds.size === 0) return;
    const n = selectedPublicIds.size;
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
    const ids = Array.from(selectedPublicIds);
    try {
      for (const publicId of ids) {
        await api.post(`admin/trash/${publicId}/restore/`);
      }
      setSelectedPublicIds(new Set());
      notify.success(tPages("toastDescAllItemsRestored"), {
        title: tPages("toastTitleAllItemsRestored"),
      });
      invalidateTrashCaches();
    } catch (err) {
      notify.error(err, {
        title: tPages("toastTitleRestoreFailed"),
        fallbackMessage: tPages("toastDescRestoreFailed"),
      });
    } finally {
      setBulkRestoring(false);
    }
  }

  async function handleDeleteSelected() {
    if (selectedPublicIds.size === 0) return;
    const n = selectedPublicIds.size;
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
    const ids = Array.from(selectedPublicIds);
    try {
      for (const publicId of ids) {
        await api.delete(`admin/trash/${publicId}/`);
      }
      setSelectedPublicIds(new Set());
      notify.success(tPages("toastDescTrashEmptied"), {
        title: tPages("toastTitleTrashEmptied"),
      });
      invalidateTrashCaches();
    } catch (err) {
      notify.error(err, {
        title: tPages("toastTitleTrashNotEmptied"),
        fallbackMessage: tPages("toastDescTrashNotEmptied"),
      });
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleRestore(row: TrashItem) {
    const ok = await confirm({
      title: tPages("confirmDialogTitleRestoreFromTrash", {
        type: tPages("trashTypeProduct"),
      }),
      message: tPages("trashConfirmRestore", { type: tPages("trashTypeProduct") }),
      variant: "default",
    });
    if (!ok) return;
    setBusyPublicId(row.public_id);
    try {
      await api.post(`admin/trash/${row.public_id}/restore/`);
      setSelectedPublicIds((prev) => {
        const next = new Set(prev);
        next.delete(row.public_id);
        return next;
      });
      notify.success(tPages("toastDescItemRestored"), {
        title: tPages("toastTitleItemRestored"),
      });
      invalidateTrashCaches();
    } catch (err) {
      notify.error(err, {
        title: tPages("toastTitleRestoreFailed"),
        fallbackMessage: tPages("toastDescRestoreFailed"),
      });
    } finally {
      setBusyPublicId(null);
    }
  }

  async function handlePermanentDelete(row: TrashItem) {
    const ok = await confirm({
      title: tPages("confirmDialogTitleDeleteFromTrashRow"),
      message: tPages("trashConfirmPermanent"),
      variant: "danger",
    });
    if (!ok) return;
    setBusyPublicId(row.public_id);
    try {
      await api.delete(`admin/trash/${row.public_id}/`);
      setSelectedPublicIds((prev) => {
        const next = new Set(prev);
        next.delete(row.public_id);
        return next;
      });
      notify.success(tPages("toastDescPermanentlyDeleted"), {
        title: tPages("toastTitlePermanentlyDeleted"),
      });
      invalidateTrashCaches();
    } catch (err) {
      notify.error(err, {
        title: tPages("toastTitleDeletionFailed"),
        fallbackMessage: tPages("toastDescDeletionFailed"),
      });
    } finally {
      setBusyPublicId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-card bg-muted/80 px-1 py-1 hidden md:block">
            <DeferredNavLink
              href="/"
              className="flex items-center justify-center rounded-ui p-1 text-muted-foreground hover:bg-muted"
              aria-label={tPages("goBack")}
            >
              <Undo2 className="h-4 w-4" />
            </DeferredNavLink>
          </div>
          <div>
            <h1 className="text-2xl font-medium text-foreground">{tNav("trash")}</h1>
          </div>
        </div>
        {canManageTrash && someSelected && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRestoreSelected}
              disabled={bulkBusy || busyPublicId !== null}
              className="inline-flex shrink-0 items-center gap-2 rounded-card border border-border bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:bg-secondary/80 disabled:opacity-50"
            >
              {bulkRestoring && <Loader2 className="size-4 animate-spin" />}
              {tPages("trashRestoreSelected", {
                count: toLocaleDigits(String(selectedPublicIds.size), locale),
              })}
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={bulkBusy || busyPublicId !== null}
              className="inline-flex shrink-0 items-center gap-2 rounded-card bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive/90 disabled:opacity-50"
            >
              {bulkDeleting && <Loader2 className="size-4 animate-spin" />}
              {tPages("deleteSelectedPermanent", {
                count: toLocaleDigits(String(selectedPublicIds.size), locale),
              })}
            </button>
          </div>
        )}
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {tPages("trashSubtitle")}
      </p>

      {!capsLoading && !canViewTrash ? (
        <p className="text-sm text-muted-foreground">{tPages("trashForbidden")}</p>
      ) : !loading && error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : !loading && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tPages("trashEmpty")}</p>
      ) : !loading ? (
        <>
          <div className="overflow-x-auto rounded-card border border-card-border bg-card">
            <table className="w-max min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="w-10 whitespace-nowrap px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      disabled={bulkBusy || busyPublicId !== null}
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
                  const pub = (row.public_id || "").trim();
                  const busy = busyPublicId === row.public_id;
                  const displayName = (row.name || "").trim();
                  const rk = rowKey(row);
                  return (
                    <tr key={rk} className="hover:bg-muted/40">
                      <td className="w-10 whitespace-nowrap px-3 py-3 align-middle">
                        <input
                          type="checkbox"
                          checked={selectedPublicIds.has(row.public_id)}
                          onChange={() => toggleSelect(row.public_id)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={bulkBusy || busy}
                          className="form-checkbox"
                          aria-label={tPages("trashListSelectRowAria", {
                            name: displayName || pub || rk,
                          })}
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 align-middle">{tPages("trashTypeProduct")}</td>
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
                        {formatDashboardDateTime(row.trashed_at, locale)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 align-middle text-muted-foreground">
                        {formatDashboardDateTime(row.expires_at, locale)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right align-middle">
                        {canManageTrash ? (
                          <div className="flex flex-nowrap items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="shrink-0 whitespace-nowrap"
                              disabled={busy || bulkBusy}
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
                              disabled={busy || bulkBusy}
                              onClick={() => handlePermanentDelete(row)}
                            >
                              {busy ? (
                                <Loader2 className="mr-1 size-3.5 shrink-0 animate-spin" />
                              ) : (
                                <Trash className="mr-1 size-3.5 shrink-0" />
                              )}
                              {tPages("trashPermanentDelete")}
                            </Button>
                          </div>
                        ) : null}
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
      ) : null}
    </div>
  );
}
