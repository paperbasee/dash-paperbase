"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Calendar as CalendarIcon,
  ChevronsLeft,
  ChevronsRight,
  Search,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import DatePickerPopover from "@/components/DatePickerPopover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AnalyticsBucket } from "@/hooks/useDashboardAnalytics";
import { toLocaleDigits } from "@/lib/locale-digits";
import { dateToYmd, startOfDay, ymdToDate } from "@/lib/date-range-ui";
import { digitsInNumberFont } from "@/lib/number-font";
import { cn } from "@/lib/utils";
import {
  canShiftDateRangeForward,
  dateRangeInputSchema,
  normalizeDateRange,
  shiftDateRange,
  type DateRangeValue,
  type PresetKey,
} from "@/lib/validation";
import {
  addCalendarDaysYmd,
  startOfMonthYmdInBD,
  todayYmdInBD,
} from "@/utils/time";

const PANEL_MAX_WIDTH_PX = 576;

function getContentBounds(el: HTMLElement) {
  const main = el.closest("main");
  const node = main ?? el.closest(".mx-auto");
  if (node instanceof HTMLElement) {
    const rect = node.getBoundingClientRect();
    return { left: rect.left, right: rect.right, width: rect.width };
  }
  return { left: 16, right: window.innerWidth - 16, width: window.innerWidth - 32 };
}

const PRESET_OPTIONS: {
  key: PresetKey;
  labelKey: "filtersToday" | "filtersLast7Days" | "filtersLast30Days" | "filtersThisMonth";
}[] = [
  { key: "today", labelKey: "filtersToday" },
  { key: "last7", labelKey: "filtersLast7Days" },
  { key: "last30", labelKey: "filtersLast30Days" },
  { key: "thisMonth", labelKey: "filtersThisMonth" },
];

interface DateRangePresetPickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  anchorDate: Date;
  className?: string;
  /** Fired when the preset panel opens or closes (e.g. mobile hero layout). */
  onPanelOpenChange?: (open: boolean) => void;
}

function presetLabel(
  value: DateRangeValue,
  t: ReturnType<typeof useTranslations<"pages">>,
  locale: string
): ReactNode {
  const match = PRESET_OPTIONS.find((o) => o.key === value.preset);
  if (match) {
    return digitsInNumberFont(t(match.labelKey), locale);
  }
  const range = `${value.startDate} – ${value.endDate}`;
  return toLocaleDigits(range, locale);
}

