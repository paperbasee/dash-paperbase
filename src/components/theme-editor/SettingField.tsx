"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Image as ImageIcon, Link2, Package, Pencil, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { numberTextClass } from "@/lib/number-font";
import type { FieldSpec } from "@/lib/theme-editor/field-specs";
import { LINK_PAGES } from "@/lib/theme-editor/link-targets";
import { toBdParts, toUtcIso } from "@/lib/theme-editor/schedule-field";
import { characterCount, checkField, type FieldError } from "@/lib/theme-editor/validate";
import { cn } from "@/lib/utils";

/*
 * One setting of a section or a block, drawn from the theme file.
 *
 * What the merchant is typing is kept here, and only a value the API would accept is handed
 * up: an edit the rules refuse never reaches the document, so autosave never starts for it
 * and the shop is never asked to store something it would turn down. The refusal is said
 * under the field instead, while the typed text stays where it is so it can be shortened
 * rather than retyped.
 */

export type SettingFieldProps = {
  spec: FieldSpec;
  value: unknown;
  onChange: (value: unknown) => void;
  /** A link field asks for the picker rather than being typed into. */
  onPickLink: () => void;
  /** A picture field does the same, and needs a URL to draw the one it holds. */
  onPickPicture: () => void;
  pictureUrl?: (key: string) => string;
  /** A product field asks for its own picker, and a name to show what it holds. */
  onPickProduct?: () => void;
  productName?: (publicId: string) => string;
};

export function SettingField({
  spec,
  value,
  onChange,
  onPickLink,
  onPickPicture,
  pictureUrl,
  onPickProduct,
  productName,
}: SettingFieldProps) {
  const t = useTranslations("themeEditor");
  const id = useId();

  if (spec.kind === "boolean") {
    const on = value === true;
    return (
      <div className="form-field">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={id} className="field-label mb-0">
            {spec.label}
          </label>
          <Switch id={id} checked={on} onCheckedChange={onChange} aria-describedby={spec.help ? `${id}-help` : undefined} />
        </div>
        {spec.help ? (
          <p id={`${id}-help`} className="text-xs text-muted-foreground">
            {spec.help}
          </p>
        ) : null}
      </div>
    );
  }

  if (spec.kind === "select") {
    return (
      <FormField label={spec.label} htmlFor={id} hint={spec.help ?? undefined}>
        <Select id={id} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}>
          {spec.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>
    );
  }

  if (spec.kind === "image") {
    const key = typeof value === "string" ? value : "";
    const url = key ? (pictureUrl?.(key) ?? "") : "";
    return (
      <FormField label={spec.label} hint={spec.help ?? undefined}>
        <div className="flex items-center gap-2">
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-ui border border-input-border bg-input-surface">
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="" className="size-full object-cover" />
            ) : (
              <ImageIcon className="size-5 text-muted-foreground" aria-hidden />
            )}
          </div>
          <Button type="button" variant="outline" className="h-11 shrink-0 md:h-9" onClick={onPickPicture}>
            <Pencil aria-hidden />
            {key ? t("pictureChange") : t("pictureChoose")}
          </Button>
          {key ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 shrink-0 md:size-9"
              aria-label={t("pictureClear")}
              title={t("pictureClear")}
              onClick={() => onChange("")}
            >
              <X aria-hidden />
            </Button>
          ) : null}
        </div>
      </FormField>
    );
  }

  if (spec.kind === "datetime") {
    return <ScheduleField spec={spec} value={value} onChange={onChange} id={id} />;
  }

  if (spec.kind === "product") {
    const picked = typeof value === "string" ? value : "";
    const name = picked ? (productName?.(picked) ?? "") : "";
    return (
      <FormField label={spec.label} hint={spec.help ?? undefined}>
        <div className="flex items-center gap-2">
          <p className="flex min-w-0 flex-1 items-center gap-2 rounded-xs border border-input-border bg-input-surface px-3 py-2 text-sm">
            <Package className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className={cn("truncate", picked ? "text-foreground" : "text-muted-foreground")}>
              {/* The name once it is known, the id until then: a product whose
                  list has not arrived yet must not read as an empty field. */}
              {name || (picked ? picked : t("productNone"))}
            </span>
          </p>
          <Button type="button" variant="outline" className="h-11 shrink-0 md:h-9" onClick={onPickProduct}>
            <Pencil aria-hidden />
            {picked ? t("productChange") : t("productChoose")}
          </Button>
          {picked ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 shrink-0 md:size-9"
              aria-label={t("productClear")}
              title={t("productClear")}
              onClick={() => onChange("")}
            >
              <X aria-hidden />
            </Button>
          ) : null}
        </div>
      </FormField>
    );
  }

  if (spec.kind === "url") {
    const link = typeof value === "string" ? value : "";
    const page = LINK_PAGES.find((entry) => entry.path === link);
    return (
      <FormField label={spec.label} hint={spec.help ?? undefined}>
        <div className="flex items-center gap-2">
          <p className="flex min-w-0 flex-1 items-center gap-2 rounded-xs border border-input-border bg-input-surface px-3 py-2 text-sm">
            <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className={cn("truncate", link ? "text-foreground" : "text-muted-foreground")}>
              {page ? t(page.key) : link || t("linkNone")}
            </span>
          </p>
          <Button type="button" variant="outline" className="h-11 shrink-0 md:h-9" onClick={onPickLink}>
            <Pencil aria-hidden />
            {link ? t("linkChange") : t("linkChoose")}
          </Button>
          {link ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 shrink-0 md:size-9"
              aria-label={t("linkClear")}
              title={t("linkClear")}
              onClick={() => onChange("")}
            >
              <X aria-hidden />
            </Button>
          ) : null}
        </div>
      </FormField>
    );
  }

  return <TypedField spec={spec} value={value} onChange={onChange} id={id} />;
}

