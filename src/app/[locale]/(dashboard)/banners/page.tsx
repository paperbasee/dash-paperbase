"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Clock2Icon, Undo2 } from "lucide-react";
import { isAxiosError } from "axios";
import api from "@/lib/api";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { ClickableText } from "@/components/ui/clickable-text";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import type { Banner, PaginatedResponse } from "@/types";
import { formatDashboardDateTime } from "@/lib/datetime-display";
import { displayInputToApiLocal, isoDatetimeToDisplayInput } from "@/lib/datetime-form";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { notify } from "@/notifications";
import { PLACEMENT_OPTIONS } from "@/components/preview-system/placementConfig";
import { MiniSitePreview } from "@/components/preview-system/MiniSitePreview";
import { numberTextClass } from "@/lib/number-font";
import { cn } from "@/lib/utils";

const ALLOWED_PLACEMENTS = new Set([
  "home_top",
  "home_mid",
  "home_bottom",
]);

type BannerForm = {
  title: string;
  cta_text: string;
  cta_link: string;
  order: string;
  is_active: boolean;
  placement_slots: string[];
  start_at: string;
  end_at: string;
};

const emptyForm: BannerForm = {
  title: "",
  cta_text: "",
  cta_link: "",
  order: "0",
  is_active: true,
  placement_slots: ["home_top"],
  start_at: "",
  end_at: "",
};

const DISPLAY_DATETIME_RE =
  /^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/;

function parseDisplayDateTime(display: string): { date?: Date; time: string } {
  const match = display.trim().match(DISPLAY_DATETIME_RE);
  if (!match) return { date: undefined, time: "00:00:00" };
  const [, dd, mm, yyyy, hh = "00", min = "00", sec = "00"] = match;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (Number.isNaN(date.getTime())) return { date: undefined, time: "00:00:00" };
  return { date, time: `${hh}:${min}:${sec}` };
}

function normalizeTime(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "00:00:00";
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  return "00:00:00";
}

function toDisplayDateTime(date: Date | undefined, time: string): string {
  if (!date) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  const [hh, min] = normalizeTime(time).split(":");
  return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
}

