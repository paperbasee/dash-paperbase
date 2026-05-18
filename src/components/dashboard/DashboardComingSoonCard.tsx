"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface DashboardComingSoonCardProps {
  className?: string;
  minHeightClass?: string;
}

export default function DashboardComingSoonCard({
  className,
  minHeightClass = "min-h-[12rem]",
}: DashboardComingSoonCardProps) {
  const t = useTranslations("dashboard");

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-card border-x border-t border-card-border bg-card px-4 py-10 sm:px-5",
        minHeightClass,
        className
      )}
    >
      <p className="text-center text-sm text-muted-foreground">{t("featureComingSoon")}</p>
    </div>
  );
}
