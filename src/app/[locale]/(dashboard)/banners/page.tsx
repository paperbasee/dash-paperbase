"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Undo2} from "lucide-react";
import { isAxiosError } from "axios";
import api from "@/lib/api";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { ClickableText } from "@/components/ui/clickable-text";
import { Input } from "@/components/ui/input";
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

function formatPlacements(values: string[]): string {
  if (!values?.length) return "—";
  const map = new Map(PLACEMENT_OPTIONS.map((o) => [o.value, o.label] as const));
  return values.map((v) => map.get(v) ?? v).join(", ");
}

type PlacementItem = { value: string; label: string };

export default function BannersPage() {
  const router = useRouter();
  const locale = useLocale();
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const confirm = useConfirm();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<BannerForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const placementAnchor = useComboboxAnchor();

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

  function openNew() {
    setEditing("new");
    setForm(emptyForm);
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
    setImageFile(null);
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

    const start_at = displayInputToApiLocal(form.start_at);
    if (form.start_at.trim() && start_at === null) {
      notify.validation("banners-form", { start_at: tPages("datetimeInputInvalid") });
      return;
    }
    const end_at = displayInputToApiLocal(form.end_at);
    if (form.end_at.trim() && end_at === null) {
      notify.validation("banners-form", { end_at: tPages("datetimeInputInvalid") });
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
            <div>
              <label className="mb-1 block text-sm font-medium">{tPages("bannersLabelStart")}</label>
              <Input
                type="text"
                autoComplete="off"
                placeholder={tPages("datetimeInputPlaceholder")}
                value={form.start_at}
                onChange={(e) =>
                  setForm((f) => ({ ...f, start_at: e.target.value }))
                }
                className="text-sm font-numbers"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{tPages("bannersLabelEnd")}</label>
              <Input
                type="text"
                autoComplete="off"
                placeholder={tPages("datetimeInputPlaceholder")}
                value={form.end_at}
                onChange={(e) =>
                  setForm((f) => ({ ...f, end_at: e.target.value }))
                }
                className="text-sm font-numbers"
              />
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
              <th className="th">{tPages("bannersColStart")}</th>
              <th className="th">{tPages("bannersColEnd")}</th>
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
                <td className="px-4 py-3 text-muted-foreground">
                  {b.start_at ? formatDashboardDateTime(b.start_at, locale) : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {b.end_at ? formatDashboardDateTime(b.end_at, locale) : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      b.is_active
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {b.is_active ? tCommon("active") : tCommon("inactive")}
                  </span>
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
