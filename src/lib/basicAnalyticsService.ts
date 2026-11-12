import api from "@/lib/api";

export type AnalyticsBucket = "minute" | "hour" | "day" | "week" | "month";

/** Every order placed in the period, cancelled ones too, split by where it stands. */
export interface DashboardAnalyticsSummary {
  orders: number;
  confirmed: number;
  /** Pending and payment pending: not confirmed yet. */
  pending: number;
  cancelled: number;
}

/** Orders placed in one bucket (a minute, hour, day, week or month) of the period. */
export interface DashboardAnalyticsPoint {
  label: string;
  orders: number;
}

export interface DashboardAnalyticsResponse {
  summary: DashboardAnalyticsSummary;
  series: DashboardAnalyticsPoint[];
  meta: {
    start_date: string;
    end_date: string;
    bucket: AnalyticsBucket | string;
  };
}

export interface BasicAnalyticsOverviewParams {
  start_date: string;
  end_date: string;
  bucket: string;
}

export async function getBasicAnalyticsOverview(
  params: BasicAnalyticsOverviewParams,
): Promise<DashboardAnalyticsResponse> {
  const { data } = await api.get<DashboardAnalyticsResponse>(
    "admin/basic-analytics/overview/",
    { params },
  );
  return data;
}
