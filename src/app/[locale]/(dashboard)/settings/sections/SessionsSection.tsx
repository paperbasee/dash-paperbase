"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, Monitor, Smartphone, Tablet } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { formatDashboardDateTime } from "@/lib/datetime-display";
import { toLocaleDigits } from "@/lib/locale-digits";
import { activeSessionsQueryKey, sessionHistoryQueryKey } from "@/lib/query-keys";
import {
  endOtherSessions,
  endSession,
  fetchActiveSessions,
  fetchSessionHistory,
  placeOf,
  type SignInSessionRow,
} from "@/lib/sessions";
import { cn } from "@/lib/utils";

import { SettingsSectionBody, settingsSectionSurfaceClassName } from "../SettingsSectionBody";

/** "Active now" within this long of the session's last request (the API notes one every 5 min). */
const ACTIVE_NOW_MS = 10 * 60_000;

function useRelativeTime() {
  const locale = useLocale();
  return (iso: string) => {
    const seconds = Math.round((Date.parse(iso) - Date.now()) / 1000);
    const format = new Intl.RelativeTimeFormat(locale === "bn" ? "bn-BD" : "en", { numeric: "auto" });
    const minutes = Math.round(seconds / 60);
    if (Math.abs(minutes) < 60) return format.format(minutes, "minute");
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return format.format(hours, "hour");
    return format.format(Math.round(hours / 24), "day");
  };
}

function DeviceMark({ row }: { row: SignInSessionRow }) {
  const Icon = row.is_support ? LifeBuoy : row.device_kind === "mobile" ? Smartphone : row.device_kind === "tablet" ? Tablet : Monitor;
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full",
        row.is_support ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-muted text-foreground/70"
      )}
    >
      <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
    </span>
  );
}

/**
 * Settings > Sessions (owner, 2026-09-29): who is signed in to the shop right now -- the owner on
 * each device, their team, Paperbase support on a visit -- with a way to sign any of them out, and
 * every sign-in of the last 90 days. The owner's alone (config/owner-powers.ts "sessions").
 */