function currentTime24h(now = new Date()): string {
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function isSameCalendarDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateTime(date: Date, time: string): Date {
  const [hh, mm, ss] = normalizeTime(time).split(":").map(Number);
  const d = new Date(date);
  d.setHours(hh, mm, ss, 0);
  return d;
}

function toTime24hWithSeconds(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function formatPlacements(values: string[]): string {
  if (!values?.length) return "—";
  const map = new Map(PLACEMENT_OPTIONS.map((o) => [o.value, o.label] as const));
  return values.map((v) => map.get(v) ?? v).join(", ");
}

type PlacementItem = { value: string; label: string };

export default function BannersPage() {
  const router = useRouter();
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const confirm = useConfirm();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<BannerForm>(emptyForm);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState(currentTime24h());
  const [endTime, setEndTime] = useState("12:30:00");
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);
  const startPickerRef = useRef<HTMLDivElement | null>(null);
  const endPickerRef = useRef<HTMLDivElement | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const placementAnchor = useComboboxAnchor();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const currentStartTime = currentTime24h(now);
  const startDateTime = startDate ? toDateTime(startDate, startTime) : undefined;
  const minEndDate =
    startDateTime && startDateTime > today ? startOfDay(startDateTime) : today;

  const placementItems = useMemo((): PlacementItem[] => {
    const map = new Map(PLACEMENT_OPTIONS.map((o) => [o.value, o.label] as const));
    const values = form.placement_slots || [];
    return values.map((value) => ({ value, label: map.get(value) ?? value }));
  }, [form.placement_slots]);

  function fetchData() {
    setLoading(true);
    api
      .get<PaginatedResponse<Banner> | Banner[]>("admin/banners/")
      .then((res) => {
        const data = res.data;
        setBanners(Array.isArray(data) ? data : data.results);
      })
      .catch((err) => {
        console.error(err);
        notify.error(err);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (startPickerRef.current && !startPickerRef.current.contains(target)) {
        setStartPickerOpen(false);
      }
      if (endPickerRef.current && !endPickerRef.current.contains(target)) {
        setEndPickerOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!startDate) return;
    if (!isSameCalendarDate(startDate, today)) return;
    if (startTime < currentStartTime) {
      setStartTime(currentStartTime);
    }
  }, [startDate, startTime, today, currentStartTime]);

  useEffect(() => {
    if (!endDate) return;
    const endDateOnly = startOfDay(endDate);
    if (endDateOnly < minEndDate) {
      setEndDate(new Date(minEndDate));
      return;
    }
    if (startDateTime && isSameCalendarDate(endDate, startDateTime) && endTime < normalizeTime(startTime)) {
      setEndTime(normalizeTime(startTime));
      return;
    }
    if (isSameCalendarDate(endDate, today) && endTime < currentStartTime) {
      setEndTime(currentStartTime);
    }
  }, [endDate, endTime, minEndDate, startDateTime, startTime, today, currentStartTime]);

  function openNew() {
    setEditing("new");
    setForm(emptyForm);
    setStartDate(undefined);
    setEndDate(undefined);
    setStartTime(currentTime24h());
    setEndTime("12:30:00");
    setStartPickerOpen(false);
    setEndPickerOpen(false);
    setImageFile(null);
  }

  function openEdit(banner: Banner) {
    setEditing(banner.public_id);
    setForm({
      title: banner.title || "",
      cta_text: banner.cta_text || "",
      cta_link: banner.cta_link || "",
      order: String(banner.order ?? 0),
      is_active: banner.is_active,
      placement_slots:
        banner.placement_slots?.length ? banner.placement_slots : ["home_top"],
      start_at: isoDatetimeToDisplayInput(banner.start_at),
      end_at: isoDatetimeToDisplayInput(banner.end_at),
    });
    const parsedStart = parseDisplayDateTime(isoDatetimeToDisplayInput(banner.start_at));
    const parsedEnd = parseDisplayDateTime(isoDatetimeToDisplayInput(banner.end_at));
    setStartDate(parsedStart.date);
    setEndDate(parsedEnd.date);
    setStartTime(parsedStart.time);
    setEndTime(parsedEnd.time);
    setStartPickerOpen(false);
    setEndPickerOpen(false);
    setImageFile(null);
  }

  function applyEndOffsetFromNow(minutes: number) {
    const baseline = startDateTime && startDateTime > now ? startDateTime : now;
    const target = new Date(baseline);
    target.setMinutes(target.getMinutes() + minutes);
    setEndDate(new Date(target.getFullYear(), target.getMonth(), target.getDate()));
    setEndTime(toTime24hWithSeconds(target));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();

    if (!form.placement_slots.length) {
      notify.validation("banners-form", {
        placement_slots: "Select at least one placement slot",
      });
      return;
    }
    if (form.placement_slots.some((p) => !ALLOWED_PLACEMENTS.has(p))) {
      notify.validation("banners-form", {
        placement_slots: "Invalid placement slot selected",
      });
      return;
    }

    const startDisplay = toDisplayDateTime(startDate, startTime);
    const endDisplay = toDisplayDateTime(endDate, endTime);

    const start_at = displayInputToApiLocal(startDisplay);
    if (startDisplay.trim() && start_at === null) {
      notify.validation("banners-form", { start_at: tPages("datetimeInputInvalid") });
      return;
    }
    const end_at = displayInputToApiLocal(endDisplay);
    if (endDisplay.trim() && end_at === null) {
      notify.validation("banners-form", { end_at: tPages("datetimeInputInvalid") });
      return;
    }
    if (start_at && end_at && new Date(`${start_at}:00Z`) > new Date(`${end_at}:00Z`)) {
      notify.validation("banners-form", { end_at: tPages("ctaEndAfterStartInvalid") });
      return;
    }

    setSaving(true);
    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("cta_text", form.cta_text);
    fd.append("cta_link", form.cta_link.trim());
    fd.append("order", form.order || "0");
    fd.append("is_active", String(form.is_active));
    fd.append("placement_slots", JSON.stringify(form.placement_slots));
    if (start_at) fd.append("start_at", start_at);
    if (end_at) fd.append("end_at", end_at);
    if (imageFile) fd.append("image", imageFile);

    try {
      if (editing === "new") {
        await api.post("admin/banners/", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.patch(`admin/banners/${editing}/`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      setEditing(null);
      notify.clearValidation("banners-form");
      notify.success(tPages("bannersSavedSuccess"));
      fetchData();
    } catch (err) {
      if (isAxiosError(err)) {
        console.error("Banner save failed:", err.response?.data || err.message);
        notify.error(err, { fallbackMessage: tCommon("pleaseWait") });
      } else {
        console.error(err);
        notify.error(err);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(publicId: string) {
    const ok = await confirm({
      title: tPages("confirmDialogTitleDeleteBanner"),
      message: tPages("bannersConfirmDelete"),
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`admin/banners/${publicId}/`);
      notify.warning(tPages("bannersDeletedSuccess"));
      fetchData();
    } catch (err) {
      console.error(err);
      notify.error(err);
    }
  }

  async function toggleActive(banner: Banner) {
    try {
      const { data } = await api.patch<Banner>(
        `admin/banners/${banner.public_id}/`,
        { is_active: !banner.is_active }
      );
      setBanners((prev) =>
        prev.map((b) => (b.public_id === data.public_id ? data : b))
      );
    } catch (err) {
      console.error(err);
      notify.error(err);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-card bg-muted/80 px-1 py-1 hidden md:block">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label={tPages("bannersGoBackAria")}
              className="flex items-center justify-center rounded-ui p-1 text-muted-foreground hover:bg-muted"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          </div>
          <h1 className="text-2xl font-medium text-foreground">
            {tPages("bannersTitle", { count: banners.length })}
          </h1>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-2 rounded-card bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {tPages("bannersAdd")}
        </button>
      </div>

      {editing !== null && (
        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-card border border-border bg-card p-6"
        >
          <h2 className="text-lg font-medium">
            {editing === "new" ? tPages("bannersNew") : tPages("bannersEdit")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">
                Placement slots
              </label>
              <div className="space-y-2">
                <Combobox<PlacementItem, true>
                  multiple
                  modal={false}
                  value={placementItems}
                  onValueChange={(next) => {
                    if (next === null) return;
                    const arr = Array.isArray(next) ? next : [next];
                    setForm((f) => ({
                      ...f,
                      placement_slots: arr.map((x) => x.value),
                    }));
                  }}
                  isItemEqualToValue={(a, b) => a.value === b.value}
                >
                  <ComboboxChips ref={placementAnchor} className="w-full">
                    {placementItems.map((item) => (
                      <ComboboxChip key={item.value}>{item.label}</ComboboxChip>
                    ))}
                    <ComboboxChipsInput placeholder="Select placements…" />
                  </ComboboxChips>
                  <ComboboxContent anchor={placementAnchor}>
                    <ComboboxList>
                      {PLACEMENT_OPTIONS.map((opt) => {
                        const item: PlacementItem = {
                          value: opt.value,
                          label: opt.label,
                        };
                        return (
                          <ComboboxItem key={opt.value} value={item}>
                            <span className="text-sm font-medium">
                              {opt.label}
                            </span>
                          </ComboboxItem>
                        );
                      })}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
                <p className="text-xs text-muted-foreground">
                  {formatPlacements(form.placement_slots)}
                </p>
                <MiniSitePreview placements={form.placement_slots} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{tPages("bannersLabelTitle")}</label>
              <Input
                type="text"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                className="text-sm"
                placeholder={tCommon("optional")}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                {tPages("bannersLabelDisplayOrder")}
              </label>
              <Input
                type="number"
                min={0}
                value={form.order}
                onChange={(e) =>
                  setForm((f) => ({ ...f, order: e.target.value }))
                }
                className="text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">{tPages("bannersLabelCtaText")}</label>
              <Input
                type="text"
                value={form.cta_text}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cta_text: e.target.value }))
                }
                className="text-sm"
                placeholder={tPages("bannersCtaPlaceholder")}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">{tPages("bannersLabelCtaLink")}</label>
              <Input
                type="url"
                value={form.cta_link}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cta_link: e.target.value }))
                }
                className="text-sm"
                placeholder={tPages("bannersUrlPlaceholder")}
              />
            </div>
            <div ref={startPickerRef} className="relative">
              <label className="mb-1 block text-sm font-medium">{tPages("bannersLabelStart")}</label>
              <InputGroup
                className="cursor-pointer"
                onClick={() => setStartPickerOpen((open) => !open)}
              >
                <InputGroupInput
                  readOnly
                  value={toDisplayDateTime(startDate, startTime)}
                  placeholder={tPages("datetimeInputPlaceholder")}
                  className={cn("cursor-pointer text-sm", numClass)}
                />
                <InputGroupAddon align="inline-end">
                  <Clock2Icon className="text-muted-foreground" />
                </InputGroupAddon>
              </InputGroup>
              {startPickerOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 w-fit max-w-[calc(100vw-2rem)]">
                  <div className="rounded-card border border-border bg-card p-1 shadow-lg">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      disabled={(date) => date < today}
                      className="[--cell-size:--spacing(7)] sm:[--cell-size:--spacing(8)]"
                    />
                    <div className="space-y-1 border-t border-border px-2 pt-3 pb-2">
                      <label
                        htmlFor="banner-start-time"
                        className="block text-xs text-muted-foreground"
                      >
                        {tPages("ctaStartTime")}
                      </label>
                      <InputGroup>
                        <InputGroupInput
                          id="banner-start-time"
                          type="time"
                          step="1"
                          min={startDate && isSameCalendarDate(startDate, today) ? currentStartTime : undefined}
                          value={startTime}
                          onChange={(e) => setStartTime(normalizeTime(e.target.value))}
                          className={cn(
                            "appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none",
                            numClass
                          )}
                        />
                        <InputGroupAddon align="inline-end">
                          <Clock2Icon className="text-muted-foreground" />
                        </InputGroupAddon>
                      </InputGroup>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={endPickerRef} className="relative">
              <label className="mb-1 block text-sm font-medium">{tPages("bannersLabelEnd")}</label>
              <InputGroup
                className="cursor-pointer"
                onClick={() => setEndPickerOpen((open) => !open)}
              >
                <InputGroupInput
                  readOnly
                  value={toDisplayDateTime(endDate, endTime)}
                  placeholder={tPages("datetimeInputPlaceholder")}
                  className={cn("cursor-pointer text-sm", numClass)}
                />
                <InputGroupAddon align="inline-end">
                  <Clock2Icon className="text-muted-foreground" />
                </InputGroupAddon>
              </InputGroup>
              {endPickerOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-fit max-w-[calc(100vw-2rem)] md:left-0 md:right-auto">
                  <div className="rounded-card border border-border bg-card p-1 shadow-lg">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => startOfDay(date) < minEndDate}
                      className="[--cell-size:--spacing(7)] sm:[--cell-size:--spacing(8)]"
                    />
                    <div className="space-y-1 border-t border-border px-2 pt-3 pb-2">
                      <label className="block text-xs text-muted-foreground">
                        {tPages("ctaEndTime")}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => applyEndOffsetFromNow(15)}
                          className="rounded-ui border border-border px-2 py-1.5 text-xs text-foreground hover:bg-muted"
                        >
                          +15 min
                        </button>
                        <button
                          type="button"
                          onClick={() => applyEndOffsetFromNow(30)}
                          className="rounded-ui border border-border px-2 py-1.5 text-xs text-foreground hover:bg-muted"
                        >
                          +30 min
                        </button>
                        <button
                          type="button"
                          onClick={() => applyEndOffsetFromNow(60)}
                          className="rounded-ui border border-border px-2 py-1.5 text-xs text-foreground hover:bg-muted"
                        >
                          +1 hr
                        </button>
                        <button
                          type="button"
                          onClick={() => applyEndOffsetFromNow(120)}
                          className="rounded-ui border border-border px-2 py-1.5 text-xs text-foreground hover:bg-muted"
                        >
                          +2 hr
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">{tPages("bannersLabelImage")}</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="form-file-input text-sm"
              />
              {editing !== "new" && !imageFile && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {tPages("bannersKeepImageHint")}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                id="is_active"
                className="form-checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, is_active: e.target.checked }))
                }
              />
              <label htmlFor="is_active" className="text-sm">
                {tCommon("active")}
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || (editing === "new" && !imageFile)}
              className="rounded-card bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? tCommon("saving") : tCommon("save")}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-card border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              {tCommon("cancel")}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-card border border-dashed border-card-border bg-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="th">{tPages("bannersColPreview")}</th>
              <th className="th">{tPages("bannersColTitle")}</th>
              <th className="th">Placements</th>
              <th className="th">{tPages("bannersColOrder")}</th>
              <th className="th">{tPages("ctaColSchedule")}</th>
              <th className="th">{tPages("bannersColStatus")}</th>
              <th className="th text-right">{tPages("bannersColActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {banners.map((b) => (
              <ClickableTableRow
                key={b.public_id}
                onNavigate={() => openEdit(b)}
                aria-label={b.title?.trim() ? b.title : `Banner ${b.public_id}`}
              >
                <td className="px-4 py-3">
                  {b.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.image}
                      alt=""
                      className="h-12 w-20 rounded-ui object-cover"
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-foreground">
                  {b.title || "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatPlacements(b.placement_slots || [])}
                </td>
                <td className="px-4 py-3">{b.order}</td>
                <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                  {b.start_at
                    ? `${formatDashboardDateTime(b.start_at, locale)} - ${
                        b.end_at
                          ? formatDashboardDateTime(b.end_at, locale)
                          : tPages("ctaScheduleInfinity")
                      }`
                    : tPages("ctaScheduleAlways")}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleActive(b)}
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      b.is_active
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {b.is_active ? tCommon("active") : tCommon("inactive")}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <ClickableText
                    variant="destructive"
                    onClick={() => handleDelete(b.public_id)}
                    className="text-sm"
                  >
                    {tCommon("delete")}
                  </ClickableText>
                </td>
              </ClickableTableRow>
            ))}
          </tbody>
        </table>
      </div>

      {banners.length === 0 && !editing && (
        <div className="rounded-card border border-dashed border-card-border bg-card py-12 text-center text-sm text-muted-foreground">
          {tPages("bannersEmpty")}
        </div>
      )}
    </div>
  );
}
