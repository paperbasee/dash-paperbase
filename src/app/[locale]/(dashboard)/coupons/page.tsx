"use client";

/**
 * Discount codes.
 *
 * The list is the page: a merchant's questions are "what am I running", "is
 * anyone using it" and "what has it cost me", and all three are columns.
 * Writing one is a small form above the table rather than a second screen —
 * a code is six fields, and a round trip to another page to type six fields
 * is a round trip too many.
 *
 * Switching a code off is the ordinary way to end a campaign. Deleting is
 * offered too and is safe: the code and the amount are copied onto each order
 * at placement, so a finished campaign can be cleared away without touching
 * the orders it produced.
 */

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { numberTextClass } from "@/lib/number-font";
import { formatDashboardDate } from "@/lib/datetime-display";
import { notify } from "@/notifications";
import { usePermissions } from "@/context/PermissionsContext";
import {
  useCouponsQuery,
  useDeleteCoupon,
  useSaveCoupon,
} from "@/hooks/useCouponsQuery";
import type { Coupon, CouponWrite } from "@/types";
import { useOpenFromAddress } from "@/hooks/useOpenFromAddress";
import { OPEN_NEW } from "@/lib/open-from-address";

const BLANK: CouponWrite = { code: "", kind: "fixed", value: "" };

