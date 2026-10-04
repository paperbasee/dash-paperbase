"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeftRight, CalendarDays, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DateRange } from "react-day-picker";

import { FilterBar } from "@/components/filters/FilterBar";
import { FilterPills } from "@/components/filters/FilterPills";
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
 * Which days the page shows, inside the filter button's panel (owner, 2026-10-04): the quick
 * choices, and Custom, which opens the calendar (and names the days once chosen). Clear goes back
 * to the days the page opens on, and closes the panel.
 */
export function PeriodFilters({
  period,
  onChange,
  onClear,
}: {
  period: Period;
  onChange: (next: Period) => void;
  onClear: () => void;
}) {
  const t = useTranslations("analyticsPage.period");
  const tPages = useTranslations("pages");
  const { format } = useAnalyticsView();
  const [picking, setPicking] = useState(false);
  const today = todayYmdInBD();
  const { start, end } = periodDays(period, today);

  return (
    <FilterBar>
      <FilterPills
        className="w-auto"
        label={t("pickTitle")}
        value={period.preset}
        options={[
          ...PRESETS.map((preset) => ({
            value: preset,
            label: preset === "7" || preset === "30" ? t("days", { n: format.count(Number(preset)) }) : t(preset),
          })),
          {
            value: "custom",
            label: (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden />
                {period.preset === "custom" ? format.days(start, end) : t("custom")}
              </span>
            ),
          },
        ]}
        onChange={(value) =>
          value === "custom" ? setPicking(true) : onChange({ preset: value as Preset, compare: period.compare })
        }
      />
      <button type="button" onClick={onClear} className="h-9 rounded-ui border border-border px-3 text-sm hover:bg-muted">
        {tPages("filtersClear")}
      </button>
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
    </FilterBar>
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
