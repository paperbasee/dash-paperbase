interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: "blue" | "green" | "yellow" | "red";
}

const ACCENT_CLASSES = {
  blue: "accent-blue",
  green: "accent-green",
  yellow: "accent-yellow",
  red: "accent-red",
};

export default function StatsCard({
  title,
  value,
  subtitle,
  accent = "blue",
}: StatsCardProps) {
  return (
    <div className="rounded-xl border border-card-border bg-card p-5">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p
        className={`mt-2 text-3xl font-bold font-mono tabular-nums ${ACCENT_CLASSES[accent]}`}
      >
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
