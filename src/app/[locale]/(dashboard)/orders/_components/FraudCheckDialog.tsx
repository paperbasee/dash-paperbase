"use client";

import { useMemo } from "react";
import { AlertTriangle, Clock, Loader2, RefreshCw } from "lucide-react";
import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { CourierLogo, normalizeCourierKey } from "./CourierItem";
import type { FraudRisk, PhoneHistory } from "./types";

type Summary = {
  total: number | null;
  success: number | null;
  cancelled: number | null;
  successRatioPct: number | null;
};

type CourierRow = {
  name: string;
  logoUrl: string | null;
  total: number | null;
  success: number | null;
  cancelled: number | null;
  successRatioPct: number | null;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;
    const n = Number(s.replace(/%/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function clampPct(value: number | null): number | null {
  if (value === null) return null;
  return Math.max(0, Math.min(100, value));
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (k in obj) return obj[k];
  }
  return undefined;
}

function unwrapResponse(response: unknown): unknown {
  if (!response || typeof response !== "object") return response;
  const obj = response as Record<string, unknown>;
  // BD Courier example: { status, data: { ... }, reports: [...] }
  if (obj && typeof obj.data === "object" && obj.data !== null) {
    return obj.data;
  }
  return response;
}

function parseSummary(response: unknown): Summary {
  const unwrapped = unwrapResponse(response);
  if (!unwrapped || typeof unwrapped !== "object") {
    return { total: null, success: null, cancelled: null, successRatioPct: null };
  }
  const obj = unwrapped as Record<string, unknown>;

  // Preferred: data.summary
  const summaryObjRaw = obj.summary;
  const summaryObj =
    summaryObjRaw && typeof summaryObjRaw === "object"
      ? (summaryObjRaw as Record<string, unknown>)
      : obj;

  const total = toNumber(
    pick(summaryObj, ["total_parcel", "totalParcel", "total_orders", "totalOrders", "total"])
  );
  const success = toNumber(
    pick(summaryObj, [
      "success_parcel",
      "successParcel",
      "success",
      "successful_deliveries",
      "successfulDeliveries",
      "delivered",
    ])
  );
  const cancelled = toNumber(
    pick(summaryObj, [
      "cancelled_parcel",
      "cancelledParcel",
      "cancelled",
      "returns",
      "return",
    ])
  );

  const ratioRaw = pick(summaryObj, [
    "success_ratio",
    "successRatio",
    "success_rate",
    "successRate",
  ]);
  const ratio = clampPct(toNumber(ratioRaw));

  const computedRatio =
    ratio !== null
      ? ratio
      : total && success !== null
        ? clampPct((success / total) * 100)
        : null;

  return {
    total,
    success,
    cancelled,
    successRatioPct: computedRatio,
  };
}

function parseCouriers(response: unknown): CourierRow[] {
  const unwrapped = unwrapResponse(response);
  if (!unwrapped || typeof unwrapped !== "object") return [];
  const obj = unwrapped as Record<string, unknown>;

  // BD Courier example shape: data.{pathao, steadfast, ..., summary}
  if (!("couriers" in obj) && !("breakdown" in obj) && !("courier_breakdown" in obj)) {
    return Object.entries(obj)
      .filter(([key, _val]) => key !== "summary")
      .map(([key, val]) => {
        if (!val || typeof val !== "object") return null;
        const v = val as Record<string, unknown>;
        const name = String(pick(v, ["name"]) || key).trim();
        const logoUrl = String(pick(v, ["logo"]) || "").trim() || null;
        const total = toNumber(pick(v, ["total_parcel", "total", "totalOrders"]));
        const success = toNumber(
          pick(v, ["success_parcel", "success", "successful_deliveries", "delivered"])
        );
        const cancelled = toNumber(pick(v, ["cancelled_parcel", "cancelled", "returns"]));
        const ratio = clampPct(toNumber(pick(v, ["success_ratio", "successRatio", "successRate"])));
        const computed =
          ratio !== null
            ? ratio
            : total && success !== null
              ? clampPct((success / total) * 100)
              : null;
        return { name, logoUrl, total, success, cancelled, successRatioPct: computed };
      })
      .filter(Boolean) as CourierRow[];
  }

  const breakdown = pick(obj, [
    "couriers",
    "courier_breakdown",
    "courierBreakdown",
    "breakdown",
  ]);
  if (!breakdown) return [];

  if (Array.isArray(breakdown)) {
    return breakdown
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const it = item as Record<string, unknown>;
        const name = String(pick(it, ["name", "provider", "courier"]) || "").trim();
        if (!name) return null;
        const logoUrl = String(pick(it, ["logo"]) || "").trim() || null;
        const total = toNumber(pick(it, ["total", "total_parcel", "totalOrders"]));
        const success = toNumber(pick(it, ["success", "successful_deliveries", "delivered"]));
        const cancelled = toNumber(pick(it, ["cancelled", "returns"]));
        const ratio = clampPct(toNumber(pick(it, ["success_ratio", "successRatio", "successRate", "ratio"])));
        const computed =
          ratio !== null
            ? ratio
            : total && success !== null
              ? clampPct((success / total) * 100)
              : null;
        return { name, logoUrl, total, success, cancelled, successRatioPct: computed };
      })
      .filter(Boolean) as CourierRow[];
  }

  if (typeof breakdown === "object") {
    const b = breakdown as Record<string, unknown>;
    return Object.entries(b)
      .map(([key, val]) => {
        const name = String(key || "").trim();
        if (!name) return null;
        if (!val || typeof val !== "object") {
          return { name, logoUrl: null, total: null, success: null, cancelled: null, successRatioPct: null };
        }
        const v = val as Record<string, unknown>;
        const logoUrl = String(pick(v, ["logo"]) || "").trim() || null;
        const total = toNumber(pick(v, ["total", "total_parcel", "totalOrders"]));
        const success = toNumber(pick(v, ["success", "successful_deliveries", "delivered"]));
        const cancelled = toNumber(pick(v, ["cancelled", "returns"]));
        const ratio = clampPct(toNumber(pick(v, ["success_ratio", "successRatio", "successRate", "ratio"])));
        const computed =
          ratio !== null
            ? ratio
            : total && success !== null
              ? clampPct((success / total) * 100)
              : null;
        return { name, logoUrl, total, success, cancelled, successRatioPct: computed };
      })
      .filter(Boolean) as CourierRow[];
  }

  return [];
}

