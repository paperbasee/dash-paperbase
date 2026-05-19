"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { FunnelIcon, Undo2 } from "lucide-react";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { ClickableText } from "@/components/ui/clickable-text";
import { Input } from "@/components/ui/input";
import { FilterBar } from "@/components/filters/FilterBar";
import { FilterDropdown } from "@/components/filters/FilterDropdown";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useFilters } from "@/hooks/useFilters";
import { useSupportTicketsQuery } from "@/hooks/useSupportTicketsQuery";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import api from "@/lib/api";
import type { SupportTicket, PaginatedResponse } from "@/types";
import { formatDashboardDateTime } from "@/lib/datetime-display";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { notify } from "@/notifications";
import { Button } from "@/components/ui/button";
import {
  navCountsQueryKey,
  supportTicketDetailQueryKey,
  supportTicketsListQueryKey,
  type SupportTicketsListParams,
} from "@/lib/query-keys";

type EditableField = "status" | "priority" | "category";

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

const STATUS_I18N: Record<(typeof STATUS_OPTIONS)[number]["value"], string> = {
  new: "supportTicketsStatusNew",
  in_progress: "supportTicketsStatusInProgress",
  resolved: "supportTicketsStatusResolved",
  closed: "supportTicketsStatusClosed",
};

const PRIORITY_I18N: Record<(typeof PRIORITY_OPTIONS)[number]["value"], string> = {
  low: "supportTicketsPriorityLow",
  medium: "supportTicketsPriorityMedium",
  high: "supportTicketsPriorityHigh",
  urgent: "supportTicketsPriorityUrgent",
};

const CATEGORY_OPTIONS = [
  { value: "general", label: "General" },
  { value: "order", label: "Order" },
  { value: "payment", label: "Payment" },
  { value: "shipping", label: "Shipping" },
  { value: "product", label: "Product" },
  { value: "technical", label: "Technical" },
  { value: "other", label: "Other" },
] as const;

