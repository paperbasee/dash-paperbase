"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { scheduleAddressCheck, type AddressCheck, type AddressKind } from "@/lib/web-address";

/**
 * A product's or category's web address, as the merchant sees and may change it (lib/web-address).
 *
 * - A new one follows its name (the API's suggestion) until the merchant types an address.
 * - A saved one stays as it is when the name changes; typing a new one moves it, and the old
 *   address keeps forwarding.
 *
 * `value` is what the merchant typed, null until they type: the form sends it only then.
 */
export function WebAddressField({
  id,
  kind,
  name,
  saved,
  excludePublicId,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  kind: AddressKind;
  name: string;
  /** The address already saved; null for a new product or category. */
  saved: string | null;
  excludePublicId?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("webAddress");
  const [check, setCheck] = useState<AddressCheck | null>(null);
  const [checking, setChecking] = useState(false);

  // What to ask the API: the typed address, or -- for a new one nobody has typed -- the name.
  const typed = value !== null ? value.trim() : null;
  const askName = typed === null && saved === null ? name.trim() : "";
  useEffect(() => {
    if (!typed && !askName) {
      setCheck(null);
      setChecking(false);
      return;
    }
    return scheduleAddressCheck({
      kind,
      question: typed ? { address: typed } : { name: askName },
      excludePublicId,
      onChecking: setChecking,
      onResult: setCheck,
    });
  }, [kind, typed, askName, excludePublicId]);

  const shown = value ?? saved ?? (askName ? check?.suggested ?? "" : "");

  let note: ReactNode;
  if (checking) {
    note = t("checking");
  } else if (typed && check && !check.address) {
    note = <span className="text-destructive">{t("needsLetters")}</span>;
  } else if (typed && check && !check.available) {
    note = (
      <span className="inline-flex flex-wrap items-center gap-2 text-amber-700 dark:text-amber-300">
        {t(kind === "product" ? "takenProduct" : "takenCategory")}
        <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => onChange(check.suggested)}>
          {t("useSuggested", { address: check.suggested })}
        </Button>
      </span>
    );
  } else if (typed && check && check.address !== typed) {
    note = t("savedAs", { address: check.address });
  } else if (typed && saved && check?.address && check.address !== saved) {
    note = t("oldForwards", { old: saved });
  } else if (saved === null) {
    note = t("fromName");
  } else {
    note = t("keptOnRename");
  }

  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          "flex h-10 items-center overflow-hidden rounded-ui border border-input-border bg-input-surface text-sm",
          "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20",
          disabled && "opacity-60",
        )}
      >
        <span className="shrink-0 select-none border-r border-input-border bg-muted/40 px-3 font-mono text-xs text-muted-foreground">
          {kind === "product" ? "/products/" : "/categories/"}
        </span>
        <input
          id={id}
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={shown}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-full min-w-0 flex-1 bg-transparent px-3 font-mono text-sm text-foreground outline-none"
          aria-describedby={id ? `${id}-note` : undefined}
        />
      </div>
      <p id={id ? `${id}-note` : undefined} className="text-xs text-muted-foreground">
        {note}
      </p>
    </div>
  );
}
