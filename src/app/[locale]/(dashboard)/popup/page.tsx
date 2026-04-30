"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ImageIcon, Undo2 } from "lucide-react";
import { isAxiosError } from "axios";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { ClickableText } from "@/components/ui/clickable-text";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { notify } from "@/notifications";
import { DashboardDetailSkeleton } from "@/components/skeletons/dashboard-skeletons";
import { numberTextClass } from "@/lib/number-font";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/context/ConfirmDialogContext";

import { buildPublicMediaUrlFromKey, uploadFile } from "@/hooks/usePresignedUpload";

const MAX_POPUP_IMAGES = 3;

type PopupShowFrequency = "session" | "daily" | "always";

type PopupForm = {
  title: string;
  description: string;
  button_text: string;
  button_link: string;
  delay_seconds: number;
  show_frequency: PopupShowFrequency;
  show_on_all_pages: boolean;
  is_active: boolean;
};

type PopupImageRemote = { kind: "remote"; publicId: string; url: string };
type PopupImageLocal = {
  kind: "local";
  file: File;
  previewUrl: string;
  uploadedKey: string;
  /** If we replaced an existing remote image, delete it on save. */
  replacePublicId?: string;
};
type PopupImageSlot = { kind: "empty" } | PopupImageRemote | PopupImageLocal;

const emptyForm: PopupForm = {
  title: "",
  description: "",
  button_text: "",
  button_link: "",
  delay_seconds: 5,
  show_frequency: "session",
  show_on_all_pages: true,
  is_active: false,
};

function emptySlots(): PopupImageSlot[] {
  return Array.from({ length: MAX_POPUP_IMAGES }, () => ({ kind: "empty" as const }));
}

function slotsFromPopup(popup: any | null): PopupImageSlot[] {
  const slots = emptySlots();
  if (!popup?.images?.length) return slots;
  const imgs = [...popup.images].sort((a: any, b: any) => a.order - b.order);
  for (let i = 0; i < imgs.length && i < MAX_POPUP_IMAGES; i += 1) {
    const im = imgs[i];
    if (im?.public_id && im?.image_url) {
      slots[i] = { kind: "remote", publicId: im.public_id, url: im.image_url };
    }
  }
  return slots;
}

function countFilled(slots: PopupImageSlot[]) {
  return slots.filter((s) => s.kind !== "empty").length;
}

