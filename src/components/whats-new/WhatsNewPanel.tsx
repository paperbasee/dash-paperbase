"use client";

import { useId, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, XIcon } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DeferredNavLink } from "@/components/navigation/DeferredNavLink";
import type { WhatsNewEntry, WhatsNewTag } from "@/content/whats-new";
import { appVersion } from "@/lib/app-version";
import { formatWhatsNewDate } from "@/lib/whats-new/unread";
import { cn } from "@/lib/utils";

/** Same chip vocabulary as the dashboard's recent-activity action badges. */
const TAG_CHIP: Record<WhatsNewTag, string> = {
  new: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  improved: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  fixed: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

const TAG_LABEL_KEY = {
  new: "tagNew",
  improved: "tagImproved",
  fixed: "tagFixed",
} as const satisfies Record<WhatsNewTag, string>;

interface WhatsNewPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: readonly WhatsNewEntry[];
  newIds: ReadonlySet<string>;
  onCloseAutoFocus?: (event: Event) => void;
}

export default function WhatsNewPanel({
  open,
  onOpenChange,
  entries,
  newIds,
  onCloseAutoFocus,
}: WhatsNewPanelProps) {
  const tWhatsNew = useTranslations("whatsNew");
  const locale = useLocale();
  const lang = locale === "bn" ? "bn" : "en";
  const descriptionId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        aria-describedby={descriptionId}
        className="z-[70] w-full gap-0 p-0 sm:max-w-md"
        onOpenAutoFocus={(event) => {
          // Land on the heading so screen readers announce the panel and the list reads in order.
          event.preventDefault();
          titleRef.current?.focus();
        }}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <SheetHeader className="shrink-0 gap-1 border-b border-border py-4 pl-4 pr-12">
          <SheetTitle ref={titleRef} tabIndex={-1} className="text-base outline-none">
            {tWhatsNew("panelTitle")}
          </SheetTitle>
          <SheetDescription id={descriptionId} className="text-xs">
            {tWhatsNew("panelDescription")}
          </SheetDescription>
          <SheetClose
            className="absolute right-4 top-4 rounded-xs p-1 text-muted-foreground opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={tWhatsNew("close")}
          >
            <XIcon className="size-4" aria-hidden />
          </SheetClose>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {entries.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              {tWhatsNew("empty")}
            </p>
          ) : (
            <ol className="divide-y divide-border">
              {entries.map((entry) => {
                const titleId = `${descriptionId}-${entry.id}`;
                const isNew = newIds.has(entry.id);
                return (
                  <li key={entry.id} className="px-4 py-4">
                    <article aria-labelledby={titleId}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex rounded-ui border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            TAG_CHIP[entry.tag],
                          )}
                        >
                          {tWhatsNew(TAG_LABEL_KEY[entry.tag])}
                        </span>
                        {isNew ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
                            {tWhatsNew("unreadMarker")}
                          </span>
                        ) : null}
                        <time
                          dateTime={entry.date}
                          className="ml-auto text-xs text-muted-foreground"
                        >
                          {formatWhatsNewDate(entry.date, locale)}
                        </time>
                      </div>
                      <h3 id={titleId} className="mt-2 text-sm font-medium text-foreground">
                        {entry.title[lang]}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {entry.body[lang]}
                      </p>
                      {entry.href ? (
                        <DeferredNavLink
                          href={entry.href}
                          onNavigate={() => onOpenChange(false)}
                          aria-describedby={titleId}
                          className="mt-2 inline-flex items-center gap-1 rounded-xs text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          {tWhatsNew("openLink")}
                          <ArrowRight className="size-3.5" aria-hidden />
                        </DeferredNavLink>
                      ) : null}
                    </article>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <SheetFooter className="shrink-0 border-t border-border py-3">
          <p className="text-xs text-muted-foreground">
            {tWhatsNew("versionLabel", { version: appVersion })}
          </p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