function ratioColor(ratioPct: number | null): string {
  if (ratioPct === null) return "text-muted-foreground";
  if (ratioPct > 80) return "text-emerald-600";
  if (ratioPct >= 50) return "text-amber-600";
  return "text-red-600";
}

function ratioBarClass(ratioPct: number | null): string {
  if (ratioPct === null) return "bg-muted";
  if (ratioPct > 80) return "bg-emerald-500";
  if (ratioPct >= 50) return "bg-amber-500";
  return "bg-red-500";
}

type TileProps = {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "danger";
};

function Tile({ label, value, tone = "neutral" }: TileProps) {
  const toneCls =
    tone === "success"
      ? "border-emerald-600/30 bg-emerald-950/10 text-emerald-700"
      : tone === "danger"
        ? "border-red-600/30 bg-red-950/10 text-red-700"
        : "border-border bg-card text-foreground";
  return (
    <div className={cn("rounded-card border px-3 py-2", toneCls)}>
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xl font-semibold leading-tight">{value}</div>
    </div>
  );
}

/** A fraud report another merchant filed, as the provider passes it on: what, by which courier, when. */
export type FraudReport = { details: string; courier: string; reportedAt: string };

/** The provider's reports (engine/apps/fraud_check/bdcourier_client.py), or none. */
export function parseReports(response: unknown): FraudReport[] {
  if (!response || typeof response !== "object") return [];
  const raw = (response as Record<string, unknown>).reports;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const r = item as Record<string, unknown>;
      const details = typeof r.details === "string" ? r.details.trim() : "";
      if (!details) return null;
      return {
        details,
        courier: typeof r.courier === "string" ? r.courier : "",
        reportedAt: typeof r.reported_at === "string" ? r.reported_at : "",
      };
    })
    .filter((r): r is FraudReport => r !== null);
}

