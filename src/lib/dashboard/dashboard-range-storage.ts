import { dateRangeInputSchema, type DateRangeValue } from "@/lib/validation";

const DASHBOARD_RANGE_STORAGE_KEY = "paperbase_dashboard_range_v1";

/** Persist the dashboard's last-picked time range so it survives a reload. */
export function saveDashboardRange(value: DateRangeValue): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DASHBOARD_RANGE_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode, quota) — skip persistence silently.
  }
}

export function loadDashboardRange(): DateRangeValue | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DASHBOARD_RANGE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = dateRangeInputSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
