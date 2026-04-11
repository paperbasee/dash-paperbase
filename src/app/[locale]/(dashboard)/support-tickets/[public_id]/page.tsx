"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { Undo2 } from "lucide-react";
import api from "@/lib/api";
import type { SupportTicket } from "@/types";
import { formatDashboardDateTime } from "@/lib/datetime-display";

function labelFromValue(value: string): string {
  if (!value) return "—";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function SupportTicketDetailPage() {
  const locale = useLocale();
  const tPages = useTranslations("pages");
  const router = useRouter();
  const params = useParams<{ public_id: string }>();
  const publicId = params.public_id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ticket, setTicket] = useState<SupportTicket | null>(null);

  const fetchTicket = useCallback(() => {
    if (!publicId) return;
    api
      .get<SupportTicket>(`admin/support-tickets/${publicId}/`)
      .then((res) => setTicket(res.data))
      .catch(() => setError(tPages("supportTicketDetailLoadError")))
      .finally(() => setLoading(false));
  }, [publicId, tPages]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const attachmentCount = useMemo(() => ticket?.attachments?.length ?? 0, [ticket]);

  return (
    <div className="space-y-6">
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
        <h1 className="text-2xl font-medium text-foreground">
          {tPages("supportTicketDetailTitle")}
        </h1>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-card border border-dashed border-card-border bg-card p-6 text-sm text-destructive">
          {error}
        </div>
      ) : !ticket ? (
        <div className="rounded-card border border-dashed border-card-border bg-card p-6 text-sm text-muted-foreground">
          {tPages("supportTicketDetailNotFound")}
        </div>
      ) : (
        <>
          <section className="rounded-card border border-dashed border-card-border bg-card p-6">
            <h2 className="mb-4 text-lg font-medium text-foreground">
              {tPages("supportTicketDetailCustomerInfo")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">{tPages("supportTicketDetailName")}:</span>{" "}
                {ticket.name || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">{tPages("supportTicketDetailEmail")}:</span>{" "}
                {ticket.email || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">{tPages("supportTicketDetailPhone")}:</span>{" "}
                {ticket.phone || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">
                  {tPages("supportTicketDetailOrderNumber")}:
                </span>{" "}
                {ticket.order_number || "—"}
              </p>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-card border border-dashed border-card-border bg-card p-4">
              <p className="text-sm text-muted-foreground">{tPages("supportTicketsStatus")}</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {labelFromValue(ticket.status)}
              </p>
            </div>
            <div className="rounded-card border border-dashed border-card-border bg-card p-4">
              <p className="text-sm text-muted-foreground">{tPages("supportTicketsPriority")}</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {labelFromValue(ticket.priority)}
              </p>
            </div>
            <div className="rounded-card border border-dashed border-card-border bg-card p-4">
              <p className="text-sm text-muted-foreground">{tPages("supportTicketsCategory")}</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {labelFromValue(ticket.category)}
              </p>
            </div>
            <div className="rounded-card border border-dashed border-card-border bg-card p-4">
              <p className="text-sm text-muted-foreground">{tPages("supportTicketDetailCreatedAt")}</p>
              <p className="mt-1 text-base font-medium text-foreground">
                {formatDashboardDateTime(ticket.created_at, locale)}
              </p>
            </div>
          </section>

          <section className="rounded-card border border-dashed border-card-border bg-card p-6">
            <h2 className="mb-3 text-lg font-medium text-foreground">
              {tPages("supportTicketsSubject")}
            </h2>
            <p className="text-sm text-foreground">{ticket.subject || "—"}</p>
          </section>

          <section className="rounded-card border border-dashed border-card-border bg-card p-6">
            <h2 className="mb-3 text-lg font-medium text-foreground">
              {tPages("supportTicketDetailMessage")}
            </h2>
            <div className="rounded-card bg-muted p-4 text-sm text-foreground whitespace-pre-wrap">
              {ticket.message || "—"}
            </div>
          </section>

          <section className="rounded-card border border-dashed border-card-border bg-card p-6">
            <h2 className="mb-3 text-lg font-medium text-foreground">
              {tPages("supportTicketDetailAttachments", { count: attachmentCount })}
            </h2>
            {attachmentCount === 0 ? (
              <p className="text-sm text-muted-foreground">
                {tPages("supportTicketDetailNoAttachments")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-3 py-2">{tPages("supportTicketDetailFile")}</th>
                      <th className="px-3 py-2">{tPages("supportTicketDetailUploadedAt")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {ticket.attachments.map((attachment) => (
                      <ClickableTableRow
                        key={attachment.public_id}
                        onNavigate={() =>
                          window.open(
                            attachment.file,
                            "_blank",
                            "noopener,noreferrer"
                          )
                        }
                        aria-label={attachment.public_id}
                      >
                        <td className="px-3 py-2 font-medium text-foreground">
                          {attachment.public_id}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatDashboardDateTime(attachment.created_at, locale)}
                        </td>
                      </ClickableTableRow>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-card border border-dashed border-card-border bg-card p-6">
            <h2 className="mb-3 text-lg font-medium text-foreground">
              {tPages("supportTicketDetailInternalNotes")}
            </h2>
            <div className="rounded-card bg-muted p-4 text-sm text-foreground whitespace-pre-wrap">
              {ticket.internal_notes || "—"}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