export default function CouponsPage() {
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const t = useTranslations("pages");
  const { has } = usePermissions();
  const canManage = has("coupons.manage");

  const { data, isLoading, isError, error } = useCouponsQuery();
  const save = useSaveCoupon();
  const remove = useDeleteCoupon();

  const [draft, setDraft] = useState<CouponWrite>(BLANK);
  const [open, setOpen] = useState(false);
  // The code being edited, or null while writing a new one. One form for both:
  // a campaign is six fields, and a separate edit screen would be the same six
  // fields with a different heading.
  const [editing, setEditing] = useState<string | null>(null);

  const coupons = useMemo(() => data ?? [], [data]);

  // A search result names the code to open (`?open=`): in the form for someone who may change
  // it, as the list's own Edit is; the list alone for the rest. The sidebar's Add new menu asks
  // for a blank form (`?open=new`).
  useOpenFromAddress(!isLoading, (publicId) => {
    if (publicId === OPEN_NEW) {
      if (canManage) startNew();
      return canManage;
    }
    const coupon = coupons.find((row) => row.public_id === publicId);
    if (coupon && canManage) startEdit(coupon);
    return Boolean(coupon);
  });

  useEffect(() => {
    if (!isError || !error) return;
    notify.error(error, { title: t("couponsFailedToLoad") });
  }, [isError, error, t]);

  function startEdit(coupon: Coupon) {
    setEditing(coupon.public_id);
    setOpen(true);
    setDraft({
      code: coupon.code,
      kind: coupon.kind,
      value: coupon.value,
      min_spend: coupon.min_spend,
      usage_limit: coupon.usage_limit,
      per_customer_limit: coupon.per_customer_limit,
      expires_at: coupon.expires_at,
    });
  }

  function startNew() {
    setEditing(null);
    setDraft(BLANK);
    setOpen(true);
  }

  function cancel() {
    setEditing(null);
    setDraft(BLANK);
    setOpen(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    save.mutate(
      {
        publicId: editing ?? undefined,
        body: { ...draft, code: (draft.code || "").trim() },
      },
      {
        onSuccess: () => {
          cancel();
          notify.success(t("couponSaved"));
        },
        onError: (err) => notify.error(err, { title: t("couponSaveFailed") }),
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-medium leading-relaxed text-foreground">
          {t("couponsTitle")}
        </h1>
        {canManage ? (
          <Button
            type="button"
            size="sm"
            onClick={() => (open ? cancel() : setOpen(true))}
          >
            {open ? t("couponCancel") : t("couponNew")}
          </Button>
        ) : null}
      </div>

      <p className="max-w-prose text-sm text-muted-foreground">
        {t("couponsIntro")}
      </p>

      {open && canManage ? (
        <form
          onSubmit={submit}
          className="grid gap-3 rounded-card border border-card-border bg-card p-4 md:grid-cols-4"
        >
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t("couponCode")}
            <Input
              value={draft.code ?? ""}
              onChange={(e) => setDraft({ ...draft, code: e.target.value })}
              placeholder="EID100"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t("couponKind")}
            <select
              value={draft.kind}
              onChange={(e) =>
                setDraft({ ...draft, kind: e.target.value as CouponWrite["kind"] })
              }
              className="h-9 rounded-ui border border-border bg-background px-2 text-sm"
            >
              <option value="fixed">{t("couponKindFixed")}</option>
              <option value="percent">{t("couponKindPercent")}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t("couponValue")}
            <Input
              value={draft.value ?? ""}
              onChange={(e) => setDraft({ ...draft, value: e.target.value })}
              inputMode="decimal"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t("couponMinSpend")}
            <Input
              value={draft.min_spend ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, min_spend: e.target.value || null })
              }
              inputMode="decimal"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t("couponUsageLimit")}
            <Input
              value={draft.usage_limit ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  usage_limit: e.target.value ? Number(e.target.value) : null,
                })
              }
              inputMode="numeric"
              placeholder={t("couponUnlimited")}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t("couponPerCustomerLimit")}
            <Input
              value={draft.per_customer_limit ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  per_customer_limit: e.target.value ? Number(e.target.value) : null,
                })
              }
              inputMode="numeric"
              placeholder={t("couponUnlimited")}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t("couponExpires")}
            <Input
              type="date"
              value={(draft.expires_at ?? "").slice(0, 10)}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  expires_at: e.target.value ? `${e.target.value}T23:59:59Z` : null,
                })
              }
            />
          </label>
          <div className="flex items-end gap-2">
            <Button type="submit" size="sm" disabled={save.isPending}>
              {save.isPending
                ? t("couponSaving")
                : editing
                  ? t("couponSaveChanges")
                  : t("couponCreate")}
            </Button>
            {editing ? (
              <button
                type="button"
                onClick={cancel}
                className="h-9 rounded-ui border border-border px-3 text-sm hover:bg-muted"
              >
                {t("couponCancel")}
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("couponsLoading")}</p>
      ) : coupons.length === 0 ? (
        <div className="rounded-card border border-card-border bg-card py-12 text-center text-sm text-muted-foreground">
          {t("couponsEmpty")}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-card-border bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="th">{t("couponCode")}</th>
                <th className="th">{t("couponValue")}</th>
                <th className="th">{t("couponTimesUsed")}</th>
                <th className="th">{t("couponTotalDiscount")}</th>
                <th className="th">{t("couponExpires")}</th>
                <th className="th">{t("couponStatus")}</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {coupons.map((c) => (
                <tr key={c.public_id}>
                  <td className="px-4 py-3 font-medium text-foreground">{c.code}</td>
                  <td className={`px-4 py-3 text-muted-foreground ${numClass}`}>
                    {c.kind === "percent" ? `${c.value}%` : c.value}
                  </td>
                  <td className={`px-4 py-3 text-muted-foreground ${numClass}`}>
                    {c.times_used}
                    {c.usage_limit ? ` / ${c.usage_limit}` : ""}
                  </td>
                  <td className={`px-4 py-3 text-muted-foreground ${numClass}`}>
                    {c.total_discount}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.expires_at
                      ? formatDashboardDate(c.expires_at, locale)
                      : t("couponNoExpiry")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        c.is_active
                          ? "rounded-tooltip bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary"
                          : "rounded-tooltip bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                      }
                    >
                      {c.is_active ? t("couponActive") : t("couponOff")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManage ? (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                          onClick={() => startEdit(c)}
                        >
                          {t("couponEdit")}
                        </button>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                          onClick={() =>
                            save.mutate({
                              publicId: c.public_id,
                              body: { is_active: !c.is_active },
                            })
                          }
                        >
                          {c.is_active ? t("couponSwitchOff") : t("couponSwitchOn")}
                        </button>
                        <button
                          type="button"
                          className="text-xs text-destructive underline underline-offset-4"
                          onClick={() => {
                            if (window.confirm(t("couponDeleteConfirm", { code: c.code }))) {
                              remove.mutate(c.public_id);
                            }
                          }}
                        >
                          {t("couponDelete")}
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
