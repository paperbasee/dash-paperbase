"use client";

import type { ReactNode } from "react";
import { Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { PageHint } from "./PageHint";

/**
 * Every dashboard page's header (owner, 2026-10-04): one row -- back, the title and its ? on the
 * left; the page's own buttons, its filter button and its main button on the right, in that order,
 * all on one line. On a phone the buttons drop under the title as one row rather than squeeze.
 * What the page is for lives in the ? (`hint`), never as a line under the title.
 */
export function PageHeader({
  title,
  hint,
  back = true,
  children,
  className,
}: {
  title: ReactNode;
  /** What the page is for: shown from the ? beside the title. */
  hint: ReactNode;
  /** The back arrow (computers only, as before). */
  back?: boolean;
  /** The buttons on the right: the page's own, then FilterToggle, then the main one. */
  children?: ReactNode;
  className?: string;
}) {
  const t = useTranslations("pages");
  const router = useRouter();
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-3", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {back ? (
          <div className="hidden rounded-card bg-muted/80 px-1 py-1 md:block">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label={t("goBack")}
              className="flex items-center justify-center rounded-ui p-1 text-muted-foreground hover:bg-muted"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        <div className="flex min-w-0 items-center gap-1.5">
          <h1 className="min-w-0 text-2xl font-medium leading-relaxed text-foreground">{title}</h1>
          <PageHint>{hint}</PageHint>
        </div>
      </div>
      {children ? <div className="flex flex-wrap items-center justify-end gap-2">{children}</div> : null}
    </div>
  );
}
