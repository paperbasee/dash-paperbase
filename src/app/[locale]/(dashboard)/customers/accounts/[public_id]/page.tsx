"use client";

// One shopper account, opened from its row on the Accounts tab.
//
// Shaped like the customer detail page beside it, because a merchant clicking a
// row on either tab should land on the same kind of screen. The differences are
// the ones that are real: an account has identities rather than a phone, and
// its orders are only the ones placed while signed in.
//
// Read-only, like the list. There is nothing to edit here and no delete: these
// are a shopper's credentials.

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useDeferredNavigate } from "@/hooks/useDeferredNavigate";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClickableText } from "@/components/ui/clickable-text";
import { useCustomerAccountDetailQuery } from "@/hooks/useCustomerAccountDetailQuery";
import { formatDashboardDateTime } from "@/lib/datetime-display";
import { numberTextClass } from "@/lib/number-font";
import { notify } from "@/notifications";
import { PageHint } from "@/components/page/PageHint";

function asCurrency(value: string | number) {
  const number = Number(value ?? "0");
  if (Number.isNaN(number)) return String(value ?? "");
  return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function CustomerAccountDetailPage() {
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const tPages = useTranslations("pages");
  const tHints = useTranslations("pageHints");
  const router = useRouter();
  const navigate = useDeferredNavigate();
  const params = useParams<{ public_id: string }>();
  const publicId = params.public_id;

  const { data, isLoading, isError, error } = useCustomerAccountDetailQuery(
    publicId ?? ""
  );

  useEffect(() => {
    if (!isError || !error) return;
    notify.error(error, {
      title: tPages("toastTitleCustomerAccountUnavailable"),
      fallbackMessage: tPages("toastDescCustomerAccountUnavailable"),
    });
  }, [isError, error, tPages]);

  if (isLoading && !data) return null;

  if (!data) {
    return (
      <p className="text-muted-foreground">
        {tPages("toastDescCustomerAccountUnavailable")}
      </p>
    );
  }

  const stats: { label: string; value: string }[] = [
    {
      label: tPages("customerAccountsListColSignedInOrders"),
      value: String(data.analytics.total_orders),
    },
    {
      label: tPages("customerDetailsTotalSpent"),
      value: asCurrency(data.analytics.total_spent),
    },
    {
      label: tPages("customerAccountDetailsAverageOrder"),
      value: asCurrency(data.analytics.average_order_value),
    },
    {
      label: tPages("customerDetailsFirstOrderDate"),
      value: data.analytics.first_order_at
        ? formatDashboardDateTime(data.analytics.first_order_at, locale)
        : "—",
    },
    {
      label: tPages("customerDetailsLastOrderDate"),
      value: data.analytics.last_order_at
        ? formatDashboardDateTime(data.analytics.last_order_at, locale)
        : "—",
    },
    {
      label: tPages("customerAccountsListColLastSeen"),
      value: data.account.last_seen_at
        ? formatDashboardDateTime(data.account.last_seen_at, locale)
        : "—",
    },
  ];

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
        <div className="flex min-w-0 items-center gap-1.5">
          <h1 className="text-2xl font-medium leading-relaxed text-foreground">
            {tPages("customerAccountDetailsTitle")}
          </h1>
          <PageHint>{tHints("accountDetail")}</PageHint>
        </div>
      </div>

      <section className="rounded-card border border-card-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-medium">
            {tPages("customerDetailsBasicInfo")}
          </h2>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              void navigate(`/orders?account=${encodeURIComponent(publicId)}`)
            }
          >
            {tPages("customerDetailsViewOrders")}
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">
              {tPages("customerDetailsName")}:
            </span>{" "}
            {data.account.name || "—"}
          </p>
          <p>
            <span className="text-muted-foreground">
              {tPages("customerDetailsEmail")}:
            </span>{" "}
            {data.account.email ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">
              {tPages("customersListColJoined")}:
            </span>{" "}
            {formatDashboardDateTime(data.account.created_at, locale)}
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-card border border-card-border bg-card p-4"
          >
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${numClass}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-card border border-card-border bg-card p-6">
        <h2 className="mb-4 text-lg font-medium">
          {tPages("customerAccountDetailsSignInMethods")}
        </h2>
        {data.identities.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tPages("customerAccountDetailsNoSignInMethods")}
          </p>
        ) : (
          <ul className="m-0 list-none space-y-3 p-0 text-sm">
            {data.identities.map((identity) => (
              <li
                key={`${identity.provider}:${identity.identifier}`}
                className="flex flex-wrap items-baseline justify-between gap-3"
              >
                <span className="font-medium text-foreground">
                  {identity.identifier}
                </span>
                <span className="text-muted-foreground">
                  {identity.verified_at
                    ? tPages("customerAccountDetailsVerifiedOn", {
                        date: formatDashboardDateTime(
                          identity.verified_at,
                          locale
                        ),
                      })
                    : tPages("customerAccountDetailsUnverified")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-card border border-card-border bg-card p-6">
        <h2 className="mb-4 text-lg font-medium">
          {tPages("customerAccountDetailsSaved")}
        </h2>
        {data.saved_items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tPages("customerAccountDetailsNothingSaved")}
          </p>
        ) : (
          <ul className="m-0 list-none space-y-3 p-0 text-sm">
            {data.saved_items.map((item) => (
              <li
                key={`${item.product_public_id}:${item.variant_public_id ?? ""}`}
                className="flex flex-wrap items-baseline justify-between gap-3"
              >
                <ClickableText
                  href={`/products/${item.product_public_id}`}
                  className="font-medium text-foreground"
                >
                  {item.product_name}
                </ClickableText>
                <span className="text-muted-foreground">
                  {formatDashboardDateTime(item.saved_at, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        {tPages("customerAccountsOnlySignedInOrders")}
      </p>
    </div>
  );
}