/** What other merchants reported about this number, through the provider. */
export function ReportsPanel({ reports }: { reports: FraudReport[] }) {
  const t = useTranslations("fraudCheck");
  const locale = useLocale();
  const day = (iso: string) => {
    const when = new Date(iso);
    return Number.isNaN(when.getTime())
      ? ""
      : when.toLocaleDateString(locale === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  };
  return (
    <div className="rounded-card border border-red-600/30 bg-red-950/5 px-3 py-2">
      <div className="text-xs font-semibold text-red-700">{t("reportsTitle", { count: reports.length })}</div>
      <ul className="mt-2 space-y-1.5">
        {reports.map((report, index) => (
          <li key={index} className="text-sm text-foreground">
            <span>{report.details}</span>
            {report.courier || report.reportedAt ? (
              <span className="text-xs text-muted-foreground">
                {" · "}
                {[report.courier, day(report.reportedAt)].filter(Boolean).join(" · ")}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

const ADVICE_TONE: Record<FraudRisk["level"], string> = {
  safe: "border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  caution: "border-amber-600/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  new: "border-amber-600/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  risky: "border-red-600/30 bg-red-500/10 text-red-800 dark:text-red-300",
};

const ADVICE_KEYS: Record<FraudRisk["level"], { name: string; advice: string }> = {
  safe: { name: "riskSafe", advice: "adviceSafe" },
  caution: { name: "riskCaution", advice: "adviceCaution" },
  new: { name: "riskNew", advice: "adviceNew" },
  risky: { name: "riskRisky", advice: "adviceRisky" },
};

/** What the colour means for this order, in plain words, above the numbers. */
export function AdvicePanel({ risk }: { risk: FraudRisk }) {
  const t = useTranslations("fraudCheck");
  const keys = ADVICE_KEYS[risk.level];
  return (
    <div className={cn("rounded-card border px-3 py-2", ADVICE_TONE[risk.level])}>
      <div className="text-sm font-semibold">{t(keys.name)}</div>
      <div className="text-sm">{t(keys.advice)}</div>
    </div>
  );
}

export type FraudCheckDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone: string | null | undefined;
  response: unknown;
  loading: boolean;
  errorText?: string | null;
  warningText?: string | null;
  /** How this number's parcels went in every shop on Paperbase; null before an answer. */
  history?: PhoneHistory | null;
  /** The colour the check came to (risk.py); null when nothing could be said. */
  risk?: FraudRisk | null;
  /** When the provider was asked for this answer: a kept report can be days old. */
  checkedAt?: string | null;
  /** Ask the provider again whatever is kept ("Check again"); left out when not allowed. */
  onCheckAgain?: () => void;
  /** A "Check again" is under way: the answer shown stays until the new one comes. */
  checkingAgain?: boolean;
};

/**
 * When the answer shown was asked for (an order's report is kept from when it arrived, owner
 * 2026-09-30), and a way to ask again: it spends a check of the plan, so only on a click.
 */
export function CheckedBar({
  checkedAt,
  onCheckAgain,
  checkingAgain = false,
}: Pick<FraudCheckDialogProps, "checkedAt" | "onCheckAgain" | "checkingAgain">) {
  const t = useTranslations("fraudCheck");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const at = checkedAt ? new Date(checkedAt) : null;
  const known = at !== null && !Number.isNaN(at.getTime());
  if (!known && !onCheckAgain) return null;
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        {known ? (
          <>
            <Clock className="size-3.5 shrink-0" aria-hidden />
            <time dateTime={at.toISOString()} title={format.dateTime(at, { dateStyle: "medium", timeStyle: "short" })}>
              {t("checkedAgo", { when: format.relativeTime(at, now) })}
            </time>
          </>
        ) : null}
      </span>
      {onCheckAgain ? (
        <Button type="button" variant="outline" size="sm" onClick={onCheckAgain} disabled={checkingAgain}>
          <RefreshCw className={cn("size-3.5", checkingAgain && "animate-spin")} aria-hidden />
          {checkingAgain ? t("checkingAgain") : t("checkAgain")}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Paperbase's own history for the number: counts from every shop, never which shop.
 * The courier rows above are that courier's word; this is what Paperbase itself saw.
 */
export function HistoryPanel({ history }: { history: PhoneHistory }) {
  const t = useTranslations("fraudCheck");
  const empty = history.delivered === 0 && history.returned === 0 && history.wrong_number_shops === 0;
  return (
    <div className="rounded-card border border-border bg-card px-3 py-2">
      <div className="text-xs font-semibold text-foreground">{t("historyTitle")}</div>
      <div className="text-xs text-muted-foreground">{t("historyHint")}</div>
      {empty ? (
        <div className="mt-2 text-sm text-muted-foreground">{t("historyEmpty")}</div>
      ) : (
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Tile label={t("historyDelivered")} value={String(history.delivered)} tone="success" />
          <Tile label={t("historyReturned")} value={String(history.returned)} tone="danger" />
          <Tile
            label={t("historyWrongNumber")}
            value={t("historyShops", { count: history.wrong_number_shops })}
          />
        </div>
      )}
    </div>
  );
}

export function FraudCheckDialog({
  open,
  onOpenChange,
  phone,
  response,
  loading,
  errorText,
  warningText,
  history,
  risk,
  checkedAt,
  onCheckAgain,
  checkingAgain,
}: FraudCheckDialogProps) {
  const tCommon = useTranslations("common");
  const t = useTranslations("fraudCheck");
  const summary = useMemo(() => parseSummary(response), [response]);
  const couriers = useMemo(() => parseCouriers(response), [response]);
  const reports = useMemo(() => parseReports(response), [response]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto sm:w-full"
      >
        <DialogClose
          className={cn(
            "absolute right-4 top-4 z-10 text-sm font-medium text-muted-foreground transition-colors",
            "hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        >
          {tCommon("close")}
        </DialogClose>
        <DialogHeader className="pr-14">
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("phone", { phone: phone || "—" })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 p-3 sm:p-4">
          {loading ? null : (
            <CheckedBar checkedAt={checkedAt} onCheckAgain={onCheckAgain} checkingAgain={checkingAgain} />
          )}

          {warningText ? (
            <div className="flex items-start gap-2 rounded-ui border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0">{warningText}</div>
            </div>
          ) : null}

          {errorText ? (
            <div className="flex items-start gap-2 rounded-ui border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0">{errorText}</div>
            </div>
          ) : null}

          {loading ? (
            <div className="flex min-h-[14rem] items-center justify-center py-8">
              <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
            </div>
          ) : (
            <>
              {risk ? <AdvicePanel risk={risk} /> : null}
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <Tile
                  label={t("totalParcels")}
                  value={summary.total === null ? "—" : String(summary.total)}
                />
                <Tile
                  label={t("success")}
                  value={summary.success === null ? "—" : String(summary.success)}
                  tone="success"
                />
                <Tile
                  label={t("cancelled")}
                  value={summary.cancelled === null ? "—" : String(summary.cancelled)}
                  tone="danger"
                />
                <Tile
                  label={t("successRatio")}
                  value={
                    summary.successRatioPct === null
                      ? "—"
                      : `${summary.successRatioPct.toFixed(2)}%`
                  }
                />
              </div>

              <div className="rounded-card border border-border bg-card">
                <div className="overflow-x-auto md:overflow-x-hidden">
                  <div className="min-w-[680px] md:min-w-0">
                    <div className="grid grid-cols-12 gap-0 border-b border-border bg-muted/40 px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                      <div className="col-span-2">{t("colLogo")}</div>
                      <div className="col-span-3">{t("colCourier")}</div>
                      <div className="col-span-2">{t("colTotal")}</div>
                      <div className="col-span-2">{t("colSuccess")}</div>
                      <div className="col-span-2">{t("colCancelled")}</div>
                      <div className="col-span-1 text-left">{t("colRatio")}</div>
                    </div>

                    {couriers.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-muted-foreground">
                        {t("noCouriers")}
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {couriers.map((c) => {
                          const pct = c.successRatioPct;
                          const pctText = pct === null ? "—" : `${pct.toFixed(1)}%`;
                          const key = normalizeCourierKey(c.name);
                          return (
                            <div
                              key={key || c.name}
                              className="grid grid-cols-12 items-center gap-0 px-2 py-0.5 text-[13px] leading-none"
                            >
                              <div className="col-span-2">
                                <CourierLogo
                                  name={c.name}
                                  logoUrl={c.logoUrl}
                                  sizeClassName="size-10"
                                />
                              </div>
                              <div className="col-span-3 min-w-0 pr-3">
                                <div className="truncate font-medium text-foreground">
                                  {c.name}
                                </div>
                              </div>
                              <div className="col-span-2 text-foreground">
                                {c.total === null ? "—" : c.total}
                              </div>
                              <div className="col-span-2 text-emerald-600">
                                {c.success === null ? "—" : c.success}
                              </div>
                              <div className="col-span-2 text-red-600">
                                {c.cancelled === null ? "—" : c.cancelled}
                              </div>
                              <div className="col-span-1 flex items-center justify-start gap-3">
                                <span
                                  className={cn(
                                    "min-w-[48px] text-left text-[13px] font-semibold",
                                    ratioColor(pct)
                                  )}
                                >
                                  {pctText}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {reports.length > 0 ? <ReportsPanel reports={reports} /> : null}
              {history ? <HistoryPanel history={history} /> : null}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