/**
 * A date and a time, in Bangladesh wall clock, stored as one UTC instant.
 *
 * Two native controls rather than `datetime-local`, which a browser reads in ITS OWN
 * timezone -- a merchant whose laptop is still set to another zone would schedule their
 * sale for the wrong hour with nothing on the screen to say so. The conversion is
 * `@/utils/time`'s, so this agrees with the coupon form.
 *
 * Clearing the date clears the setting, which is what "no limit" means: no start is
 * "already running", no end is "until I take it down".
 */
function ScheduleField({
  spec,
  value,
  onChange,
  id,
}: {
  spec: FieldSpec;
  value: unknown;
  onChange: (value: unknown) => void;
  id: string;
}) {
  const t = useTranslations("themeEditor");
  const parts = toBdParts(value);

  function set(date: string, time: string) {
    onChange(toUtcIso(date, time));
  }

  return (
    <FormField label={spec.label} hint={spec.help ?? t("fieldDateHint")} htmlFor={id}>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="date"
          value={parts.date}
          className="min-w-0 flex-1"
          onChange={(event) => set(event.target.value, parts.time)}
        />
        <Input
          type="time"
          aria-label={spec.label}
          value={parts.time}
          disabled={!parts.date}
          className="w-[7.5rem] shrink-0"
          onChange={(event) => set(parts.date, event.target.value)}
        />
        {parts.date ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 shrink-0 md:size-9"
            aria-label={t("fieldDateClear")}
            title={t("fieldDateClear")}
            onClick={() => onChange("")}
          >
            <X aria-hidden />
          </Button>
        ) : null}
      </div>
    </FormField>
  );
}

/** The fields the merchant types into: one line, a paragraph, or a whole number. */
function TypedField({
  spec,
  value,
  onChange,
  id,
}: {
  spec: FieldSpec;
  value: unknown;
  onChange: (value: unknown) => void;
  id: string;
}) {
  const t = useTranslations("themeEditor");
  const locale = useLocale();
  const stored = spec.kind === "number" ? (typeof value === "number" ? String(value) : "") : String(value ?? "");
  const [typed, setTyped] = useState(stored);
  const [error, setError] = useState<FieldError | null>(null);
  const focused = useRef(false);

  // A value that changed somewhere else (edits this device kept, brought back) replaces what
  // is here, but never under the merchant's hands: "05" is stored as 5, and putting that back
  // mid-word would rewrite the box and take the caret to the end of it. A refused keystroke
  // leaves the stored value alone, so it never takes back what the merchant is still fixing.
  useEffect(() => {
    if (focused.current) return;
    setTyped(stored);
    setError(null);
  }, [stored]);

  function handle(next: string) {
    setTyped(next);
    // An empty number box is a number being retyped, not a refused value — and a browser
    // reports an empty box for a half-written one ("1.", "1e") as well.
    if (spec.kind === "number" && next.trim() === "") {
      setError(null);
      return;
    }
    const candidate = spec.kind === "number" ? Number(next) : next;
    const refused = checkField(spec, candidate);
    setError(refused);
    if (!refused) onChange(candidate);
  }

  const typing = {
    onFocus: () => {
      focused.current = true;
    },
    onBlur: () => {
      focused.current = false;
      // An emptied number box goes back to the number that is stored: nothing was changed.
      if (spec.kind === "number" && typed.trim() === "") setTyped(stored);
    },
  };

  const message = error ? t(error.key, error.params) : undefined;
  const counted = spec.maxLength !== null && spec.kind !== "number";
  const used = counted ? characterCount(typed) : 0;

  return (
    <FormField label={spec.label} htmlFor={id} hint={spec.help ?? undefined} error={message}>
      {spec.kind === "textarea" ? (
        <Textarea
          id={id}
          rows={4}
          value={typed}
          aria-invalid={error !== null}
          onChange={(event) => handle(event.target.value)}
          {...typing}
        />
      ) : (
        <Input
          id={id}
          type={spec.kind === "number" ? "number" : "text"}
          inputMode={spec.kind === "number" ? "numeric" : undefined}
          min={spec.min ?? undefined}
          max={spec.max ?? undefined}
          value={typed}
          aria-invalid={error !== null}
          onChange={(event) => handle(event.target.value)}
          {...typing}
        />
      )}
      {counted ? (
        <p
          className={cn(
            "text-xs",
            numberTextClass(locale),
            used > (spec.maxLength ?? 0) ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {t("fieldCounter", { used, max: spec.maxLength ?? 0 })}
        </p>
      ) : null}
    </FormField>
  );
}
