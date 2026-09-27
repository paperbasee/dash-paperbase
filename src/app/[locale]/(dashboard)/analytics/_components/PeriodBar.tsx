"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeftRight, CalendarDays, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { addCalendarDaysYmd, todayYmdInBD } from "@/utils/time";

import { useAnalyticsView } from "../_lib/context";
import { MAX_DAYS, PRESETS, type Period, type Preset, dayCount, periodDays } from "../_lib/period";

const Calendar = dynamic(() => import("@/components/ui/calendar").then((mod) => mod.Calendar), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-card bg-muted/40" />,
});

function toDate(ymd: string): Date {
  return new Date(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10));
}

function toYmd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Which days the page shows, and what they are compared with: a button naming
 * the days (it opens the calendar), the comparison, and the quick choices.
 */
export function PeriodBar({ period, onChange }: { period: Period; onChange: (next: Period) => void }) {
  const t = useTranslations("analyticsPage.period");
  const { format } = useAnalyticsView();
  const [picking, setPicking] = useState(false);
  const today = todayYmdInBD();
  const { start, end } = periodDays(period, today);
  const days = dayCount(start, end);

  const name =
    period.preset === "custom"
      ? t("custom")
      : period.preset === "7" || period.preset === "30"
        ? t("lastDays", { n: format.count(Number(period.preset)) })
        : t(period.preset);
  const against =
    period.compare === "year"
      ? t("vsLastYear")
      : period.preset === "today"
        ? t("vsYesterday")
        : period.preset === "month"
          ? t("vsLastMonth")
          : t("vsPreviousDays", { n: format.count(days) });

  const choose = (preset: Preset) => onChange({ preset, compare: period.compare });

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-ui border border-border bg-card px-3 text-left"
        >
          <CalendarDays className="size-[18px] shrink-0 text-foreground" aria-hidden />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13px] font-semibold text-foreground">{name}</span>
            <span className="truncate text-[11px] text-muted-foreground">{format.days(start, end)}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
        <button
          type="button"
          aria-label={t("compareToggle")}
          aria-pressed={period.compare === "year"}
          onClick={() => onChange({ ...period, compare: period.compare === "year" ? "previous" : "year" })}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-ui border border-border bg-card px-3 text-xs font-medium text-foreground"
        >
          <ArrowLeftRight className="size-4" aria-hidden />
          <span className="max-w-32 truncate">{against}</span>
        </button>
      </div>
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:px-0">
        {PRESETS.map((preset) => (
          <Chip key={preset} active={period.preset === preset} onClick={() => choose(preset)}>
            {preset === "7" || preset === "30" ? t("days", { n: format.count(Number(preset)) }) : t(preset)}
          </Chip>
        ))}
        <Chip active={period.preset === "custom"} onClick={() => setPicking(true)}>
          {t("custom")}
        </Chip>
      </div>
      <PickDays
        open={picking}
        onOpenChange={setPicking}
        start={start}
        end={end}
        today={today}
        onPick={(first, last) => {
          onChange({ preset: "custom", start: first, end: last, compare: period.compare });
          setPicking(false);
        }}
      />
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-8 shrink-0 whitespace-nowrap rounded-full border px-3 text-xs font-medium transition-colors",
        active ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function PickDays({
  open,
  onOpenChange,
  start,
  end,
  today,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  start: string;
  end: string;
  today: string;
  onPick: (start: string, end: string) => void;
}) {
  const t = useTranslations("analyticsPage.period");
  const { format } = useAnalyticsView();
  const [range, setRange] = useState<DateRange | undefined>({ from: toDate(start), to: toDate(end) });
  const earliest = useMemo(() => toDate(addCalendarDaysYmd(today, -(MAX_DAYS - 1))), [today]);
  const first = range?.from ? toYmd(range.from) : "";
  const last = range?.to ? toYmd(range.to) : first;
  const tooLong = Boolean(first && last && dayCount(first, last) > MAX_DAYS);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setRange({ from: toDate(start), to: toDate(end) });
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("pickTitle")}</DialogTitle>
        </DialogHeader>
        <Calendar
          mode="range"
          selected={range}
          onSelect={setRange}
          defaultMonth={range?.from}
          disabled={{ before: earliest, after: toDate(today) }}
          className="mx-auto"
        />
        <p className="text-center text-sm text-muted-foreground">
          {first ? format.days(first, last) : t("pickHint")}
        </p>
        <DialogFooter>
          <Button type="button" disabled={!first || tooLong} onClick={() => onPick(first, last)}>
            {t("pickApply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
