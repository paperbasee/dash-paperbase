"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link2, Package, X } from "lucide-react";

import { numberTextClass } from "@/lib/number-font";
import type { FieldSpec } from "@/lib/theme-editor/field-specs";
import { LINK_PAGES } from "@/lib/theme-editor/link-targets";
import { toBdParts, toUtcIso } from "@/lib/theme-editor/schedule-field";
import { characterCount, checkField, type FieldError } from "@/lib/theme-editor/validate";
import { cn } from "@/lib/utils";
import {
  KitChoice,
  KitField,
  KitInput,
  KitPicture,
  KitSelect,
  KitSwitchRow,
  KitTextarea,
  KitValueRow,
  type KitPictureWords,
} from "./kit";
import { LABEL, ROUND } from "./kit/styles";

/*
 * One setting of a section or a block, drawn from the theme file -- in the
 * editor kit's pieces since 2026-09-26, so every setting in every place looks
 * the same without any of them being styled here.
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
  /** A picture's words, drawn on it the way the shop lays them. */
  words?: KitPictureWords;
  /** A picture that is a band across the page rather than a tile. */
  wide?: boolean;
};

/** A select with this many answers or fewer is a pill bar; more is a list. */
const PILLED = 3;

export function SettingField({
  spec,
  value,
  onChange,
  onPickLink,
  onPickPicture,
  pictureUrl,
  onPickProduct,
  productName,
  words,
  wide,
}: SettingFieldProps) {
  const t = useTranslations("themeEditor");
  const id = useId();

  if (spec.kind === "boolean") {
    return (
      <KitSwitchRow label={spec.label} help={spec.help ?? undefined} checked={value === true} onChange={onChange} />
    );
  }

  if (spec.kind === "select") {
    if (spec.options.length <= PILLED) {
      return (
        <div className="flex flex-col gap-2">
          <p className={LABEL}>{spec.label}</p>
          <KitChoice
            label={spec.label}
            options={spec.options.map((option) => ({ value: option.value, label: option.label }))}
            value={String(value ?? "")}
            onChange={onChange}
            help={spec.help ?? undefined}
          />
        </div>
      );
    }
    return (
      <KitField label={spec.label} htmlFor={id} help={spec.help ?? undefined}>
        <KitSelect id={id} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}>
          {spec.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </KitSelect>
      </KitField>
    );
  }

  if (spec.kind === "image") {
    const key = typeof value === "string" ? value : "";
    return (
      <KitPicture
        label={spec.label}
        help={spec.help ?? undefined}
        url={key ? (pictureUrl?.(key) ?? "") : ""}
        words={words}
        wide={wide}
        onChoose={onPickPicture}
        onRemove={() => onChange("")}
      />
    );
  }

  if (spec.kind === "datetime") {
    return <ScheduleField spec={spec} value={value} onChange={onChange} id={id} />;
  }

  if (spec.kind === "product") {
    const picked = typeof value === "string" ? value : "";
    const name = picked ? (productName?.(picked) ?? "") : "";
    return (
      <KitValueRow
        label={spec.label}
        help={spec.help ?? undefined}
        icon={<Package className="size-4" />}
        /* The name once it is known, the id until then: a product whose list
           has not arrived yet must not read as an empty field. */
        value={name || picked}
        empty={t("productNone")}
        onPick={() => onPickProduct?.()}
        onClear={() => onChange("")}
        clearLabel={t("productClear")}
      />
    );
  }

  if (spec.kind === "url") {
    const link = typeof value === "string" ? value : "";
    const page = LINK_PAGES.find((entry) => entry.path === link);
    return (
      <KitValueRow
        label={spec.label}
        help={spec.help ?? undefined}
        icon={<Link2 className="size-4" />}
        value={page ? t(page.key) : link}
        empty={t("linkNone")}
        onPick={onPickLink}
        onClear={() => onChange("")}
        clearLabel={t("linkClear")}
      />
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
    <KitField label={spec.label} help={spec.help ?? t("fieldDateHint")} htmlFor={id}>
      <div className="flex items-center gap-1.5">
        <KitInput
          id={id}
          type="date"
          value={parts.date}
          className="flex-1"
          onChange={(event) => set(event.target.value, parts.time)}
        />
        <KitInput
          type="time"
          aria-label={spec.label}
          value={parts.time}
          disabled={!parts.date}
          className="w-[7.5rem] shrink-0"
          onChange={(event) => set(parts.date, event.target.value)}
        />
        {parts.date ? (
          <button
            type="button"
            className={ROUND}
            aria-label={t("fieldDateClear")}
            title={t("fieldDateClear")}
            onClick={() => onChange("")}
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>
    </KitField>
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
    <KitField label={spec.label} htmlFor={id} help={spec.help ?? undefined} error={message}>
      {spec.kind === "textarea" ? (
        <KitTextarea
          id={id}
          rows={4}
          value={typed}
          aria-invalid={error !== null}
          onChange={(event) => handle(event.target.value)}
          {...typing}
        />
      ) : (
        <KitInput
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
    </KitField>
  );
}
