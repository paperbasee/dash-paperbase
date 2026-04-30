"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Clock2Icon, Undo2 } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { ClickableText } from "@/components/ui/clickable-text";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Notification, PaginatedResponse } from "@/types";
import { formatDashboardDateTime } from "@/lib/datetime-display";
import { displayInputToApiLocal, isoDatetimeToDisplayInput } from "@/lib/datetime-form";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { notify } from "@/notifications";
import { numberTextClass } from "@/lib/number-font";
import { cn } from "@/lib/utils";
import { DashboardDetailSkeleton } from "@/components/skeletons/dashboard-skeletons";
import { useEnterNavigation } from "@/hooks/useEnterNavigation";

const Calendar = dynamic(
  () => import("@/components/ui/calendar").then((mod) => mod.Calendar),
  {
    ssr: false,
    loading: () => <div className="h-56 w-64 animate-pulse rounded-card bg-muted/40" />,
  }
);

type CtaForm = {
  cta_text: string;
  notification_type: string;
  is_active: boolean;
  link: string;
  link_text: string;
  start_date: string;
  end_date: string;
  order: string;
};

const emptyForm: CtaForm = {
  cta_text: "",
  notification_type: "banner",
  is_active: true,
  link: "",
  link_text: "",
  start_date: "",
  end_date: "",
  order: "0",
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

export default function CtaPage() {
  const router = useRouter();
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const confirm = useConfirm();
  const [ctas, setCtas] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<CtaForm>(emptyForm);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState(currentTime24h());
  const [endTime, setEndTime] = useState("12:30:00");
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);
  const startPickerRef = useRef<HTMLDivElement | null>(null);
  const endPickerRef = useRef<HTMLDivElement | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [saving, setSaving] = useState(false);
  const { handleKeyDown } = useEnterNavigation(() => {
    const formEl = document.querySelector("#cta-form") ?? document.querySelector("form");
    if (formEl instanceof HTMLFormElement) formEl.requestSubmit();
  });
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const currentStartTime = currentTime24h(now);
  const startDateTime = startDate ? toDateTime(startDate, startTime) : undefined;
  const minEndDate =
    startDateTime && startDateTime > today ? startOfDay(startDateTime) : today;

  function applyEndOffsetFromNow(minutes: number) {
    const baseline = startDateTime && startDateTime > now ? startDateTime : now;
    const target = new Date(baseline);
    target.setMinutes(target.getMinutes() + minutes);
    setEndDate(new Date(target.getFullYear(), target.getMonth(), target.getDate()));
    setEndTime(toTime24hWithSeconds(target));
  }

  function fetchData() {
    setLoading(true);
    api
      .get<PaginatedResponse<Notification> | Notification[]>("admin/notifications/")
      .then((res) => {
        const data = res.data;
        setCtas(Array.isArray(data) ? data : data.results);
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
  }, [endDate, endTime, today, currentStartTime, minEndDate, startDateTime, startTime]);

  function openNew() {
    setEditing("new");
    setForm(emptyForm);
    setStartDate(undefined);
    setEndDate(undefined);
    setStartTime(currentTime24h());
    setEndTime("12:30:00");
    setStartPickerOpen(false);
    setEndPickerOpen(false);
  }

  function openEdit(n: Notification) {
    setEditing(n.public_id);
    setForm({
      cta_text: n.cta_text,
      notification_type: n.notification_type,
      is_active: n.is_active,
      link: n.link || "",
      link_text: n.link_text || "",
      start_date: isoDatetimeToDisplayInput(n.start_date),
      end_date: isoDatetimeToDisplayInput(n.end_date),
      order: String(n.order),
    });
    const parsedStart = parseDisplayDateTime(isoDatetimeToDisplayInput(n.start_date));
    const parsedEnd = parseDisplayDateTime(isoDatetimeToDisplayInput(n.end_date));
    setStartDate(parsedStart.date);
    setEndDate(parsedEnd.date);
    setStartTime(parsedStart.time);
    setEndTime(parsedEnd.time);
    setStartPickerOpen(false);
    setEndPickerOpen(false);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();

    const startDisplay = toDisplayDateTime(startDate, startTime);
    const endDisplay = toDisplayDateTime(endDate, endTime);

    const start_date = displayInputToApiLocal(startDisplay);
    if (startDisplay.trim() && start_date === null) {
      notify.validation("cta-form", { start_date: tPages("datetimeInputInvalid") });
      return;
    }
    const end_date = displayInputToApiLocal(endDisplay);
    if (endDisplay.trim() && end_date === null) {
      notify.validation("cta-form", { end_date: tPages("datetimeInputInvalid") });
      return;
    }
    if (start_date && end_date && new Date(`${start_date}:00Z`) > new Date(`${end_date}:00Z`)) {
      notify.validation("cta-form", { end_date: tPages("ctaEndAfterStartInvalid") });
      return;
    }

    setSaving(true);

    const payload: Record<string, unknown> = {
      cta_text: form.cta_text,
      notification_type: form.notification_type,
      is_active: form.is_active,
      order: Number(form.order),
      link: form.link || null,
      link_text: form.link_text,
      start_date,
      end_date,
    };

    try {
      if (editing === "new") {
        if (ctas.length > 0) {
          notify.warning("A CTA already exists for this store. Edit the existing CTA instead.");
          setEditing(ctas[0]?.public_id ?? null);
          return;
        }
        await api.post("admin/notifications/", payload);
      } else {
        await api.patch(`admin/notifications/${editing}/`, payload);
      }
      setEditing(null);
      notify.clearValidation("cta-form");
      notify.success(tPages("ctaSavedSuccess"));
      fetchData();
    } catch (err) {
      console.error(err);
      notify.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(n: Notification) {
    try {
      const { data } = await api.patch<Notification>(
        `admin/notifications/${n.public_id}/`,
        { is_active: !n.is_active }
      );
      setCtas((prev) =>
        prev.map((x) => (x.public_id === data.public_id ? data : x))
      );
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(publicId: string) {
    const ok = await confirm({
      title: tPages("confirmDialogTitleDeleteNotification"),
      message: tPages("ctaConfirmDelete"),
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`admin/notifications/${publicId}/`);
      setCtas((prev) => prev.filter((n) => n.public_id !== publicId));
      notify.warning(tPages("ctaDeletedSuccess"));
    } catch (err) {
      console.error(err);
      notify.error(err);
    }
  }

  if (loading) {
    return <DashboardDetailSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-card bg-muted/80 px-1 py-1 hidden md:block">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label={tPages("ctaGoBackAria")}
              className="flex items-center justify-center rounded-ui p-1 text-muted-foreground hover:bg-muted"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          </div>
          <h1 className="text-2xl font-medium text-foreground">
            {tPages("ctaTitle", { count: ctas.length })}
          </h1>
        </div>
        {editing === null && ctas.length === 0 ? (
          <button
            onClick={openNew}
            className="rounded-card bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {tPages("ctaAdd")}
          </button>
        ) : null}
      </div>

      {editing !== null && (
        <form
          id="cta-form"
          onSubmit={handleSave}
          className="space-y-3 rounded-card border border-primary/30 bg-primary/5 p-4"
        >
          <p className="text-sm font-semibold text-primary">
            {editing === "new" ? tPages("ctaNew") : tPages("ctaEdit")}
          </p>
          <Textarea
            required
            placeholder={tPages("ctaTextPlaceholder")}
            rows={2}
            value={form.cta_text}
            onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
            className="text-sm"
          />
          <div className="grid grid-cols-3 gap-3">
            <Select
              value={form.notification_type}
              onChange={(e) =>
                setForm({ ...form, notification_type: e.target.value })
              }
              className="text-sm"
            >
              <option value="banner">{tPages("ctaTypeBanner")}</option>
              <option value="alert">{tPages("ctaTypeAlert")}</option>
              <option value="promo">{tPages("ctaTypePromo")}</option>
            </Select>
            <Input
              type="number"
              placeholder={tPages("ctaPlaceholderOrder")}
              value={form.order}
              onChange={(e) => setForm({ ...form, order: e.target.value })}
              className="text-sm"
              onKeyDown={handleKeyDown}
            />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="form-checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
                onKeyDown={handleKeyDown}
              />{" "}
              {tCommon("active")}
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder={tPages("ctaLinkUrlOptional")}
              type="url"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              className="text-sm"
              onKeyDown={handleKeyDown}
            />
            <Input
              placeholder={tPages("ctaLinkTextOptional")}
              value={form.link_text}
              onChange={(e) =>
                setForm({ ...form, link_text: e.target.value })
              }
              className="text-sm"
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div ref={startPickerRef} className="relative">
              <label className="mb-1 block text-xs text-muted-foreground">
                {tPages("ctaStartOptional")}
              </label>
              <InputGroup
                className="cursor-pointer"
                onClick={() => setStartPickerOpen((open) => !open)}
              >
                <InputGroupInput
                  readOnly
                  value={toDisplayDateTime(startDate, startTime)}
                  placeholder={tPages("datetimeInputPlaceholder")}
                  className={cn("cursor-pointer", numClass)}
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
                        htmlFor="cta-start-time"
                        className="block text-xs text-muted-foreground"
                      >
                        {tPages("ctaStartTime")}
                      </label>
                      <InputGroup>
                        <InputGroupInput
                          id="cta-start-time"
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
              <label className="mb-1 block text-xs text-muted-foreground">
                {tPages("ctaEndOptional")}
              </label>
              <InputGroup
                className="cursor-pointer"
                onClick={() => setEndPickerOpen((open) => !open)}
              >
                <InputGroupInput
                  readOnly
                  value={toDisplayDateTime(endDate, endTime)}
                  placeholder={tPages("datetimeInputPlaceholder")}
                  className={cn("cursor-pointer", numClass)}
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
                      <label
                        className="block text-xs text-muted-foreground"
                      >
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
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              loading={saving}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-card bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {tPages("ctaSave")}
            </Button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-card border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
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
              <th className="th">{tPages("ctaColText")}</th>
              <th className="th">{tPages("ctaColType")}</th>
              <th className="th">{tPages("ctaColActive")}</th>
              <th className="th">{tPages("ctaColSchedule")}</th>
              <th className="th">{tPages("ctaColActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {ctas.map((n) => (
              <ClickableTableRow
                key={n.public_id}
                onNavigate={() => openEdit(n)}
                aria-label={
                  n.cta_text?.trim()
                    ? n.cta_text
                    : `CTA ${n.public_id}`
                }
              >
                <td className="max-w-xs truncate px-4 py-3 font-medium text-foreground">
                  {n.cta_text}
                </td>
                <td className="px-4 py-3 text-muted-foreground capitalize">
                  {n.notification_type}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(n)}
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      n.is_currently_active
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                    title={
                      n.is_active && !n.is_currently_active
                        ? "Enabled, but outside scheduled time"
                        : undefined
                    }
                  >
                    {n.is_currently_active ? tCommon("active") : tCommon("inactive")}
                  </button>
                </td>
                <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                  {n.start_date
                    ? `${formatDashboardDateTime(n.start_date, locale)} - ${
                        n.end_date
                          ? formatDashboardDateTime(n.end_date, locale)
                          : tPages("ctaScheduleInfinity")
                      }`
                    : tPages("ctaScheduleAlways")}
                </td>
                <td className="px-4 py-3">
                  <ClickableText
                    variant="destructive"
                    onClick={() => handleDelete(n.public_id)}
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
    </div>
  );
}

