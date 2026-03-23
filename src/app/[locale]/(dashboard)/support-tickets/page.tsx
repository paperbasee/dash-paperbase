"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Undo2 } from "lucide-react";
import { ClickableText } from "@/components/ui/clickable-text";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import api from "@/lib/api";
import type { SupportTicket, PaginatedResponse } from "@/types";

type EditableField = "status" | "priority" | "category";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
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

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => n.toString().padStart(2, "0");
  const datePart = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const timePart = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return `${datePart}, ${timePart}`;
}

export default function SupportTicketsPage() {
  const tPages = useTranslations("pages");
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [saving, setSaving] = useState<Record<string, Partial<Record<EditableField, boolean>>>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    api
      .get<PaginatedResponse<SupportTicket>>("admin/support-tickets/", {
        params: { page },
      })
      .then((res) => {
        setTickets(res.data.results);
        setCount(res.data.count);
        setHasNext(!!res.data.next);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  async function handleDelete(publicId: string) {
    if (!confirm(tPages("supportTicketsConfirmDeleteOne"))) return;
    try {
      await api.delete(`admin/support-tickets/${publicId}/`);
      setTickets((prev) => prev.filter((t) => t.public_id !== publicId));
      setCount((c) => c - 1);
    } catch (err) {
      console.error(err);
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
    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.public_id === publicId ? { ...ticket, [field]: nextValue } : ticket
      )
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
    } catch (err) {
      console.error(err);
      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.public_id === publicId ? { ...ticket, [field]: previous[field] } : ticket
        )
      );
      setErrors((prev) => ({
        ...prev,
        [publicId]: tPages("supportTicketsUpdateFailed", { field }),
      }));
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
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-muted/80 px-1 py-1">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={tPages("goBack")}
            className="flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <Undo2 className="h-4 w-4" />
          </button>
        </div>
        <h1 className="text-2xl font-medium text-foreground">
          {tPages("supportTicketsTitle")} ({count})
        </h1>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-dashed border-card-border bg-card">
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
                  <tr key={ticket.public_id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="min-w-[180px]">
                        <ClickableText
                          href={`/support-tickets/${ticket.public_id}`}
                          className="font-medium"
                        >
                          {ticket.name}
                        </ClickableText>
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
                        options={STATUS_OPTIONS}
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
                        options={PRIORITY_OPTIONS}
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
                      {formatDateTime(ticket.created_at)}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="btn-page"
            >
              {tPages("supportTicketsPrevious")}
            </button>
            <span className="text-sm text-muted-foreground">
              {tPages("supportTicketsPageLabel", { page })}
            </span>
            <button
              disabled={!hasNext}
              onClick={() => setPage((p) => p + 1)}
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
