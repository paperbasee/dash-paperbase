"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeftRight, CalendarDays, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { addCalendarDaysYmd, todayYmdInBD } from "@/utils/time";

import { useAnalyticsView } from "../_lib/context";
import { MAX_DAYS, PRESETS, type Period, dayCount, periodDays } from "../_lib/period";

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
 * Which days the page shows: the quick choices, and Custom, which opens the
 * calendar (and names the days once chosen).
 */
export function PeriodChips({ period, onChange }: { period: Period; onChange: (next: Period) => void }) {
  const t = useTranslations("analyticsPage.period");
  const { format } = useAnalyticsView();
  const [picking, setPicking] = useState(false);
  const today = todayYmdInBD();
  const { start, end } = periodDays(period, today);

  return (
    <div className="scrollbar-hide flex gap-2 overflow-x-auto sm:flex-wrap">
      {PRESETS.map((preset) => (
        <Chip key={preset} active={period.preset === preset} onClick={() => onChange({ preset, compare: period.compare })}>
          {preset === "7" || preset === "30" ? t("days", { n: format.count(Number(preset)) }) : t(preset)}
        </Chip>
      ))}
      <Chip active={period.preset === "custom"} onClick={() => setPicking(true)}>
        <CalendarDays className="size-4" aria-hidden />
        {period.preset === "custom" ? format.days(start, end) : t("custom")}
      </Chip>
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

/** What the days are compared with: the days just before, or the same days a year before. */
export function CompareMenu({ period, onChange }: { period: Period; onChange: (next: Period) => void }) {
  const t = useTranslations("analyticsPage.period");
  const { format } = useAnalyticsView();
  const { start, end } = periodDays(period, todayYmdInBD());
  const n = format.count(dayCount(start, end));
  const [shown, before] =
    period.preset === "today"
      ? [t("vsYesterday"), t("againstYesterday")]
      : period.preset === "month"
        ? [t("vsLastMonth"), t("againstLastMonth")]
        : [t("vsPreviousDays", { n }), t("againstDays", { n })];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-button border border-border bg-card px-3 text-[13px] font-medium text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:bg-muted sm:h-9 sm:flex-none"
        >
          <ArrowLeftRight className="size-4 text-muted-foreground" aria-hidden />
          {period.compare === "year" ? t("vsLastYear") : shown}
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel>{t("compareWith")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={period.compare}
          onValueChange={(value) => onChange({ ...period, compare: value === "year" ? "year" : "previous" })}
        >
          <DropdownMenuRadioItem value="previous">{before}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="year">{t("againstLastYear")}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium transition-colors sm:h-9",
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
