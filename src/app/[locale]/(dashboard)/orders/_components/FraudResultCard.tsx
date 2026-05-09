"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { CourierItem } from "./CourierItem";

type ParsedSummary = {
  total: number | null;
  cancelled: number | null;
  successRatioPct: number | null;
};

type ParsedCourier = {
  name: string;
  ratioPct: number | null;
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

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (k in obj) return obj[k];
  }
  return undefined;
}

function unwrapResponse(response: unknown): unknown {
  if (!response || typeof response !== "object") return response;
  const obj = response as Record<string, unknown>;
  if (obj && typeof obj.data === "object" && obj.data !== null) {
    return obj.data;
  }
  return response;
}

function ratioColorBg(ratioPct: number | null): string {
  if (ratioPct === null) return "bg-muted text-muted-foreground";
  if (ratioPct > 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (ratioPct >= 50) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

function parseSummary(response: unknown): ParsedSummary {
  const unwrapped = unwrapResponse(response);
  if (!unwrapped || typeof unwrapped !== "object") {
    return { total: null, cancelled: null, successRatioPct: null };
  }
  const obj = unwrapped as Record<string, unknown>;

  const summaryObjRaw = obj.summary;
  const summaryObj =
    summaryObjRaw && typeof summaryObjRaw === "object"
      ? (summaryObjRaw as Record<string, unknown>)
      : obj;

  const total = toNumber(
    pick(summaryObj, ["total_parcel", "totalParcel", "total_orders", "totalOrders", "total"])
  );
  const cancelled = toNumber(
    pick(summaryObj, ["cancelled_parcel", "cancelledParcel", "returns", "cancelled", "return"])
  );

  const ratioRaw = pick(summaryObj, ["success_ratio", "successRatio", "success_rate", "successRate", "return_rate", "returnRate"]);
  const ratio = toNumber(ratioRaw);

  // If ratio looks like return_rate, convert to success ratio.
  const ratioKeyIsReturnRate =
    typeof ratioRaw !== "undefined" &&
    (Object.prototype.hasOwnProperty.call(summaryObj, "return_rate") ||
      Object.prototype.hasOwnProperty.call(summaryObj, "returnRate"));
  const successRatioPct =
    ratio === null ? null : ratioKeyIsReturnRate ? Math.max(0, Math.min(100, 100 - ratio)) : Math.max(0, Math.min(100, ratio));

  return { total, cancelled, successRatioPct };
}

function parseCouriers(response: unknown): ParsedCourier[] {
  const unwrapped = unwrapResponse(response);
  if (!unwrapped || typeof unwrapped !== "object") return [];
  const obj = unwrapped as Record<string, unknown>;

  const breakdown = pick(obj, ["couriers", "courier_breakdown", "courierBreakdown", "breakdown"]);
  if (!breakdown) {
    // BD Courier example: data.{pathao,...,summary}
    return Object.entries(obj)
      .filter(([key]) => key !== "summary")
      .map(([key, val]) => {
        if (!val || typeof val !== "object") return null;
        const v = val as Record<string, unknown>;
        const name = String(pick(v, ["name"]) || key).trim();
        if (!name) return null;
        const ratioPct = toNumber(pick(v, ["success_ratio", "successRatio", "success_rate", "successRate", "ratio"]));
        return { name, ratioPct: ratioPct === null ? null : Math.max(0, Math.min(100, ratioPct)) };
      })
      .filter(Boolean) as ParsedCourier[];
  }

  // Array shape: [{name, success_ratio, ...}]
  if (Array.isArray(breakdown)) {
    return breakdown
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const it = item as Record<string, unknown>;
        const name = String(pick(it, ["name", "provider", "courier"]) || "").trim();
        if (!name) return null;
        const ratioPct = toNumber(pick(it, ["success_ratio", "successRatio", "success_rate", "successRate", "ratio"]));
        return { name, ratioPct: ratioPct === null ? null : Math.max(0, Math.min(100, ratioPct)) };
      })
      .filter(Boolean) as ParsedCourier[];
  }

  // Object shape: { pathao: { success_ratio: 80 }, steadfast: { ... } }
  if (typeof breakdown === "object") {
    const b = breakdown as Record<string, unknown>;
    return Object.entries(b)
      .map(([key, val]) => {
        const name = String(key || "").trim();
        if (!name) return null;
        if (!val || typeof val !== "object") return { name, ratioPct: null };
        const v = val as Record<string, unknown>;
        const ratioPct = toNumber(pick(v, ["success_ratio", "successRatio", "success_rate", "successRate", "ratio"]));
        return { name, ratioPct: ratioPct === null ? null : Math.max(0, Math.min(100, ratioPct)) };
      })
      .filter(Boolean) as ParsedCourier[];
  }

  return [];
}

export type FraudResultCardProps = {
  status: string | undefined;
  response: unknown;
  warningText?: string | null;
  errorText?: string | null;
  className?: string;
};

export function FraudResultCard({
  status,
  response,
  warningText,
  errorText,
  className,
}: FraudResultCardProps) {
  const summary = useMemo(() => parseSummary(response), [response]);
  const couriers = useMemo(() => parseCouriers(response), [response]);
  const hasParsed = Boolean(
    summary.total !== null || summary.cancelled !== null || summary.successRatioPct !== null || couriers.length > 0
  );

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-card border border-card-border bg-card shadow-sm",
        className
      )}
    >
      <CardContent className="space-y-3 p-4 sm:p-5">
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

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Summary</span>
          <span
            className={cn(
              "rounded-ui border px-2 py-1 text-xs font-semibold",
              ratioColorBg(summary.successRatioPct)
            )}
          >
            Success ratio:{" "}
            {summary.successRatioPct === null ? "—" : `${Math.round(summary.successRatioPct)}%`}
          </span>
          <span className="rounded-ui border border-border bg-background px-2 py-1 text-xs text-foreground">
            Total: {summary.total === null ? "—" : summary.total}
          </span>
          <span className="rounded-ui border border-border bg-background px-2 py-1 text-xs text-foreground">
            Cancelled: {summary.cancelled === null ? "—" : summary.cancelled}
          </span>
          {status ? (
            <span className="rounded-ui border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
              Status: {status}
            </span>
          ) : null}
        </div>

        {couriers.length > 0 ? (
          <div>
            <div className="mb-2 text-xs font-semibold text-muted-foreground">
              Courier breakdown
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {couriers.map((c) => (
                <CourierItem key={c.name} name={c.name} ratioPct={c.ratioPct} />
              ))}
            </div>
          </div>
        ) : null}

        {!hasParsed ? (
          <Collapsible>
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-muted-foreground">
                Raw response
              </div>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs">
                  Toggle
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="mt-2">
              <pre className="max-h-64 overflow-auto rounded-ui border border-border bg-background p-3 text-xs text-foreground">
                {JSON.stringify(response, null, 2)}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </CardContent>
    </Card>
  );
}

