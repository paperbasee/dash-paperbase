"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Clock2Icon, Undo2 } from "lucide-react";
import { isAxiosError } from "axios";
import api from "@/lib/api";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { ClickableText } from "@/components/ui/clickable-text";
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
import { DashboardDetailSkeleton } from "@/components/skeletons/dashboard-skeletons";
import { numberTextClass } from "@/lib/number-font";
import { cn } from "@/lib/utils";
import { useEnterNavigation } from "@/hooks/useEnterNavigation";
import { buildPublicMediaUrlFromKey, uploadFile } from "@/hooks/usePresignedUpload";

const Calendar = dynamic(
  () => import("@/components/ui/calendar").then((mod) => mod.Calendar),
  {
    ssr: false,
    loading: () => <div className="h-56 w-64 animate-pulse rounded-card bg-muted/40" />,
  }
);

const ALLOWED_PLACEMENTS = new Set([
  "home_top",
  "home_mid",
  "home_bottom",
]);

const MAX_BANNER_IMAGES = 5;

type BannerImageSlot =
  | { kind: "empty" }
  | { kind: "remote"; publicId: string; url: string }
  | { kind: "legacy"; url: string }
  | {
      kind: "local";
      file: File;
      previewUrl: string;
      uploadedKey: string;
      /** Replace legacy main image (multipart `image`). */
      uploadAsMain?: boolean;
      /** Gallery row being replaced (delete + new gallery file). */
      replacePublicId?: string;
    };

function emptyBannerSlots(): BannerImageSlot[] {
  return Array.from({ length: MAX_BANNER_IMAGES }, () => ({ kind: "empty" as const }));
}

function slotsFromBanner(banner: Banner): BannerImageSlot[] {
  const slots = emptyBannerSlots();
  const imgs = [...(banner.images ?? [])].sort((a, b) => a.order - b.order);
  let i = 0;
  for (const im of imgs) {
    if (i >= MAX_BANNER_IMAGES) break;
    const u = im.image_url?.trim();
    if (u) {
      slots[i] = { kind: "remote", publicId: im.public_id, url: u };
      i += 1;
    }
  }
  if (i === 0 && banner.image?.trim()) {
    slots[0] = { kind: "legacy", url: banner.image.trim() };
  }
  return slots;
}

function countFilledSlots(slots: BannerImageSlot[]): number {
  return slots.filter((s) => s.kind !== "empty").length;
}

function revokeSlotPreview(_slot: BannerImageSlot) {}

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