export default function DateRangePresetPicker({
  value,
  onChange,
  anchorDate,
  className,
  onPanelOpenChange,
}: DateRangePresetPickerProps) {
  const locale = useLocale();
  const t = useTranslations("pages");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ startDate: value.startDate, endDate: value.endDate });
  const [quickSearch, setQuickSearch] = useState("");
  const [activeCalendarField, setActiveCalendarField] = useState<
    "startDate" | "endDate" | null
  >(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const absoluteSectionRef = useRef<HTMLElement | null>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});

  const todayDate = useMemo(() => startOfDay(anchorDate), [anchorDate]);
  const minDate = useMemo(() => {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - 90);
    return d;
  }, [todayDate]);
  const selectedStart = ymdToDate(draft.startDate);
  const selectedEnd = ymdToDate(draft.endDate);

  const label = useMemo(() => presetLabel(value, t, locale), [value, t, locale]);
  const canShiftForward = canShiftDateRangeForward(value, anchorDate);

  const filteredPresets = useMemo(() => {
    const q = quickSearch.trim().toLowerCase();
    if (!q) return PRESET_OPTIONS;
    return PRESET_OPTIONS.filter((opt) =>
      t(opt.labelKey).toLowerCase().includes(q)
    );
  }, [quickSearch, t]);

  useEffect(() => {
    if (open) {
      setDraft({ startDate: value.startDate, endDate: value.endDate });
      setQuickSearch("");
      setActiveCalendarField(null);
    }
  }, [open, value.startDate, value.endDate]);

  useEffect(() => {
    onPanelOpenChange?.(open);
  }, [open, onPanelOpenChange]);

  useLayoutEffect(() => {
    if (!open || !rootRef.current) {
      setPanelStyle({});
      return;
    }

    const updatePanelLayout = () => {
      const isMobile = window.innerWidth < 640;

      if (isMobile) {
        setPanelStyle({});
        return;
      }

      const trigger = rootRef.current!.getBoundingClientRect();
      const bounds = getContentBounds(rootRef.current!);
      const pad = 16;
      const width = Math.min(
        PANEL_MAX_WIDTH_PX,
        Math.max(280, trigger.right - bounds.left - pad)
      );
      setPanelStyle({ width, maxWidth: width });
    };

    updatePanelLayout();
    window.addEventListener("resize", updatePanelLayout);
    window.addEventListener("scroll", updatePanelLayout, true);
    return () => {
      window.removeEventListener("resize", updatePanelLayout);
      window.removeEventListener("scroll", updatePanelLayout, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const isDateDisabled = (field: "startDate" | "endDate") => (date: Date) => {
    const day = startOfDay(date);
    if (day < minDate || day > todayDate) return true;
    if (field === "startDate" && selectedEnd && day > startOfDay(selectedEnd)) {
      return true;
    }
    if (field === "endDate" && selectedStart && day < startOfDay(selectedStart)) {
      return true;
    }
    return false;
  };

  const setPreset = (preset: PresetKey) => {
    const endStr = todayYmdInBD(anchorDate);
    let startStr = endStr;
    let bucket: AnalyticsBucket = "day";

    if (preset === "last7") {
      startStr = addCalendarDaysYmd(endStr, -6);
    } else if (preset === "last30") {
      startStr = addCalendarDaysYmd(endStr, -29);
    } else if (preset === "thisMonth") {
      startStr = startOfMonthYmdInBD(anchorDate);
    } else if (preset === "today") {
      startStr = endStr;
      bucket = "hour";
    } else {
      onChange({ ...value, preset });
      return;
    }

    onChange(
      normalizeDateRange(
        { startDate: startStr, endDate: endStr, bucket, preset },
        anchorDate
      )
    );
    setOpen(false);
  };

  const applyDraft = () => {
    const next: DateRangeValue = {
      ...value,
      startDate: draft.startDate,
      endDate: draft.endDate,
      preset: "custom",
    };
    const parsed = dateRangeInputSchema.safeParse(next);
    if (!parsed.success) return;
    onChange(normalizeDateRange(parsed.data, anchorDate));
    setOpen(false);
  };

  const updateDraftField = (field: "startDate" | "endDate", val: string) => {
    const cleaned = val.trim();
    if (!cleaned) return;
    setDraft((prev) => ({ ...prev, [field]: cleaned }));
  };

  const barBtnClass =
    "flex h-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-40";

  const dateField = (
    field: "startDate" | "endDate",
    labelKey: "filtersDateFieldFrom" | "filtersDateFieldTo"
  ) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{t(labelKey)}</label>
      <div className="relative flex gap-1">
        <Input
          value={draft[field]}
          placeholder={t("filtersDatePlaceholder")}
          className="h-8 flex-1 font-numbers-date-value text-sm"
          onChange={(e) => updateDraftField(field, e.target.value)}
        />
        <button
          type="button"
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xs border border-input-border bg-input-surface text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
            activeCalendarField === field &&
              "border-[hsl(var(--chart-orders))] text-[hsl(var(--chart-orders))]"
          )}
          aria-label={t(labelKey)}
          aria-expanded={activeCalendarField === field}
          onClick={(e) => {
            e.stopPropagation();
            setActiveCalendarField((current) => (current === field ? null : field));
          }}
        >
          <CalendarIcon className="size-4" aria-hidden />
        </button>
        {activeCalendarField === field ? (
          <DatePickerPopover
            open
            onClose={() => setActiveCalendarField(null)}
            selected={ymdToDate(draft[field])}
            disabled={isDateDisabled(field)}
            onSelect={(date) => updateDraftField(field, dateToYmd(date))}
            className="left-0 top-full z-[70] mt-2"
          />
        ) : null}
      </div>
    </div>
  );

  return (
    <div ref={rootRef} className={cn("relative max-w-full", className)}>
      <div
        className="flex h-9 w-full items-stretch overflow-hidden rounded-ui border border-border bg-input-surface text-sm shadow-xs"
        role="group"
        aria-label={t("filtersDateRange")}
      >
        <button
          type="button"
          className={cn(barBtnClass, "px-2")}
          aria-label={t("filtersDateRangePrevious")}
          onClick={() => onChange(shiftDateRange(value, -1, anchorDate))}
        >
          <ChevronsLeft className="size-4" aria-hidden />
        </button>
        <div className="w-px self-stretch bg-border" aria-hidden />
        <button
          type="button"
          className={cn(
            barBtnClass,
            "min-w-0 flex-1 px-3 font-medium text-foreground",
            open && "bg-muted/40"
          )}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="truncate">{label}</span>
        </button>
        <div className="w-px self-stretch bg-border" aria-hidden />
        <button
          type="button"
          className={cn(barBtnClass, "px-2")}
          aria-label={t("filtersDateRangeNext")}
          disabled={!canShiftForward}
          onClick={() => onChange(shiftDateRange(value, 1, anchorDate))}
        >
          <ChevronsRight className="size-4" aria-hidden />
        </button>
      </div>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={t("filtersDateRange")}
          style={panelStyle}
          className={cn(
            "max-h-[min(80dvh,32rem)] border border-card-border bg-card shadow-lg",
            "max-sm:relative max-sm:mt-2 max-sm:w-full max-sm:rounded-card",
            "sm:absolute sm:right-0 sm:top-full sm:z-50 sm:mt-2 sm:rounded-xs",
            activeCalendarField ? "overflow-visible" : "overflow-y-auto"
          )}
        >
          <div className="grid min-w-0 grid-cols-1 rounded-xs sm:grid-cols-2">
            <section
              ref={absoluteSectionRef}
              className="relative overflow-visible border-b border-border p-4 sm:border-b-0 sm:border-r"
            >
              <h3 className="mb-3 text-sm font-medium text-foreground">
                {t("filtersAbsoluteTimeRange")}
              </h3>
              <div className="space-y-3">
                {dateField("startDate", "filtersDateFieldFrom")}
                {dateField("endDate", "filtersDateFieldTo")}
              </div>
              <Button type="button" size="sm" className="mt-4 w-full sm:w-auto" onClick={applyDraft}>
                {t("filtersApplyTimeRange")}
              </Button>
            </section>

            <section className="flex min-h-0 flex-col p-3">
              <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">
                {t("filtersQuickRanges")}
              </p>
              <div className="relative mb-2 px-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={quickSearch}
                  onChange={(e) => setQuickSearch(e.target.value)}
                  placeholder={t("filtersSearchQuickRanges")}
                  className="h-8 pl-8 text-sm"
                />
              </div>
              <ul className="max-h-56 flex-1 overflow-y-auto py-0.5" role="listbox">
                {filteredPresets.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-muted-foreground">{t("filtersNoQuickRanges")}</li>
                ) : (
                  filteredPresets.map((opt) => {
                    const active = value.preset === opt.key;
                    return (
                      <li key={opt.key}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          className={cn(
                            "w-full border-l-2 px-3 py-2 text-left text-sm transition-colors",
                            active
                              ? "border-amber-500 bg-muted/60 text-foreground"
                              : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          )}
                          onClick={() => setPreset(opt.key)}
                        >
                          {digitsInNumberFont(t(opt.labelKey), locale)}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
