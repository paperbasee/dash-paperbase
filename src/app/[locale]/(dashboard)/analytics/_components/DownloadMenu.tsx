"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, LayoutGrid, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import api from "@/lib/api";
import { notify } from "@/notifications/notify";

import { useAnalyticsView } from "../_lib/context";
import { fileNameFrom } from "../_lib/download";
import { type Period, periodDays, periodQuery } from "../_lib/period";
import type { SectionKey } from "../_lib/types";
import { Named } from "./kit";

/**
 * The page as an Excel file, made by the API from the same numbers (analytics
 * download/): the section on screen, or every section the plan opens, for the
 * days chosen, in the dashboard's language. Its button is an icon, named on hover.
 */
export function DownloadMenu({
  period,
  section,
}: {
  period: Period;
  section: Exclude<SectionKey, "live">;
}) {
  const t = useTranslations("analyticsPage");
  const locale = useLocale();
  const { format } = useAnalyticsView();
  const [busy, setBusy] = useState(false);
  const { start, end } = periodDays(period);
  const label = busy ? t("download.preparing") : t("download.button");

  const download = async (which: Exclude<SectionKey, "live"> | "all") => {
    setBusy(true);
    try {
      const query = new URLSearchParams({ section: which, lang: locale === "bn" ? "bn" : "en" });
      const response = await api.get<Blob>(`admin/analytics/download/?${query.toString()}&${periodQuery(period)}`, {
        responseType: "blob",
      });
      save(response.data, fileNameFrom(response.headers.get("content-disposition"), `analytics-${start}-to-${end}.xlsx`));
    } catch (error) {
      notify.error(error, { fallbackMessage: t("download.failed") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <Named label={label}>
        <DropdownMenuTrigger asChild disabled={busy}>
          <Button type="button" variant="outline" size="sm" className="h-9 px-3" aria-label={label}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
          </Button>
        </DropdownMenuTrigger>
      </Named>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="font-normal text-muted-foreground">
          {t("download.label", { days: format.days(start, end) })}
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => void download(section)} className="items-start gap-3 py-2.5">
          <Choice icon={FileSpreadsheet} title={t("download.thisSection")} note={t(`sections.${section}`)} />
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void download("all")} className="items-start gap-3 py-2.5">
          <Choice icon={LayoutGrid} title={t("download.allSections")} note={t("download.everySection")} />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <p className="px-2 pb-1.5 pt-1 text-[11px] leading-relaxed text-muted-foreground">{t("download.note")}</p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Choice({ icon: Icon, title, note }: { icon: typeof Download; title: string; note: string }) {
  return (
    <>
      <span className="grid size-8 shrink-0 place-items-center rounded-ui bg-blue-500/10 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[13px] font-semibold text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">{note}</span>
      </span>
    </>
  );
}

/** Hands the file to the browser to save. */
function save(file: Blob, name: string) {
  const address = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = address;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(address), 1000);
}