function isBannerCurrentlyActiveLive(
  banner: Pick<Banner, "is_active" | "start_at" | "end_at">,
  now: Date
): boolean {
  if (!banner.is_active) return false;
  if (banner.start_at) {
    const start = new Date(banner.start_at);
    if (!Number.isNaN(start.getTime()) && now < start) return false;
  }
  if (banner.end_at) {
    const end = new Date(banner.end_at);
    if (!Number.isNaN(end.getTime()) && now > end) return false;
  }
  return true;
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
  const [imageSlots, setImageSlots] = useState<BannerImageSlot[]>(emptyBannerSlots);
  const [pendingDeleteImagePublicIds, setPendingDeleteImagePublicIds] = useState<string[]>([]);
  const [slotStatus, setSlotStatus] = useState<("idle" | "uploading" | "uploaded" | "error")[]>(
    () => Array(MAX_BANNER_IMAGES).fill("idle")
  );
  const [slotProgress, setSlotProgress] = useState<number[]>(
    () => Array(MAX_BANNER_IMAGES).fill(0)
  );
  const [slotError, setSlotError] = useState<(string | null)[]>(
    () => Array(MAX_BANNER_IMAGES).fill(null)
  );
  const [saving, setSaving] = useState(false);
  const { handleKeyDown } = useEnterNavigation(() => {
    const formEl = document.querySelector("#banner-form") ?? document.querySelector("form");
    if (formEl instanceof HTMLFormElement) formEl.requestSubmit();
  });
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

  function clearImageSlot(index: number) {
    setImageSlots((prev) => {
      const cur = prev[index];
      const rid = cur.kind === "local" && cur.replacePublicId ? cur.replacePublicId : null;
      revokeSlotPreview(cur);
      const next = [...prev];
      next[index] = { kind: "empty" };
      if (rid) {
        setPendingDeleteImagePublicIds((p) => (p.includes(rid) ? p : [...p, rid]));
      }
      return next;
    });
    setSlotStatus((prev) => prev.map((s, i) => (i === index ? "idle" : s)));
    setSlotProgress((prev) => prev.map((p, i) => (i === index ? 0 : p)));
    setSlotError((prev) => prev.map((e, i) => (i === index ? null : e)));
  }

  function removeRemoteSlot(index: number, publicId: string) {
    setPendingDeleteImagePublicIds((p) => (p.includes(publicId) ? p : [...p, publicId]));
    clearImageSlot(index);
  }

  async function onSlotFileInputChange(index: number, file: File | null) {
    if (!file) return;
    setSlotStatus((prev) => prev.map((s, i) => (i === index ? "uploading" : s)));
    setSlotProgress((prev) => prev.map((p, i) => (i === index ? 0 : p)));
    setSlotError((prev) => prev.map((e, i) => (i === index ? null : e)));
    let uploadedKey = "";
    try {
      const result = await uploadFile(file, {
        entity: "banner",
        onProgress: (percent) =>
          setSlotProgress((prev) => prev.map((p, i) => (i === index ? percent : p))),
      });
      uploadedKey = result.key;
    } catch (err) {
      setSlotStatus((prev) => prev.map((s, i) => (i === index ? "error" : s)));
      setSlotError((prev) =>
        prev.map((e, i) => (i === index ? (err instanceof Error ? err.message : "Upload failed.") : e))
      );
      return;
    }
    setImageSlots((prev) => {
      const cur = prev[index];
      if (cur.kind === "empty" && countFilledSlots(prev) >= MAX_BANNER_IMAGES) {
        return prev;
      }
      const previewUrl = buildPublicMediaUrlFromKey(uploadedKey);
      const next = [...prev];
      revokeSlotPreview(next[index]);
      if (cur.kind === "legacy") {
        next[index] = { kind: "local", file, previewUrl, uploadedKey, uploadAsMain: true };
      } else if (cur.kind === "remote") {
        next[index] = { kind: "local", file, previewUrl, uploadedKey, replacePublicId: cur.publicId };
      } else {
        next[index] = { kind: "local", file, previewUrl, uploadedKey };
      }
      return next;
    });
    setSlotStatus((prev) => prev.map((s, i) => (i === index ? "uploaded" : s)));
  }

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
    setImageSlots(emptyBannerSlots());
    setPendingDeleteImagePublicIds([]);
    setSlotStatus(Array(MAX_BANNER_IMAGES).fill("idle"));
    setSlotProgress(Array(MAX_BANNER_IMAGES).fill(0));
    setSlotError(Array(MAX_BANNER_IMAGES).fill(null));
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
    setImageSlots(slotsFromBanner(banner));
    setPendingDeleteImagePublicIds([]);
    setSlotStatus(Array(MAX_BANNER_IMAGES).fill("idle"));
    setSlotProgress(Array(MAX_BANNER_IMAGES).fill(0));
    setSlotError(Array(MAX_BANNER_IMAGES).fill(null));
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
    if (slotStatus.some((s) => s === "uploading")) {
      notify.warning("Please wait for image uploads to finish.");
      return;
    }
    const hasIncompleteUpload = imageSlots.some(
      (slot) => slot.kind === "local" && !slot.uploadedKey
    );
    if (hasIncompleteUpload) {
      notify.warning("One or more image uploads failed. Retry before saving.");
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
    const deleteIds = new Set<string>(pendingDeleteImagePublicIds);
    for (const s of imageSlots) {
      if (s.kind === "local" && s.replacePublicId) {
        deleteIds.add(s.replacePublicId);
      }
    }
    fd.append("image_public_ids_to_delete", JSON.stringify([...deleteIds]));

    let appendedMain = false;
    for (const s of imageSlots) {
      if (s.kind !== "local") continue;
      if (s.uploadAsMain) {
        if (!appendedMain) {
          fd.append("image_key", s.uploadedKey);
          appendedMain = true;
        }
      } else {
        fd.append("uploaded_image_keys", s.uploadedKey);
      }
    }

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
          id="banner-form"
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
                onKeyDown={handleKeyDown}
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
                onKeyDown={handleKeyDown}
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
                onKeyDown={handleKeyDown}
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
                onKeyDown={handleKeyDown}
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
                <div className="absolute left-0 top-full z-50 mt-2 w-fit max-w-[calc(100vw-2rem)] md:top-auto md:bottom-full md:mb-2 md:mt-0">
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
                <div className="absolute right-0 top-full z-50 mt-2 w-fit max-w-[calc(100vw-2rem)] md:left-0 md:right-auto md:top-auto md:bottom-full md:mb-2 md:mt-0">
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
            <div className="sm:col-span-2 space-y-2">
              <label className="mb-1 block text-sm font-medium">{tPages("bannersLabelImage")}</label>
              <p className="text-xs text-muted-foreground">
                {tPages("bannersImagesHint", { max: MAX_BANNER_IMAGES })}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 min-[520px]:grid-cols-3 lg:grid-cols-5">
                {imageSlots.map((slot, index) => {
                  const filled = countFilledSlots(imageSlots);
                  const showPreview =
                    slot.kind === "remote" || slot.kind === "legacy" || slot.kind === "local";
                  const previewSrc =
                    slot.kind === "local"
                      ? slot.previewUrl
                      : slot.kind === "remote"
                        ? slot.url
                        : slot.kind === "legacy"
                          ? slot.url
                          : null;
                  const canAddInEmpty =
                    slot.kind === "empty" && filled < MAX_BANNER_IMAGES;
                  return (
                    <div
                      key={index}
                      className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card p-2 shadow-sm ring-1 ring-border/40"
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-1">
                        <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {index + 1}
                        </span>
                        {(slot.kind === "remote" || slot.kind === "local") && (
                          <button
                            type="button"
                            title={tCommon("delete")}
                            className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-ui border border-border text-sm leading-none text-muted-foreground hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => {
                              if (slot.kind === "remote") {
                                removeRemoteSlot(index, slot.publicId);
                              } else {
                                clearImageSlot(index);
                              }
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border/80 bg-muted/30">
                        {showPreview && previewSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={previewSrc}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full min-h-[72px] w-full items-center justify-center text-xs text-muted-foreground">
                            —
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={(slot.kind === "empty" && !canAddInEmpty) || slotStatus[index] === "uploading"}
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          e.target.value = "";
                          void onSlotFileInputChange(index, f);
                        }}
                        className="form-file-input mt-2 w-full min-w-0 text-[11px] file:mr-2 file:rounded-md file:border-0 file:bg-primary/15 file:px-2 file:py-1 file:text-[11px] file:font-medium file:text-foreground hover:file:bg-primary/25"
                        onKeyDown={handleKeyDown}
                      />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {slotStatus[index] === "uploading" ? `Uploading ${slotProgress[index]}%` : slotStatus[index] === "uploaded" ? "Replace" : slotStatus[index] === "error" ? (
                          <button
                            type="button"
                            className="text-destructive underline"
                            onClick={() => {
                              const local = imageSlots[index];
                              if (local.kind === "local") void onSlotFileInputChange(index, local.file);
                            }}
                          >
                            Failed. Retry
                          </button>
                        ) : "Upload Image"}
                      </p>
                      {slotError[index] && <p className="text-[11px] text-destructive">{slotError[index]}</p>}
                    </div>
                  );
                })}
              </div>
              {editing !== "new" && countFilledSlots(imageSlots) === 0 && (
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
                onKeyDown={handleKeyDown}
              />
              <label htmlFor="is_active" className="text-sm">
                {tCommon("active")}
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || slotStatus.some((s) => s === "uploading") || (editing === "new" && countFilledSlots(imageSlots) === 0)}
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
                  {(() => {
                    const isCurrentlyActive = isBannerCurrentlyActiveLive(b, now);
                    return (
                  <button
                    type="button"
                    onClick={() => toggleActive(b)}
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      isCurrentlyActive
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                    title={
                      b.is_active && !isCurrentlyActive
                        ? "Enabled, but outside scheduled time"
                        : undefined
                    }
                  >
                    {isCurrentlyActive ? tCommon("active") : tCommon("inactive")}
                  </button>
                    );
                  })()}
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
