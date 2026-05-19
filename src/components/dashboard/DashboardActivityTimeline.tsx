"use client";

import DashboardBarChart from "@/components/DashboardBarChart";
import type {
  AnalyticsBucket,
  DashboardAnalyticsPoint,
} from "@/lib/basicAnalyticsService";

interface DashboardActivityTimelineProps {
  data: DashboardAnalyticsPoint[];
  bucket: AnalyticsBucket;
}

export default function DashboardActivityTimeline({
  data,
  bucket,
}: DashboardActivityTimelineProps) {
  return <DashboardBarChart data={data} bucket={bucket} />;
}
