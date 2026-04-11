interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: "blue" | "green" | "yellow" | "red";
  /** Bengali numerals pair better with the primary sans stack than tabular mono. */
  numberFont?: "mono" | "sans";
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
  numberFont = "mono",
}: StatsCardProps) {
  return (
    <div className="rounded-card border border-dashed border-card-border bg-card p-5">
      <p className="text-sm font-medium leading-relaxed text-muted-foreground">
        {title}
      </p>
      <p
        className={`mt-2 text-3xl font-bold tabular-nums ${numberFont === "sans" ? "font-sans" : "font-mono"} ${ACCENT_CLASSES[accent]}`}
      >
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      )}
    </div>
  );
}
