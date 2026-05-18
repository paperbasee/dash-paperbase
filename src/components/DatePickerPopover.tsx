"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { Matcher } from "react-day-picker";
import { cn } from "@/lib/utils";

const Calendar = dynamic(
  () => import("./ui/calendar").then((mod) => mod.Calendar),
  {
    ssr: false,
    loading: () => <div className="h-56 w-64 animate-pulse rounded-card bg-muted/40" />,
  }
);

interface DatePickerPopoverProps {
  open: boolean;
  onClose: () => void;
  selected?: Date;
  onSelect: (date: Date) => void;
  disabled?: Matcher;
  className?: string;
}

/** Date-only calendar popover — matches CTA / banners picker styling. */
export default function DatePickerPopover({
  open,
  onClose,
  selected,
  onSelect,
  disabled,
  className,
}: DatePickerPopoverProps) {
  const t = useTranslations("pages");

  if (!open) return null;

  return (
    <div
      className={cn(
        "absolute z-[70] w-fit max-w-[calc(100vw-2rem)]",
        className
      )}
      role="dialog"
      aria-label={t("filtersSelectTimeRange")}
    >
      <div className="rounded-card border border-border bg-card p-1 shadow-lg">
        <Calendar
          mode="single"
          selected={selected}
          disabled={disabled}
          onSelect={(date) => {
            if (!date) return;
            onSelect(date);
            onClose();
          }}
          className="[--cell-size:--spacing(7)] sm:[--cell-size:--spacing(8)]"
        />
      </div>
    </div>
  );
}