export default function PopupEditorPage() {
  const router = useRouter();
  const locale = useLocale();
  const tCommon = useTranslations("common");

  const confirm = useConfirm();
  const numClass = numberTextClass(locale);

  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState<any | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<PopupForm>(emptyForm);
  const [imageSlots, setImageSlots] = useState<PopupImageSlot[]>(emptySlots);
  const [pendingDeleteImagePublicIds, setPendingDeleteImagePublicIds] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [slotStatus, setSlotStatus] = useState<("idle" | "uploading" | "uploaded" | "error")[]>(
    () => Array(MAX_POPUP_IMAGES).fill("idle"),
  );
  const [slotProgress, setSlotProgress] = useState<number[]>(() => Array(MAX_POPUP_IMAGES).fill(0));
  const [slotError, setSlotError] = useState<(string | null)[]>(() => Array(MAX_POPUP_IMAGES).fill(null));

  function resetToPopup(popup: any | null) {
    if (!popup) {
      setForm(emptyForm);
      setImageSlots(emptySlots());
      setPendingDeleteImagePublicIds([]);
      setSlotStatus(Array(MAX_POPUP_IMAGES).fill("idle"));
      setSlotProgress(Array(MAX_POPUP_IMAGES).fill(0));
      setSlotError(Array(MAX_POPUP_IMAGES).fill(null));
      return;
    }

    setForm({
      title: popup.title || "",
      description: popup.description || "",
      button_text: popup.button_text || "",
      button_link: popup.button_link || "",
      delay_seconds: popup.delay_seconds ?? 5,
      show_frequency: popup.show_frequency || "session",
      show_on_all_pages: Boolean(popup.show_on_all_pages),
      is_active: Boolean(popup.is_active),
    });
    setImageSlots(slotsFromPopup(popup));
    setPendingDeleteImagePublicIds([]);
    setSlotStatus(Array(MAX_POPUP_IMAGES).fill("idle"));
    setSlotProgress(Array(MAX_POPUP_IMAGES).fill(0));
    setSlotError(Array(MAX_POPUP_IMAGES).fill(null));
  }

  function fetchData() {
    setLoading(true);
    api
      .get<any>("admin/popups/")
      .then((res) => setPopup(res.data ?? null))
      .catch((err) => {
        console.error(err);
        notify.error(err);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openNew() {
    setEditing("new");
    resetToPopup(null);
  }

  function openEdit(p: any) {
    setEditing(p.public_id);
    resetToPopup(p);
  }

  function clearSlot(index: number) {
    setImageSlots((prev) => {
      const next = [...prev];
      const cur = next[index];
      if (cur.kind === "remote") {
        setPendingDeleteImagePublicIds((p) => (p.includes(cur.publicId) ? p : [...p, cur.publicId]));
      }
      next[index] = { kind: "empty" };
      return next;
    });
    setSlotStatus((prev) => prev.map((s, i) => (i === index ? "idle" : s)));
    setSlotProgress((prev) => prev.map((p, i) => (i === index ? 0 : p)));
    setSlotError((prev) => prev.map((e, i) => (i === index ? null : e)));
  }

  function removeRemoteImage(index: number, publicId: string) {
    setPendingDeleteImagePublicIds((p) => (p.includes(publicId) ? p : [...p, publicId]));
    clearSlot(index);
  }

  async function onSlotFileInputChange(index: number, file: File | null) {
    if (!file) return;

    setSlotStatus((prev) => prev.map((s, i) => (i === index ? "uploading" : s)));
    setSlotProgress((prev) => prev.map((p, i) => (i === index ? 0 : p)));
    setSlotError((prev) => prev.map((e, i) => (i === index ? null : e)));

    try {
      const result = await uploadFile(file, {
        entity: "popup" as any,
        onProgress: (percent) =>
          setSlotProgress((prev) => prev.map((p, i) => (i === index ? percent : p))),
      });

      const previewUrl = buildPublicMediaUrlFromKey(result.key);

      setImageSlots((prev) => {
        const next = [...prev];
        const cur = next[index];
        if (cur.kind === "remote") {
          next[index] = {
            kind: "local",
            file,
            previewUrl,
            uploadedKey: result.key,
            replacePublicId: cur.publicId,
          };
        } else {
          next[index] = { kind: "local", file, previewUrl, uploadedKey: result.key };
        }

        // If we replaced a remote image, mark it for deletion on save.
        if (cur.kind === "remote") {
          setPendingDeleteImagePublicIds((p) =>
            p.includes(cur.publicId) ? p : [...p, cur.publicId],
          );
        }

        return next;
      });

      setSlotStatus((prev) => prev.map((s, i) => (i === index ? "uploaded" : s)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setSlotStatus((prev) => prev.map((s, i) => (i === index ? "error" : s)));
      setSlotError((prev) => prev.map((e, i) => (i === index ? msg : e)));
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();

    if (slotStatus.some((s) => s === "uploading")) {
      notify.warning("Please wait for image uploads to finish.");
      return;
    }

    const hasIncomplete = imageSlots.some((s) => s.kind === "local" && !s.uploadedKey);
    if (hasIncomplete) {
      notify.warning("One or more image uploads failed. Retry before saving.");
      return;
    }

    setSaving(true);

    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("description", form.description);
    fd.append("button_text", form.button_text);
    fd.append("button_link", form.button_link.trim());

    fd.append("delay_seconds", String(form.delay_seconds));
    fd.append("show_frequency", form.show_frequency);
    fd.append("show_on_all_pages", String(form.show_on_all_pages));
    fd.append("is_active", String(form.is_active));

    fd.append(
      "image_public_ids_to_delete",
      JSON.stringify([...new Set(pendingDeleteImagePublicIds)]),
    );

    for (let i = 0; i < imageSlots.length; i += 1) {
      const s = imageSlots[i];
      if (s.kind === "local") {
        fd.append("uploaded_image_keys", s.uploadedKey);
      }
    }

    try {
      if (editing === "new") {
        if (popup?.public_id) {
          notify.warning("A popup already exists for this store. Edit the existing popup instead.");
          setEditing(popup.public_id);
          return;
        }
        await api.post("admin/popups/", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else if (editing) {
        await api.put(`admin/popups/${editing}/`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      notify.success("Popup saved successfully.");
      setEditing(null);
      fetchData();
    } catch (err) {
      if (isAxiosError(err)) {
        console.error("Popup save failed:", err.response?.data || err.message);
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
      title: "Delete popup?",
      message: "This popup and its images will be removed.",
      variant: "danger",
    });
    if (!ok) return;

    try {
      await api.delete(`admin/popups/${publicId}/`);
      setEditing(null);
      notify.warning("Popup deleted successfully.");
      fetchData();
    } catch (err) {
      console.error(err);
      notify.error(err);
    }
  }

  if (loading) return <DashboardDetailSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-card bg-muted/80 px-1 py-1 hidden md:block">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="flex items-center justify-center rounded-ui p-1 text-muted-foreground hover:bg-muted"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          </div>
          <h1 className="text-2xl font-medium text-foreground">Pop-up</h1>
        </div>

        <div className="flex items-center gap-2">
          {editing === null && !popup ? (
            <Button
              type="button"
              onClick={openNew}
              disabled={saving}
              className="rounded-card bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Add Popup
            </Button>
          ) : null}
        </div>
      </div>

      {editing !== null && (
        <form
          id="popup-form"
          onSubmit={handleSave}
          className="space-y-5 rounded-card border border-border bg-card p-6"
        >
          <h2 className="text-lg font-medium">
            {editing === "new" ? "Create popup" : "Edit popup"}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Title</label>
            <Input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="text-sm"
              placeholder="e.g. Limited time offer"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Description</label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="text-sm"
              placeholder="Your popup message"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Button text</label>
            <Input
              type="text"
              value={form.button_text}
              onChange={(e) => setForm((f) => ({ ...f, button_text: e.target.value }))}
              className="text-sm"
              placeholder="e.g. Shop now"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Button link</label>
            <Input
              type="url"
              value={form.button_link}
              onChange={(e) => setForm((f) => ({ ...f, button_link: e.target.value }))}
              className="text-sm"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Delay seconds</label>
            <Input
              type="number"
              min={0}
              value={form.delay_seconds}
              onChange={(e) => setForm((f) => ({ ...f, delay_seconds: Number(e.target.value) }))}
              className={cn("text-sm", numClass)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Show frequency</label>
            <Select
              value={form.show_frequency}
              onChange={(e) => setForm((f) => ({ ...f, show_frequency: e.target.value as PopupShowFrequency }))}
              className="text-sm"
            >
              <option value="session">Once per session</option>
              <option value="daily">Once per day</option>
              <option value="always">Always</option>
            </Select>
          </div>

          <div className="sm:col-span-2 flex items-center gap-3">
            <input
              type="checkbox"
              id="show_on_all_pages"
              className="form-checkbox"
              checked={form.show_on_all_pages}
              onChange={(e) => setForm((f) => ({ ...f, show_on_all_pages: e.target.checked }))}
            />
            <label htmlFor="show_on_all_pages" className="text-sm">
              Show on all pages
            </label>
          </div>

          <div className="sm:col-span-2 flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              className="form-checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            <label htmlFor="is_active" className="text-sm">
              Enable popup
            </label>
          </div>
          </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Images (max {MAX_POPUP_IMAGES})</label>
          <p className="text-xs text-muted-foreground">
            Upload 1–3 images. The popup will show them in a carousel.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 min-[520px]:grid-cols-3">
            {imageSlots.map((slot, index) => {
              const showPreview = slot.kind === "remote" || slot.kind === "local";
              const previewSrc =
                slot.kind === "remote" ? slot.url : slot.kind === "local" ? slot.previewUrl : null;
              const canAddInEmpty = slot.kind === "empty";

              return (
                <div
                  key={index}
                  className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card p-2 shadow-sm"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Slot {index + 1}
                    </span>
                    {(slot.kind === "remote" || slot.kind === "local") && (
                      <button
                        type="button"
                        title="Remove"
                        className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-ui border border-border text-sm leading-none text-muted-foreground hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          if (slot.kind === "remote") removeRemoteImage(index, slot.publicId);
                          else clearSlot(index);
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border/80 bg-muted/30">
                    {showPreview && previewSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewSrc} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <label
                        className={cn(
                          "flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 bg-card px-3 text-center",
                          !canAddInEmpty && "cursor-not-allowed opacity-60",
                        )}
                        title={!canAddInEmpty ? "Only 3 slots supported" : undefined}
                      >
                        <span className="inline-flex text-primary">
                          <ImageIcon className="size-7" />
                        </span>
                        <p className="text-[11px] font-semibold text-foreground">
                          Drop your image here, or <span className="underline underline-offset-2">browse</span>
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={slotStatus[index] === "uploading"}
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            e.target.value = "";
                            void onSlotFileInputChange(index, f);
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {slotStatus[index] === "uploading"
                      ? `Uploading ${slotProgress[index]}%`
                      : slotStatus[index] === "error"
                        ? slotError[index] ?? "Upload failed."
                        : slot.kind === "empty"
                          ? "Upload image"
                          : "Replace"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              loading={saving}
              disabled={saving || slotStatus.some((s) => s === "uploading")}
              className="inline-flex items-center gap-2 rounded-card bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {tCommon("save")}
            </Button>
            <Button
              type="button"
              onClick={() => setEditing(null)}
              disabled={saving}
              className="rounded-card border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              {tCommon("cancel")}
            </Button>
          </div>
        </form>
      )}

      {/* List state (table stays visible while editing, like CTA/Banners). */}
      <div className="overflow-x-auto rounded-card border border-dashed border-card-border bg-card">
          <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="th">Preview</th>
              <th className="th">Title</th>
                <th className="th">Schedule</th>
              <th className="th">Status</th>
              <th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {popup ? (
              <ClickableTableRow
                aria-label={
                  popup.title?.trim()
                    ? popup.title
                    : `Popup ${popup.public_id}`
                }
                onNavigate={() => openEdit(popup)}
              >
                <td className="px-4 py-3">
                  {popup.images && popup.images.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={
                        [...popup.images]
                          .sort((a: any, b: any) => a.order - b.order)[0]
                          ?.image_url ?? undefined
                      }
                      alt=""
                      className="h-12 w-20 rounded-ui object-cover"
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-foreground">
                  {popup.title || "—"}
                </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                    <span>
                      {popup.show_frequency || "—"}
                      {" · "}
                      {popup.delay_seconds != null ? `${popup.delay_seconds}s` : "—"}
                    </span>
                  </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      popup.is_active
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {popup.is_active ? tCommon("active") : tCommon("inactive")}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-4">
                    <ClickableText
                      variant="destructive"
                      className="text-sm"
                      onClick={() => void handleDelete(popup.public_id)}
                    >
                      {tCommon("delete")}
                    </ClickableText>
                  </div>
                </td>
              </ClickableTableRow>
            ) : !editing ? (
              <tr>
                  <td colSpan={5} className="px-4 py-8">
                  <div className="rounded-card border border-dashed border-card-border bg-card py-12 text-center text-sm text-muted-foreground">
                    This store has no popup yet.
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

