import { isApiHttpError } from "@/lib/api-client";

import type { FraudCheckApiOk } from "../../_components/types";

/** The part of the API client this needs (`@/lib/api`), so a test can stand in for it. */
type Client = {
  post: <T>(url: string, body: unknown) => Promise<{ data: T }>;
};

/**
 * One check of a number (`POST fraud-check/`, the order list's check without an order): the saved
 * answer when there is one, else the provider -- `fresh` ("Check again") always asks the provider.
 * The API reads the number (engine/utils/phone), so it is sent as typed.
 */
export async function checkPhone(client: Client, phone: string, fresh: boolean): Promise<FraudCheckApiOk> {
  const { data } = await client.post<FraudCheckApiOk>("fraud-check/", fresh ? { phone, fresh: true } : { phone });
  return data;
}

/** Why a check got no answer, as the page says it: each names a `fraudCheckPage.error*` message. */
export type CheckProblem = "errorPhone" | "errorLimit" | "errorBusy" | "errorFailed";

export function checkProblem(err: unknown): CheckProblem {
  if (!isApiHttpError(err)) return "errorFailed";
  if (err.status === 400) return "errorPhone";
  if (err.status === 429) return "errorLimit";
  if (err.status === 409) return "errorBusy";
  return "errorFailed";
}

/** The colours' lines, as engine/apps/fraud_check/risk.py draws them. */
export const SAFE_FROM = 80;
export const RISKY_BELOW = 60;

export type Tone = "safe" | "caution" | "risky";

/** A delivered share's colour, on the verdict's lines. */
export function toneOf(deliveredPct: number): Tone {
  if (deliveredPct >= SAFE_FROM) return "safe";
  if (deliveredPct >= RISKY_BELOW) return "caution";
  return "risky";
}

export type Summary = { total: number; delivered: number; cancelled: number };

export type CourierRow = {
  name: string;
  logo: string;
  total: number;
  delivered: number;
  cancelled: number;
  /** Delivered out of total, from the counts (engine/apps/fraud_check/bdcourier_client.py). */
  deliveredPct: number;
};

export type MerchantReport = { details: string; courier: string; reportedAt: string };

export type Report = { summary: Summary; couriers: CourierRow[]; reports: MerchantReport[] };

const count = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

/**
 * The provider's answer, in the shape the API keeps it (bdcourier_client.normalize_bdcourier_response):
 * the parcel counts, one row per courier that carried any (busiest first), and the reports other
 * merchants filed. Anything missing reads as none.
 */
export function readReport(response: unknown): Report {
  const answer = record(response);
  const summary = record(answer.summary);
  const couriers = Object.values(record(answer.couriers))
    .map((entry): CourierRow | null => {
      const row = record(entry);
      const total = count(row.total);
      if (!total) return null;
      const delivered = Math.min(count(row.success), total);
      return {
        name: text(row.name),
        logo: text(row.logo),
        total,
        delivered,
        cancelled: Math.min(count(row.cancelled), total - delivered),
        deliveredPct: Math.round((delivered / total) * 1000) / 10,
      };
    })
    .filter((row): row is CourierRow => row !== null && row.name !== "")
    .sort((a, b) => b.total - a.total);
  const reports = (Array.isArray(answer.reports) ? answer.reports : [])
    .map((entry) => {
      const report = record(entry);
      return { details: text(report.details), courier: text(report.courier), reportedAt: text(report.reported_at) };
    })
    .filter((report) => report.details !== "");
  return {
    summary: {
      total: count(summary.total_parcel),
      delivered: count(summary.success_parcel),
      cancelled: count(summary.cancelled_parcel),
    },
    couriers,
    reports,
  };
}

/** A local number as Bangladesh writes it (01XXX-XXXXXX); anything else as typed. */
export function shownPhone(phone: string): string {
  const digits = phone.replace(/[\s-]/g, "");
  return /^01\d{9}$/.test(digits) ? `${digits.slice(0, 5)}-${digits.slice(5)}` : phone.trim();
}
