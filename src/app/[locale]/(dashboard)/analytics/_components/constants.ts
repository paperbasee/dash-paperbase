export const DEVICE_SLICE_COLORS: Record<string, string> = {
  mobile: "hsl(var(--accent-blue))",
  tablet: "#f59e0b",
  desktop: "#22c55e",
};

export const PARCEL_SLICE_COLORS: Record<string, string> = {
  delivered: "#22c55e",
  returned: "#f43f5e",
  in_transit: "hsl(var(--accent-blue))",
  unknown: "#94a3b8",
};

export const chartGridStroke = "hsl(var(--border))";
export const axisTickFill = "hsl(var(--muted-foreground))";

export const tooltipStyle = {
  border: "1px solid hsl(var(--border))",
  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.25)",
  fontSize: 12,
  backgroundColor: "hsl(var(--card))",
  color: "hsl(var(--foreground))",
} as const;

export const areaPrimary = "hsl(var(--chart-orders))";
export const areaSecondary = "hsl(var(--chart-products))";

export const CHART_COLORS = [
  "var(--chart-1, #6366f1)",
  "var(--chart-2, #8b5cf6)",
  "var(--chart-3, #ec4899)",
  "var(--chart-4, #f59e0b)",
  "var(--chart-5, #10b981)",
  "var(--chart-other, #94a3b8)",
];
