"use client";

import { forwardRef, useId, type ComponentProps, type ReactNode } from "react";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { FIELD, HELP, LABEL } from "./styles";

/**
 * A label above, the control, and the line under it that explains it -- or
 * says what is wrong. Every typed setting in the editor is this shape.
 */
export function KitField({
  label,
  htmlFor,
  help,
  error,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  help?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      {htmlFor ? (
        <label htmlFor={htmlFor} className={LABEL}>
          {label}
        </label>
      ) : (
        <p className={LABEL}>{label}</p>
      )}
      {children}
      {error ? (
        <p role="alert" className="text-[12px] leading-relaxed text-destructive">
          {error}
        </p>
      ) : help ? (
        <p className={HELP}>{help}</p>
      ) : null}
    </div>
  );
}

/** One line of text, a number, a date, a time: the soft field. */
export const KitInput = forwardRef<HTMLInputElement, ComponentProps<"input">>(function KitInput(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(FIELD, className)} {...props} />;
});

/** A paragraph. */
export const KitTextarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(function KitTextarea(
  { className, rows = 4, ...props },
  ref,
) {
  return <textarea ref={ref} rows={rows} className={cn(FIELD, "resize-y leading-relaxed", className)} {...props} />;
});

/**
 * An on/off setting: its name on the left, the switch on the right, and what
 * it does under the name. The whole row is the label, so the words are a
 * target too.
 */
export function KitSwitchRow({
  label,
  help,
  checked,
  onChange,
  disabled,
}: {
  label: ReactNode;
  help?: ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1 pt-2">
        <label htmlFor={id} className="block cursor-pointer text-[13.5px] text-foreground">
          {label}
        </label>
        {help ? (
          <p id={`${id}-help`} className={cn(HELP, "mt-1")}>
            {help}
          </p>
        ) : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        aria-describedby={help ? `${id}-help` : undefined}
      />
    </div>
  );
}
