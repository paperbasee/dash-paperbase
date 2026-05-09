import api from "@/lib/api";

export type AnalyticsBucket = "hour" | "day" | "week" | "month";

export interface DashboardAnalyticsSummary {
  totalOrders: number;
  totalProducts: number;
  totalSupportTickets: number;
  totalCustomers: number;
}

export interface DashboardAnalyticsPoint {
  label: string;
  orders: number;
  products: number;
  supportTickets: number;
  customers: number;
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
