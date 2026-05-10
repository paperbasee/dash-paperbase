export type MetricWithDelta = {
  value: number;
  mom: number | null;
  yoy: number | null;
};

export type OverviewData = {
  pageviews: MetricWithDelta;
  sessions: MetricWithDelta;
  bounce_rate: MetricWithDelta;
  avg_session_duration: MetricWithDelta;
  revenue: MetricWithDelta;
  orders: MetricWithDelta;
  aov: MetricWithDelta;
  delivered: MetricWithDelta;
  returned: MetricWithDelta;
  return_rate: MetricWithDelta;
};

export type PageviewsPoint = { date: string; pageviews: number; sessions: number };
export type PageviewsComparison = {
  data: PageviewsPoint[];
  comparison: PageviewsPoint[];
  summary: {
    current_pageviews: number;
    previous_pageviews: number;
    pageviews_pct_change: number | null;
    current_sessions: number;
    previous_sessions: number;
    sessions_pct_change: number | null;
  };
};
export type RevenuePoint = { date: string; revenue: number; orders: number; aov: number };
export type RevenueComparison = {
  data: RevenuePoint[];
  comparison: RevenuePoint[];
  summary: {
    current_revenue: string;
    previous_revenue: string;
    pct_change: number | null;
  };
};
export type PageRow = { page_path: string; views: number; unique_sessions: number };
export type ProductRow = {
  product_id: string;
  product_name: string;
  views: number;
  add_to_cart: number;
  purchases: number;
  revenue: number;
  conversion_rate: number;
};
export type ParcelsData = {
  summary: { delivered: number; returned: number; in_transit: number; unknown: number };
  daily: { date: string; delivered: number; returned: number }[];
  return_rate: number;
};
export type DevicesData = { data: { device: string; sessions: number }[] };

export type PieSlice = { name: string; key: string; value: number };

export type UTMRow = {
  value: string;
  sessions: number;
  converted: number;
  revenue: string;
  conversion_rate: number;
  mom: number | null;
};

export type UTMData = {
  dimension: string;
  top_values: string[];
  chart: Record<string, number | string>[];
  table: UTMRow[];
};

export type RangeOption = "today" | "7" | "15" | "30";
export type DeltaMode = "mom" | "yoy";

export type AnalyticsMetricKey =
  | "pageviews"
  | "sessions"
  | "bounce_rate"
  | "avg_session_duration"
  | "revenue"
  | "orders"
  | "aov"
  | "return_rate";
