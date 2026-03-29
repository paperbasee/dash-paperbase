"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Undo2 } from "lucide-react";
import api from "@/lib/api";
import { ClickableText } from "@/components/ui/clickable-text";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Notification, PaginatedResponse } from "@/types";
import { formatDashboardDateOptional } from "@/lib/datetime-display";
import { displayInputToApiLocal, isoDatetimeToDisplayInput } from "@/lib/datetime-form";

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

export default function CtaPage() {
  const router = useRouter();
  const locale = useLocale();
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const [ctas, setCtas] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<CtaForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  function fetchData() {
    setLoading(true);
    api
      .get<PaginatedResponse<Notification> | Notification[]>("admin/notifications/")
      .then((res) => {
        const data = res.data;
        setCtas(Array.isArray(data) ? data : data.results);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchData();
  }, []);

  function openNew() {
    setEditing("new");
    setForm(emptyForm);
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
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();

    const start_date = displayInputToApiLocal(form.start_date);
    if (form.start_date.trim() && start_date === null) {
      window.alert(tPages("datetimeInputInvalid"));
      return;
    }
    const end_date = displayInputToApiLocal(form.end_date);
    if (form.end_date.trim() && end_date === null) {
      window.alert(tPages("datetimeInputInvalid"));
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
        await api.post("admin/notifications/", payload);
      } else {
        await api.patch(`admin/notifications/${editing}/`, payload);
      }
      setEditing(null);
      fetchData();
    } catch (err) {
      console.error(err);
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
    if (!confirm(tPages("ctaConfirmDelete"))) return;
    try {
      await api.delete(`admin/notifications/${publicId}/`);
      setCtas((prev) => prev.filter((n) => n.public_id !== publicId));
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted/80 px-1 py-1">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label={tPages("ctaGoBackAria")}
              className="flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          </div>
          <h1 className="text-2xl font-medium text-foreground">
            {tPages("ctaTitle", { count: ctas.length })}
          </h1>
        </div>
        <button
          onClick={openNew}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {tPages("ctaAdd")}
        </button>
      </div>

      {editing !== null && (
        <form
          onSubmit={handleSave}
          className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4"
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
            />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="form-checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
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
            />
            <Input
              placeholder={tPages("ctaLinkTextOptional")}
              value={form.link_text}
              onChange={(e) =>
                setForm({ ...form, link_text: e.target.value })
              }
              className="text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                {tPages("ctaStartOptional")}
              </label>
              <Input
                type="text"
                autoComplete="off"
                placeholder={tPages("datetimeInputPlaceholder")}
                value={form.start_date}
                onChange={(e) =>
                  setForm({ ...form, start_date: e.target.value })
                }
                className="text-sm font-numbers"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                {tPages("ctaEndOptional")}
              </label>
              <Input
                type="text"
                autoComplete="off"
                placeholder={tPages("datetimeInputPlaceholder")}
                value={form.end_date}
                onChange={(e) =>
                  setForm({ ...form, end_date: e.target.value })
                }
                className="text-sm font-numbers"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? tCommon("saving") : tPages("ctaSave")}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
            >
              {tCommon("cancel")}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-dashed border-card-border bg-card">
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
              <tr key={n.public_id} className="hover:bg-muted/40">
                <td className="max-w-xs truncate px-4 py-3 font-medium text-foreground">
                  <ClickableText
                    onClick={() => openEdit(n)}
                    truncate
                    className="font-medium text-foreground"
                  >
                    {n.cta_text}
                  </ClickableText>
                </td>
                <td className="px-4 py-3 text-muted-foreground capitalize">
                  {n.notification_type}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(n)}
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      n.is_active
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {n.is_active ? tCommon("active") : tCommon("inactive")}
                  </button>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {n.start_date
                    ? `${formatDashboardDateOptional(n.start_date, locale)} - ${
                        n.end_date
                          ? formatDashboardDateOptional(n.end_date, locale)
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