function InlineSelect({
  value,
  options,
  saving,
  widthClassName = "w-[120px]",
  onChange,
}: {
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  saving: boolean;
  widthClassName?: string;
  onChange: (next: string) => void;
}) {
  return (
    <Combobox
      value={value}
      disabled={saving}
      onValueChange={(next) => {
        if (!next || next === value) return;
        onChange(next);
      }}
    >
      <ComboboxInput
        placeholder=""
        showClear={false}
        className={widthClassName}
        inputClassName="cursor-pointer caret-transparent text-xs font-medium"
      />
      <ComboboxContent>
        <ComboboxList>
          {options.map((option) => (
            <ComboboxItem key={option.value} value={option.value}>
              <span className="text-xs font-medium">{option.label}</span>
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export default function SupportTicketsPage() {
  const locale = useLocale();
  const tPages = useTranslations("pages");
  const router = useRouter();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const { page, filters, setFilter, setPage, clearFilters } = useFilters([
    "status",
    "priority",
    "search",
  ]);
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const debouncedSearch = useDebouncedValue(searchInput);
  const [saving, setSaving] = useState<Record<string, Partial<Record<EditableField, boolean>>>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const tCommon = useTranslations("common");

  const statusOptionsTranslated = STATUS_OPTIONS.map((o) => ({
    value: o.value,
    label: tPages(STATUS_I18N[o.value]),
  }));

  const priorityOptionsTranslated = PRIORITY_OPTIONS.map((o) => ({
    value: o.value,
    label: tPages(PRIORITY_I18N[o.value]),
  }));

  const priorityPillOptions = [
    { value: "", label: tCommon("all") },
    ...PRIORITY_OPTIONS.map((o) => ({
      value: o.value,
      label: tPages(PRIORITY_I18N[o.value]),
    })),
  ];

  const filtersActive = Boolean(
    (filters.search || "").trim() ||
      (filters.status || "").trim() ||
      (filters.priority || "").trim(),
  );

  useEffect(() => {
    setSearchInput(filters.search || "");
  }, [filters.search]);

  useEffect(() => {
    if (!filtersActive) setFiltersOpen(false);
  }, [filters.search, filters.status, filters.priority]);

  useEffect(() => {
    const next = debouncedSearch.trim();
    if (next === (filters.search || "")) return;
    setFilter("search", next);
  }, [debouncedSearch, filters.search, setFilter]);

  const listParams = useMemo((): SupportTicketsListParams => {
    const params: SupportTicketsListParams = { page };
    if (filters.status) params.status = filters.status;
    if (filters.priority) params.priority = filters.priority;
    if (filters.search) params.search = filters.search;
    return params;
  }, [page, filters.status, filters.priority, filters.search]);

  const { data, isLoading, isError, error } = useSupportTicketsQuery(listParams);

  const tickets = data?.results ?? [];
  const count = data?.count ?? 0;
  const hasNext = !!data?.next;
  const loading = isLoading;

  const invalidateSupportTicketsCaches = useCallback(
    (ticketPublicId?: string) => {
      void queryClient.invalidateQueries({ queryKey: supportTicketsListQueryKey() });
      void queryClient.invalidateQueries({ queryKey: navCountsQueryKey });
      if (ticketPublicId) {
        void queryClient.invalidateQueries({
          queryKey: supportTicketDetailQueryKey(ticketPublicId),
        });
      }
    },
    [queryClient],
  );

  const patchTicketsList = useCallback(
    (updater: (results: SupportTicket[]) => SupportTicket[]) => {
      queryClient.setQueryData(
        supportTicketsListQueryKey(listParams),
        (old: PaginatedResponse<SupportTicket> | undefined) => {
          if (!old) return old;
          return { ...old, results: updater(old.results) };
        },
      );
    },
    [queryClient, listParams],
  );

  useEffect(() => {
    if (!isError || !error) return;
    notify.error(error, {
      title: tPages("toastTitleTicketsFailedToLoad"),
      fallbackMessage: tPages("toastDescTicketsFailedToLoad"),
    });
  }, [isError, error, tPages]);

  async function handleDelete(publicId: string) {
    const ok = await confirm({
      title: tPages("confirmDialogTitleDeleteTicket"),
      message: tPages("supportTicketsConfirmDeleteOne"),
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`admin/support-tickets/${publicId}/`);
      patchTicketsList((prev) => prev.filter((t) => t.public_id !== publicId));
      queryClient.setQueryData(
        supportTicketsListQueryKey(listParams),
        (old: PaginatedResponse<SupportTicket> | undefined) => {
          if (!old) return old;
          return { ...old, count: Math.max(0, (old.count ?? 0) - 1) };
        },
      );
      invalidateSupportTicketsCaches(publicId);
      notify.success(tPages("toastDescTicketDeleted"), {
        title: tPages("toastTitleTicketDeleted"),
      });
    } catch (err) {
      notify.error(err, {
        title: tPages("toastTitleTicketNotDeleted"),
        fallbackMessage: tPages("toastDescTicketNotDeleted"),
      });
    }
  }

  async function handleInlineChange(
    publicId: string,
    field: EditableField,
    nextValue: string
  ) {
    const previous = tickets.find((ticket) => ticket.public_id === publicId);
    if (!previous || previous[field] === nextValue) return;

    setErrors((prev) => ({ ...prev, [publicId]: "" }));
    patchTicketsList((prev) =>
      prev.map((ticket) =>
        ticket.public_id === publicId ? { ...ticket, [field]: nextValue } : ticket,
      ),
    );
    setSaving((prev) => ({
      ...prev,
      [publicId]: {
        ...(prev[publicId] || {}),
        [field]: true,
      },
    }));

    try {
      await api.patch(`admin/support-tickets/${publicId}/`, { [field]: nextValue });
      invalidateSupportTicketsCaches(publicId);
    } catch (err) {
      patchTicketsList((prev) =>
        prev.map((ticket) =>
          ticket.public_id === publicId ? { ...ticket, [field]: previous[field] } : ticket,
        ),
      );
      setErrors((prev) => ({
        ...prev,
        [publicId]: tPages("supportTicketsUpdateFailed", { field }),
      }));
      notify.error(err, {
        title: tPages("toastTitleTicketUpdateFailed"),
        fallbackMessage: tPages("toastDescTicketUpdateFailed"),
      });
    } finally {
      setSaving((prev) => ({
        ...prev,
        [publicId]: {
          ...(prev[publicId] || {}),
          [field]: false,
        },
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
            {tPages("supportTicketsTitle")}
          </h1>
        </div>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 flex-wrap min-w-0">
          {priorityPillOptions.map((opt) => {
            const active = (filters.priority || "") === opt.value;
            return (
              <button
                key={opt.value || "__all__"}
                type="button"
                onClick={() => setFilter("priority", opt.value)}
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
          className="h-9 shrink-0 self-start px-3"
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
          : tPages("supportTicketsListCountWithTotal", {
              pageCount: tickets.length,
              totalCount: count,
            })}
      </p>

      {filtersOpen ? (
        <FilterBar>
          <FilterDropdown
            value={filters.status}
            onChange={(value) => setFilter("status", value)}
            placeholder={tPages("filtersStatus")}
            options={statusOptionsTranslated}
          />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={tPages("filtersSearchTickets")}
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

      {!loading ? (
        <>
          <div className="overflow-x-auto rounded-card border border-card-border bg-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="th">{tPages("supportTicketsCustomer")}</th>
                  <th className="th">{tPages("supportTicketsPhone")}</th>
                  <th className="th">{tPages("supportTicketsSubject")}</th>
                  <th className="th">{tPages("supportTicketsStatus")}</th>
                  <th className="th">{tPages("supportTicketsPriority")}</th>
                  <th className="th">{tPages("supportTicketsCategory")}</th>
                  <th className="th">{tPages("supportTicketsDate")}</th>
                  <th className="th">{tPages("supportTicketsActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {tickets.map((ticket) => (
                  <ClickableTableRow
                    key={ticket.public_id}
                    href={`/support-tickets/${ticket.public_id}`}
                    aria-label={ticket.name}
                  >
                    <td className="px-4 py-3">
                      <div className="min-w-[180px]">
                        <span className="font-medium text-foreground">{ticket.name}</span>
                        {errors[ticket.public_id] ? (
                          <p className="mt-1 text-xs text-destructive">
                            {errors[ticket.public_id]}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      {ticket.phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-foreground max-w-[260px] truncate">
                      {ticket.subject || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <InlineSelect
                        value={ticket.status}
                        options={statusOptionsTranslated}
                        saving={!!saving[ticket.public_id]?.status}
                        widthClassName="w-[120px]"
                        onChange={(next) =>
                          handleInlineChange(ticket.public_id, "status", next)
                        }
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <InlineSelect
                        value={ticket.priority}
                        options={priorityOptionsTranslated}
                        saving={!!saving[ticket.public_id]?.priority}
                        widthClassName="w-[120px]"
                        onChange={(next) =>
                          handleInlineChange(ticket.public_id, "priority", next)
                        }
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <InlineSelect
                        value={ticket.category}
                        options={CATEGORY_OPTIONS}
                        saving={!!saving[ticket.public_id]?.category}
                        widthClassName="w-[130px]"
                        onChange={(next) =>
                          handleInlineChange(ticket.public_id, "category", next)
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDashboardDateTime(ticket.created_at, locale)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <ClickableText
                          variant="destructive"
                          onClick={() => handleDelete(ticket.public_id)}
                          className="text-sm"
                        >
                          {tPages("supportTicketsDelete")}
                        </ClickableText>
                      </div>
                      {(saving[ticket.public_id]?.status ||
                        saving[ticket.public_id]?.priority ||
                        saving[ticket.public_id]?.category) && (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {tPages("supportTicketsSaving")}
                        </span>
                      )}
                    </td>
                  </ClickableTableRow>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="btn-page"
            >
              {tPages("supportTicketsPrevious")}
            </button>
            <span className="text-sm text-muted-foreground">
              {tPages("supportTicketsPageLabel", { page })}
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
      ) : null}
    </div>
  );
}
