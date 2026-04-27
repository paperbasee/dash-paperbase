"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Select } from "@/components/ui/select";
import { useActivities } from "@/hooks/useActivities";
import { formatDashboardDateTimeWithSeconds } from "@/lib/datetime-display";
import { DashboardTableSkeleton } from "@/components/skeletons/dashboard-skeletons";

const ACTION_BADGE_STYLES: Record<string, string> = {
  create: "bg-emerald-600 text-white dark:bg-emerald-500",
  update: "bg-sky-600 text-white dark:bg-sky-500",
  delete: "bg-rose-600 text-white dark:bg-rose-500",
  custom: "bg-violet-600 text-white dark:bg-violet-500",
  remaining: "bg-amber-500 text-black dark:bg-amber-400",
};

const formatActivityText = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const ACTION_PAST_TENSE: Record<string, string> = {
  create: "created",
  update: "updated",
  delete: "deleted",
  custom: "updated",
};

const formatActivityHeader = (summary: string, entityType: string, action: string) => {
  const actionKey = action.toLowerCase();
  const pastAction = ACTION_PAST_TENSE[actionKey] ?? actionKey;
  const normalizedPrefix = `${formatActivityText(entityType)} ${pastAction}`;

  const summaryWithoutExtraDetails = summary.replace(/:\s*.+$/, "").trim();
  if (
    summaryWithoutExtraDetails.length > 0 &&
    summaryWithoutExtraDetails.toLowerCase() === normalizedPrefix.toLowerCase()
  ) {
    return normalizedPrefix;
  }

  const cleanedSummary = summary
    .replace(/\s*#\S+/g, "")
    .replace(/:\s*.+$/, "")
    .trim();

  if (cleanedSummary.length > 0) {
    return cleanedSummary;
  }

  return `${formatActivityText(entityType)} ${pastAction}`;
};

export default function ActivitiesPage() {
  const locale = useLocale();
  const tPages = useTranslations("pages");
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");

  const entityOptions = useMemo(
    () =>
      [
        { value: "", label: tPages("activitiesEntityAll") },
        { value: "product", label: tPages("activitiesEntityProduct") },
        { value: "product_variant", label: tPages("activitiesEntityProductVariant") },
        { value: "product_attribute", label: tPages("activitiesEntityProductAttribute") },
        {
          value: "product_attribute_value",
          label: tPages("activitiesEntityProductAttributeValue"),
        },
        { value: "category", label: tPages("activitiesEntityCategory") },
        { value: "order", label: tPages("activitiesEntityOrder") },
        { value: "customer", label: tPages("activitiesEntityCustomer") },
        { value: "blog", label: tPages("activitiesEntityBlog") },
        { value: "blog_tag", label: tPages("activitiesEntityBlogTag") },
        { value: "banner", label: tPages("activitiesEntityBanner") },
        { value: "notification", label: tPages("activitiesEntityNotification") },
        { value: "support_ticket", label: tPages("activitiesEntitySupportTicket") },
        { value: "courier", label: tPages("activitiesEntityCourier") },
        {
          value: "marketing_integration",
          label: tPages("activitiesEntityMarketingIntegration"),
        },
      ] as const,
    [tPages],
  );

  const actionOptions = useMemo(
    () =>
      [
        { value: "", label: tPages("activitiesActionAll") },
        { value: "create", label: tPages("activitiesActionCreate") },
        { value: "update", label: tPages("activitiesActionUpdate") },
        { value: "delete", label: tPages("activitiesActionDelete") },
        { value: "custom", label: tPages("activitiesActionCustom") },
      ] as const,
    [tPages],
  );

  const filters = useMemo(
    () => ({
      page,
      entity_type: entityType || undefined,
      action: action || undefined,
    }),
    [page, entityType, action],
  );

  const { data, loading, error } = useActivities(filters);

  const results = data?.results ?? [];
  const count = data?.count ?? 0;
  const hasNext = !!data?.next;

  const onChangeType = (next: string) => {
    setEntityType(next);
    setPage(1);
  };

  const onChangeAction = (next: string) => {
    setAction(next);
    setPage(1);
  };

  const getActionBadgeClassName = (nextAction: string) =>
    ACTION_BADGE_STYLES[nextAction.toLowerCase()] ?? "bg-slate-600 text-white dark:bg-slate-500";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-medium text-foreground">
            {tPages("activitiesTitle")}
            {count > 0 ? ` ${tPages("activitiesCountInParens", { count })}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground md:hidden">
            {tPages("activitiesSubtitle")}
          </p>
        </div>
      </div>

      <p className="hidden text-sm text-muted-foreground md:block">
        {tPages("activitiesSubtitle")}
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <Select
          value={entityType}
          onChange={(e) => onChangeType(e.target.value)}
          className="w-full min-w-0 sm:w-[280px]"
          aria-label={tPages("activitiesFilterTypeAria")}
        >
          {entityOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>

        <Select
          value={action}
          onChange={(e) => onChangeAction(e.target.value)}
          className="w-full sm:w-[180px]"
          aria-label={tPages("activitiesFilterActionAria")}
        >
          {actionOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <DashboardTableSkeleton columns={3} rows={5} showHeader={false} showFilters={false} />
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tPages("activitiesEmpty")}</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-card border border-border bg-muted/30">
            <div className="divide-y divide-border/60">
                {results.map((item) => (
                  <div key={item.public_id} className="bg-card px-4 py-4 text-sm md:px-5">
                    <div className="flex items-start">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-start justify-between gap-3">
                          <span
                            className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${getActionBadgeClassName(
                              item.action,
                            )}`}
                          >
                            {formatActivityText(item.action)}
                          </span>
                          <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground inline-flex items-center gap-1.5">
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              className="h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="9" />
                              <path d="M12 7v5l3 2" />
                            </svg>
                            {formatDashboardDateTimeWithSeconds(item.created_at, locale)}
                          </span>
                        </div>
                        <div className="font-medium text-foreground">
                          {formatActivityHeader(item.summary, item.entity_type, item.action)}
                          {item.actor ? ` by ${item.actor.full_name || item.actor.email}` : ""}
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          {formatActivityText(item.entity_type)}
                          {item.entity_id ? ` #${item.entity_id}` : ""}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
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
              {tPages("activitiesPage", { page })}
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