export default function SessionsSection({ hidden }: { hidden: boolean }) {
  const t = useTranslations("settings.sessions");
  const locale = useLocale();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const relative = useRelativeTime();
  const [page, setPage] = useState(1);

  const active = useQuery({ queryKey: activeSessionsQueryKey, queryFn: fetchActiveSessions, enabled: !hidden, meta: { persist: false } });
  const history = useQuery({
    queryKey: sessionHistoryQueryKey(page),
    queryFn: () => fetchSessionHistory(page),
    enabled: !hidden,
    meta: { persist: false },
    placeholderData: (previous) => previous,
  });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["sessions"] });
  const endOne = useMutation({ mutationFn: endSession, onSettled: refresh });
  const endOthers = useMutation({ mutationFn: endOtherSessions, onSettled: refresh });

  if (hidden) return null;

  const digits = (text: string) => toLocaleDigits(text, locale);
  const methodLabel = (row: SignInSessionRow) => t(`method.${row.method}`);
  const whereFrom = (row: SignInSessionRow) =>
    [row.device, placeOf(row), row.ip_address].filter(Boolean).join(" · ") || t("unknownDevice");
  const others = (active.data ?? []).filter((row) => !row.is_current);

  async function askToEnd(row: SignInSessionRow) {
    const ok = await confirm({
      title: t("endTitle"),
      message: row.is_support ? t("endSupportMessage") : t("endMessage", { name: row.name, device: row.device || t("unknownDevice") }),
      confirmText: t("end"),
      variant: "warning",
    });
    if (ok) endOne.mutate(row.public_id);
  }

  async function askToEndOthers() {
    const ok = await confirm({
      title: t("endOthersTitle"),
      message: t("endOthersMessage", { count: others.length }),
      confirmText: t("endOthers"),
      variant: "warning",
    });
    if (ok) endOthers.mutate();
  }

  function status(row: SignInSessionRow) {
    if (row.is_live) return { label: t("status.active"), tone: "live" as const };
    if (row.end_reason === "signed_out") return { label: t("status.signedOut"), tone: "quiet" as const };
    if (row.end_reason === "ended") return { label: t("status.endedBy", { name: row.ended_by || t("theOwner") }), tone: "warn" as const };
    if (row.end_reason === "support_ended") return { label: t("status.visitEnded"), tone: "quiet" as const };
    return { label: t("status.expired"), tone: "quiet" as const };
  }

  return (
    <div className="space-y-6">
      <section className={settingsSectionSurfaceClassName} aria-labelledby="sessions-active">
        <SettingsSectionBody gap="compact">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 id="sessions-active" className="text-lg font-medium text-foreground">
                {t("activeTitle")}
              </h2>
              <p className="text-sm text-muted-foreground">{t("activeSubtitle")}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={others.length === 0 || endOthers.isPending}
              onClick={() => void askToEndOthers()}
            >
              {t("endOthers")}
            </Button>
          </div>

          {active.isPending ? (
            <div className="space-y-2" aria-busy>
              {[0, 1].map((i) => (
                <div key={i} className="h-[72px] animate-pulse rounded-card bg-muted/60" />
              ))}
            </div>
          ) : active.isError ? (
            <p className="text-sm text-destructive">{t("loadFailed")}</p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-card border border-border">
              {(active.data ?? []).map((row) => {
                const lastSeen = Date.now() - Date.parse(row.last_seen_at) < ACTIVE_NOW_MS;
                return (
                  <li key={row.public_id} className="flex items-start gap-3 px-4 py-3.5">
                    <DeviceMark row={row} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium text-foreground">{row.name}</span>
                        {row.is_support ? (
                          <Badge className="border-transparent bg-amber-100 font-normal text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                            {t("supportVisit")}
                          </Badge>
                        ) : row.role ? (
                          <Badge variant="secondary" className="font-normal">
                            {row.role}
                          </Badge>
                        ) : null}
                        {row.is_current ? (
                          <Badge className="border-transparent bg-emerald-100 font-normal text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                            {t("thisDevice")}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{digits(whereFrom(row))}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground/80">
                        {digits(
                          t("signedInWith", {
                            when: formatDashboardDateTime(row.created_at, locale),
                            method: methodLabel(row),
                          })
                        )}
                        {" · "}
                        <span className={cn(lastSeen && "font-medium text-emerald-700 dark:text-emerald-400")}>
                          {lastSeen ? t("activeNow") : digits(t("lastActive", { when: relative(row.last_seen_at) }))}
                        </span>
                      </p>
                    </div>
                    {row.is_current ? null : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        disabled={endOne.isPending}
                        onClick={() => void askToEnd(row)}
                      >
                        {t("end")}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </SettingsSectionBody>
      </section>

      <section className={settingsSectionSurfaceClassName} aria-labelledby="sessions-history">
        <SettingsSectionBody gap="compact">
          <div className="space-y-1">
            <h2 id="sessions-history" className="text-lg font-medium text-foreground">
              {t("historyTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("historySubtitle")}</p>
          </div>

          {history.isPending ? (
            <div className="h-40 animate-pulse rounded-card bg-muted/60" aria-busy />
          ) : history.isError ? (
            <p className="text-sm text-destructive">{t("loadFailed")}</p>
          ) : (history.data?.results.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">{t("historyEmpty")}</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-card border border-border">
                <table className="w-full min-w-[720px] text-left text-[13px]">
                  <thead className="bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      {(["when", "who", "how", "from", "device", "status"] as const).map((col) => (
                        <th key={col} scope="col" className="px-4 py-2.5 font-medium">
                          {t(`col.${col}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {history.data!.results.map((row) => {
                      const state = status(row);
                      return (
                        <tr key={row.public_id} className="align-top">
                          <td className="whitespace-nowrap px-4 py-3 text-foreground">
                            {formatDashboardDateTime(row.created_at, locale)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="block font-medium text-foreground">{row.name}</span>
                            {row.email ? <span className="block text-xs text-muted-foreground">{row.email}</span> : null}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-foreground/80">{methodLabel(row)}</td>
                          <td className="px-4 py-3 text-foreground/80">
                            <span className="block">{placeOf(row) || t("noPlace")}</span>
                            {row.ip_address ? (
                              <span className="block text-xs tabular-nums text-muted-foreground">{row.ip_address}</span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-foreground/80">{row.device || t("unknownDevice")}</td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                                state.tone === "live" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
                                state.tone === "warn" && "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
                                state.tone === "quiet" && "bg-muted text-muted-foreground"
                              )}
                            >
                              {state.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {(history.data?.pages ?? 1) > 1 ? (
                <div className="flex items-center justify-between gap-3">
                  <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    {t("previous")}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {digits(t("pageOf", { page: history.data!.page, pages: history.data!.pages }))}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= (history.data?.pages ?? 1)}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    {t("next")}
                  </Button>
                </div>
              ) : null}
            </>
          )}

          {/* DB-IP's free database asks for this line (CC BY 4.0). */}
          <p className="text-[11px] text-muted-foreground/80">
            <a href="https://db-ip.com" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
              {t("ipCredit")}
            </a>
          </p>
        </SettingsSectionBody>
      </section>
    </div>
  );
}
