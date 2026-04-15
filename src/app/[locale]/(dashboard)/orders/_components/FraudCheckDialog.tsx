"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { CourierLogo, normalizeCourierKey } from "./CourierItem";

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

export type FraudCheckDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone: string | null | undefined;
  response: unknown;
  loading: boolean;
  errorText?: string | null;
  warningText?: string | null;
};

export function FraudCheckDialog({
  open,
  onOpenChange,
  phone,
  response,
  loading,
  errorText,
  warningText,
}: FraudCheckDialogProps) {
  const summary = useMemo(() => parseSummary(response), [response]);
  const couriers = useMemo(() => parseCouriers(response), [response]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>Fraud Check</DialogTitle>
          <DialogDescription>
            {phone ? `Phone: ${phone}` : "Phone: —"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 p-3 sm:p-4">
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
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[64px] animate-pulse rounded-card border border-border bg-muted/40"
                  />
                ))}
              </div>
              <div className="h-56 animate-pulse rounded-card border border-border bg-muted/40" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <Tile
                  label="Total Parcels"
                  value={summary.total === null ? "—" : String(summary.total)}
                />
                <Tile
                  label="Success"
                  value={summary.success === null ? "—" : String(summary.success)}
                  tone="success"
                />
                <Tile
                  label="Cancelled"
                  value={summary.cancelled === null ? "—" : String(summary.cancelled)}
                  tone="danger"
                />
                <Tile
                  label="Success Ratio"
                  value={
                    summary.successRatioPct === null
                      ? "—"
                      : `${summary.successRatioPct.toFixed(2)}%`
                  }
                />
              </div>

              <div className="rounded-card border border-border bg-card">
                <div className="overflow-x-auto">
                  <div className="min-w-[680px]">
                    <div className="grid grid-cols-12 gap-0 border-b border-border bg-muted/40 px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                      <div className="col-span-2">Logo</div>
                      <div className="col-span-3">Courier</div>
                      <div className="col-span-2">Total</div>
                      <div className="col-span-2">Success</div>
                      <div className="col-span-2">Cancelled</div>
                      <div className="col-span-1 text-left">Ratio</div>
                    </div>

                    {couriers.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-muted-foreground">
                        No courier breakdown available.
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

