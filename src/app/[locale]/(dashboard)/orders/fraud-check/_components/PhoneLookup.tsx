"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Phone, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * One wide box for the buyer's number with Check inside it; Enter checks too. Under it, what a
 * check costs, and why the last one got no answer.
 */
export function PhoneLookup({
  phone,
  onPhoneChange,
  onCheck,
  checking,
  problem,
  numberClass,
}: {
  phone: string;
  onPhoneChange: (phone: string) => void;
  onCheck: () => void;
  checking: boolean;
  /** Why the last check got no answer, in words; null when it did. */
  problem: string | null;
  /** The digits' font for this language (lib/number-font). */
  numberClass: string;
}) {
  const t = useTranslations("fraudCheckPage");
  const tCheck = useTranslations("fraudCheck");
  const problemId = useId();
  return (
    <div className="flex flex-col gap-2">
      <form
        className={cn(
          "flex items-center gap-2.5 rounded-card border border-input-border bg-input-surface py-1.5 pl-4 pr-1.5 [box-shadow:var(--shadow-input)]",
          "transition-[border-color,box-shadow] duration-[180ms] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20",
          problem && "border-destructive",
        )}
        onSubmit={(e) => {
          e.preventDefault();
          if (phone.trim() && !checking) onCheck();
        }}
      >
        <Phone className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <input
          type="text"
          inputMode="tel"
          autoComplete="off"
          spellCheck={false}
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder={t("placeholder")}
          aria-label={t("phoneLabel")}
          aria-invalid={problem ? true : undefined}
          aria-describedby={problem ? problemId : undefined}
          className={cn(
            "h-11 min-w-0 flex-1 bg-transparent text-lg tracking-wide text-foreground outline-none",
            "placeholder:text-base placeholder:tracking-normal placeholder:text-muted-foreground",
            numberClass,
          )}
        />
        <Button type="submit" className="h-11 shrink-0 px-4 sm:px-5" disabled={!phone.trim() || checking}>
          {checking ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ShieldCheck className="size-4" aria-hidden />
          )}
          {tCheck("button")}
        </Button>
      </form>
      {problem ? (
        <p id={problemId} role="alert" className="text-sm text-destructive">
          {problem}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">{t("note")}</p>
    </div>
  );
}
