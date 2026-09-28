"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { suggestEmail } from "@/lib/email-typo";

/**
 * "Did you mean nusrat@gmail.com?" for an email box (owner, 2026-09-29): said once the owner
 * leaves the box, and -- because a sign-in email sent to a slip is never read -- the first press
 * of send with a slip in it only says it. Pressing again sends what was typed; "Use this" fixes it;
 * the cross keeps what was typed and says no more about it.
 */
export function useEmailTypo(email: string, setEmail: (next: string) => void) {
  const value = email.trim();
  const suggestion = useMemo(() => suggestEmail(value), [value]);
  const [shownFor, setShownFor] = useState<string | null>(null);
  const [keptFor, setKeptFor] = useState<string | null>(null);
  const [heldFor, setHeldFor] = useState<string | null>(null);

  return {
    suggestion: suggestion && shownFor === value && keptFor !== value ? suggestion : null,
    /** For the box's onBlur. */
    reveal: () => setShownFor(value),
    /** First thing in a submit: true means stop -- the hint is showing now, and the next press sends. */
    hold: () => {
      if (!suggestion || keptFor === value || heldFor === value) return false;
      setHeldFor(value);
      setShownFor(value);
      return true;
    },
    accept: () => {
      if (suggestion) setEmail(suggestion.email);
    },
    keep: () => setKeptFor(value),
  };
}

export function EmailTypoHint({ typo }: { typo: ReturnType<typeof useEmailTypo> }) {
  const t = useTranslations("auth");
  const { suggestion } = typo;
  return (
    <div aria-live="polite">
      {suggestion ? (
        <div className="pb-rise mt-2 flex items-center gap-2 rounded-ui border border-border-subtle bg-muted/50 py-1.5 pl-3 pr-1.5 text-[13px] text-muted-foreground">
          {/* Wraps rather than cuts: the address it offers is the point. */}
          <p className="min-w-0 flex-1 py-0.5 leading-snug [overflow-wrap:anywhere]">
            {t.rich("didYouMean", {
              email: suggestion.email,
              fix: () => {
                const at = suggestion.email.lastIndexOf("@");
                return (
                  <span className="font-medium text-foreground">
                    {suggestion.email.slice(0, at + 1)}
                    <span className="underline decoration-foreground/35 decoration-[1.5px] underline-offset-[3px]">
                      {suggestion.domain}
                    </span>
                  </span>
                );
              },
            })}
          </p>
          <button
            type="button"
            onClick={typo.accept}
            className="h-7 shrink-0 rounded-ui bg-foreground px-2.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
          >
            {t("useSuggestion")}
          </button>
          <button
            type="button"
            onClick={typo.keep}
            aria-label={t("keepTyped")}
            title={t("keepTyped")}
            className="flex size-7 shrink-0 items-center justify-center rounded-ui transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
