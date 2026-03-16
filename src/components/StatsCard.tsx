interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: "blue" | "green" | "yellow" | "red";
}

const ACCENT_CLASSES = {
  blue: "bg-blue-50 text-blue-700",
  green: "bg-green-50 text-green-700",
  yellow: "bg-yellow-50 text-yellow-700",
  red: "bg-red-50 text-red-700",
};

export default function StatsCard({
  title,
  value,
  subtitle,
  accent = "blue",
}: StatsCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className={`mt-2 text-3xl font-bold font-mono tabular-nums ${ACCENT_CLASSES[accent].split(" ")[1]}`}>
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
      )}
    </div>
  );
}
