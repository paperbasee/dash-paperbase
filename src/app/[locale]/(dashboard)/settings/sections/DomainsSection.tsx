"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ClipboardTextIcon } from "@phosphor-icons/react";
import {
  Check,
  ChevronRight,
  ExternalLink,
  Plus,
  RefreshCcw,
  Star,
  Trash,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDashboardDateTime } from "@/lib/datetime-display";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { usePermissions } from "@/context/PermissionsContext";
import { notify } from "@/notifications";
import {
  SettingsSectionBody,
  settingsInvertedButtonClassName,
  settingsSectionSurfaceClassName,
} from "../SettingsSectionBody";
import {
  useConnectDomain,
  useDomainsQuery,
  useRemoveDomain,
  useSetPrimaryDomain,
  useVerifyDomain,
} from "@/lib/domains/hooks";
import type {
  StoreDomain,
  StoreDomainDnsRecord,
  StoreDomainStatus,
} from "@/lib/domains/api";

/** Colour per lifecycle state, mirroring the order-status badge conventions. */
function statusBadgeClassName(status: StoreDomainStatus): string {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
    case "verifying":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100";
    case "failed":
      return "border-destructive/35 bg-destructive/5 text-destructive";
    case "disabled":
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

/** Mirrors the server's canonical URL rule: https everywhere but local suffixes. */
function storefrontUrlFor(hostname: string): string {
  const isLocal =
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".test");
  return `${isLocal ? "http" : "https"}://${hostname}`;
}

/**
 * DNS instruction copy mirrors, in plain localized language, the notes returned by
 * engine/apps/stores/domain_verification.py :: expected_dns_records().
 * The API notes are English-only, so a Bengali merchant would otherwise read an
 * English paragraph at the most frightening step in the product. If
 * expected_dns_records() changes its recommendation, settings.domains.stepPointHint*
 * and fallbackWhy must change with it. record.note is still printed verbatim for any
 * record type we have no localized line for (AAAA today, anything added later).
 */
type RecordTier = "required" | "recommended" | "fallback";

type DnsRow = {
  key: string;
  type: string;
  name: string;
  value: string;
  /** Raw API note. Rendered ONLY for types we have no localized guidance for. */
  note: string;
  tier: RecordTier;
};

type DnsPlan = {
  /** TXT: proves ownership. */
  step1: DnsRow[];
  /** CNAME and any unknown type: the pointing records shown on load. */
  step2Visible: DnsRow[];
  /** A / AAAA: hidden behind the "my provider refused it" disclosure. */
  step2Fallback: DnsRow[];
  /** True only when a CNAME AND an A/AAAA both came back, so there is a choice. */
  hasChoice: boolean;
};

function buildDnsPlan(records: StoreDomainDnsRecord[]): DnsPlan {
  const step1: DnsRow[] = [];
  const step2Visible: DnsRow[] = [];
  const step2Fallback: DnsRow[] = [];
  for (const record of records) {
    const type = (record.type || "").toUpperCase();
    const row: DnsRow = {
      key: `${record.type}:${record.name}:${record.value}`,
      type: record.type,
      name: record.name,
      value: record.value,
      note: record.note ?? "",
      tier: "required",
    };
    if (type === "TXT") step1.push(row);
    else if (type === "CNAME") step2Visible.push({ ...row, tier: "recommended" });
    else if (type === "A" || type === "AAAA") step2Fallback.push({ ...row, tier: "fallback" });
    else step2Visible.push(row);
  }
  const hasChoice =
    step2Visible.some((row) => row.tier === "recommended") && step2Fallback.length > 0;
  // No CNAME configured on this instance means the A records ARE the only path.
  // Never hide them behind a "fallback" door, and never recommend a record that is
  // not on screen.
  if (!hasChoice && step2Fallback.length > 0) {
    step2Visible.push(...step2Fallback.map((row) => ({ ...row, tier: "required" as const })));
    step2Fallback.length = 0;
  }
  return { step1, step2Visible, step2Fallback, hasChoice };
}

/** Types we write our own localized guidance for; anything else prints record.note. */
const GUIDED_TYPES = new Set(["TXT", "CNAME", "A"]);

function CopyButton({ value, label }: { value: string; label: string }) {
  const t = useTranslations("settings");
  const [copied, setCopied] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        // 32px visual box, 44px touch target on phones. The pseudo-element grows the
        // hit area without perturbing row alignment the way a larger box would.
        className="relative size-8 shrink-0 after:absolute after:-inset-1.5 after:content-[''] sm:after:hidden"
        aria-label={label}
        onClick={() => {
          void navigator.clipboard
            .writeText(value)
            .then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1200);
            })
            .catch(() => setCopied(false));
        }}
      >
        {copied ? (
          <Check className="size-4 animate-pulse text-emerald-600 dark:text-emerald-400" />
        ) : (
          <ClipboardTextIcon className="size-4" />
        )}
      </Button>
      {/* Today's only success signal is colour plus icon, which a screen reader
          never receives. */}
      <span aria-live="polite" className="sr-only">
        {copied ? t("domains.copied") : ""}
      </span>
    </>
  );
}

function StepChip({ done, label }: { done: boolean; label: string }) {
  return (
    <span
      className={cn(
        "rounded-ui border px-1.5 py-0.5 text-[11px] font-medium",
        done
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

function TypeChip({ type }: { type: string }) {
  return (
    <span className="inline-flex h-5 items-center rounded-ui border border-border bg-muted px-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-foreground">
      {type}
    </span>
  );
}

function RecommendedPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
      {label}
    </span>
  );
}

export default function DomainsSection({ hidden }: { hidden: boolean }) {
  const locale = useLocale();
  const t = useTranslations("settings");
  const confirm = useConfirm();
  const { has } = usePermissions();

  const canManage = has("domains.manage");

  const [newHostname, setNewHostname] = useState("");
  // Records are OPEN by default: a merchant returning the next day should not find
  // the one thing they came back for collapsed behind a link.
  const [collapsedRecords, setCollapsedRecords] = useState<Set<string>>(new Set());
  const [collapsedStep1, setCollapsedStep1] = useState<Set<string>>(new Set());
  const [fallbackOpen, setFallbackOpen] = useState<Set<string>>(new Set());
  const [connectOpen, setConnectOpen] = useState(false);
  /**
   * Server truth is coarse: VERIFYING implies ownership passed and ACTIVE implies
   * both. The verify response we already await carries the finer signal (pointing
   * can be ok while ownership is not), so keep the last one per domain.
   */
  const [lastCheck, setLastCheck] = useState<
    Record<string, { ownership_ok: boolean; pointing_ok: boolean }>
  >({});

  const { data: allDomains = [], isLoading, isError } = useDomainsQuery({ enabled: !hidden });

  // Removed domains are gone from the database; nothing to filter for them here.
  const domains = allDomains.filter((d) => d.status !== "disabled");
  // The address to show the merchant: their canonical one, falling back to any
  // live address so a store is never told it has none while it is serving.
  const liveDomain =
    domains.find((d) => d.is_primary && d.status === "active") ??
    domains.find((d) => d.status === "active") ??
    null;

  const connect = useConnectDomain();
  const verify = useVerifyDomain();
  const setPrimary = useSetPrimaryDomain();
  const remove = useRemoveDomain();

  const busy =
    connect.isPending || verify.isPending || setPrimary.isPending || remove.isPending;

  /** Same predicate as the old `showRecords`, so no capability shifts. */
  const needsSetup = (d: StoreDomain) =>
    d.kind === "custom" && d.status !== "active" && d.status !== "disabled";

  const setupDomains = domains.filter(needsSetup);
  const calmDomains = domains
    .filter((d) => !needsSetup(d))
    .sort((a, b) => {
      const rank = (d: StoreDomain) => (d.is_primary ? 0 : d.status === "active" ? 1 : 2);
      return rank(a) - rank(b);
    });
  const hasCustomDomain = domains.some((d) => d.kind === "custom");
  const showConnectForm = !isLoading && (!hasCustomDomain || connectOpen);

  function toggleIn(set: (fn: (prev: Set<string>) => Set<string>) => void, id: string) {
    set((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /**
   * What a shopper would experience right now.
   *
   * Without this a domain whose DNS has verified but whose certificate has not
   * issued yet looks identical to a working one -- so the merchant visits a
   * browser warning and opens a support ticket. Only shown for custom domains;
   * the Paperbase address is always secure.
   */
  function certificateNotice(domain: StoreDomain): string {
    if (domain.kind !== "custom" || domain.status !== "active") return "";
    switch (domain.ssl_status) {
      case "issued":
        return t("domains.sslIssued");
      case "failed":
        return domain.ssl_error
          ? `${t("domains.sslFailed")} ${domain.ssl_error}`
          : t("domains.sslFailed");
      case "pending":
      case "none":
      default:
        return t("domains.sslPending");
    }
  }

  function certificateNoticeClassName(domain: StoreDomain): string {
    if (domain.ssl_status === "failed") return "text-destructive";
    if (domain.ssl_status === "issued") return "text-emerald-700 dark:text-emerald-300";
    return "text-amber-700 dark:text-amber-300";
  }

  function statusLabel(status: StoreDomainStatus): string {
    switch (status) {
      case "active":
        return t("domains.statusActive");
      case "verifying":
        return t("domains.statusVerifying");
      case "pending":
        return t("domains.statusPending");
      case "failed":
        return t("domains.statusFailed");
      case "disabled":
      default:
        return t("domains.statusDisabled");
    }
  }

  async function handleConnect() {
    const hostname = newHostname.trim();
    if (!hostname || busy || !canManage) return;
    try {
      await connect.mutateAsync(hostname);
      setNewHostname("");
      setConnectOpen(false);
      notify.success(t("domains.msgConnected"), { title: t("domains.heading") });
    } catch (error) {
      notify.error(error, {
        title: t("domains.heading"),
        fallbackMessage: t("domains.msgConnectFailed"),
      });
    }
  }

  async function handleVerify(domain: StoreDomain) {
    if (busy || !canManage) return;
    try {
      const result = await verify.mutateAsync(domain.public_id);
      setLastCheck((prev) => ({
        ...prev,
        [domain.public_id]: {
          ownership_ok: result.ownership_ok,
          pointing_ok: result.pointing_ok,
        },
      }));
      if (result.verified) {
        notify.success(t("domains.msgVerified"), { title: t("domains.heading") });
      } else {
        // Not an error: DNS simply has not propagated yet. The server's message
        // says exactly which record is still missing.
        notify.info(result.message || t("domains.msgNotReady"), {
          title: t("domains.heading"),
        });
      }
    } catch (error) {
      notify.error(error, {
        title: t("domains.heading"),
        fallbackMessage: t("domains.msgVerifyFailed"),
      });
    }
  }

  async function handleSetPrimary(domain: StoreDomain) {
    if (busy || !canManage) return;
    const ok = await confirm({
      title: t("domains.setPrimary"),
      message: t("domains.confirmSetPrimary", { hostname: domain.hostname }),
      variant: "default",
    });
    if (!ok) return;
    try {
      await setPrimary.mutateAsync(domain.public_id);
      notify.success(t("domains.msgPrimaryUpdated"), { title: t("domains.heading") });
    } catch (error) {
      notify.error(error, {
        title: t("domains.heading"),
        fallbackMessage: t("domains.msgPrimaryFailed"),
      });
    }
  }

  async function handleRemove(domain: StoreDomain) {
    if (busy || !canManage) return;
    const ok = await confirm({
      title: t("domains.remove"),
      message: t("domains.confirmRemove", { hostname: domain.hostname }),
      variant: "danger",
      // Removal is a hard delete now: the row is gone, and re-adding issues a new
      // ownership token, so the merchant must replace their TXT record too. Typing
      // the hostname makes them read WHICH domain they are about to lose -- the
      // realistic mistake here is removing the wrong one from a list, not being
      // unaware that removing deletes.
      requireTypedValue: domain.hostname,
      typedValueLabel: t("domains.removeTypedLabel", { hostname: domain.hostname }),
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(domain.public_id);
      setLastCheck((prev) => {
        const next = { ...prev };
        delete next[domain.public_id];
        return next;
      });
      notify.success(t("domains.msgRemoved"), { title: t("domains.heading") });
    } catch (error) {
      notify.error(error, {
        title: t("domains.heading"),
        fallbackMessage: t("domains.msgRemoveFailed"),
      });
    }
  }

  function renderRecordCells(row: DnsRow, recommended: boolean) {
    const showNote = row.note && !GUIDED_TYPES.has((row.type || "").toUpperCase());
    return (
      <>
        <td className="px-4 py-3 align-top">
          <div className="flex flex-col items-start gap-1">
            <TypeChip type={row.type} />
            {recommended ? <RecommendedPill label={t("domains.recommendedBadge")} /> : null}
          </div>
        </td>
        <td className="px-4 py-3 align-top">
          <div className="flex items-start justify-between gap-1">
            <code
              dir="ltr"
              className="min-w-0 break-all font-mono text-[13px] leading-5 text-muted-foreground"
            >
              {row.name}
            </code>
            <CopyButton value={row.name} label={t("domains.copyNameAria", { type: row.type })} />
          </div>
        </td>
        <td className="px-4 py-3 align-top">
          <div className="flex items-start justify-between gap-1">
            <code
              dir="ltr"
              className="min-w-0 break-all font-mono text-[13px] leading-5 text-foreground"
            >
              {row.value}
            </code>
            <CopyButton value={row.value} label={t("domains.copyValueAria", { type: row.type })} />
          </div>
          {showNote ? (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{row.note}</p>
          ) : null}
        </td>
      </>
    );
  }

  function renderMobileRow(row: DnsRow, recommended: boolean) {
    const showNote = row.note && !GUIDED_TYPES.has((row.type || "").toUpperCase());
    return (
      <li
        key={row.key}
        className={cn(
          "px-4 py-3",
          recommended && "bg-emerald-50/50 dark:bg-emerald-950/20",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <TypeChip type={row.type} />
          {recommended ? <RecommendedPill label={t("domains.recommendedBadge")} /> : null}
        </div>
        {/* space-y-3, not 2: at 2 the two 44px hit areas would overlap. */}
        <dl className="mt-2 space-y-3">
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("domains.colName")}
            </dt>
            <dd className="mt-0.5 flex items-center justify-between gap-1">
              <code
                dir="ltr"
                className="min-w-0 break-all font-mono text-[13px] leading-5 text-muted-foreground"
              >
                {row.name}
              </code>
              <CopyButton value={row.name} label={t("domains.copyNameAria", { type: row.type })} />
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("domains.colValue")}
            </dt>
            <dd className="mt-0.5 flex items-center justify-between gap-1">
              <code
                dir="ltr"
                className="min-w-0 break-all font-mono text-[13px] leading-5 text-foreground"
              >
                {row.value}
              </code>
              <CopyButton
                value={row.value}
                label={t("domains.copyValueAria", { type: row.type })}
              />
            </dd>
          </div>
        </dl>
        {showNote ? (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{row.note}</p>
        ) : null}
      </li>
    );
  }

  return (
    <section
      id="panel-domains"
      role="tabpanel"
      aria-labelledby="tab-domains"
      hidden={hidden}
      className={settingsSectionSurfaceClassName}
    >
      <SettingsSectionBody>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">{t("domains.heading")}</h2>
          <p className="text-sm text-muted-foreground">{t("domains.subtitle")}</p>
        </div>

        {liveDomain ? (
          <div className="rounded-card border border-primary/30 bg-primary/5 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2 shrink-0" aria-hidden="true">
                <span className="absolute inline-flex size-full rounded-full bg-emerald-500/60 motion-safe:animate-ping" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("domains.liveAt")}
              </p>
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <a
                href={storefrontUrlFor(liveDomain.hostname)}
                target="_blank"
                rel="noreferrer noopener"
                dir="ltr"
                className="min-w-0 break-all text-base font-semibold text-primary underline underline-offset-4 sm:text-lg"
              >
                {storefrontUrlFor(liveDomain.hostname)}
              </a>
              <div className="flex shrink-0 items-center gap-1">
                <CopyButton
                  value={storefrontUrlFor(liveDomain.hostname)}
                  label={t("domains.copyUrlAria")}
                />
                <Button asChild variant="ghost" size="icon" className="relative size-8 shrink-0">
                  <a
                    href={storefrontUrlFor(liveDomain.hostname)}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={t("domains.openStoreAria", { hostname: liveDomain.hostname })}
                  >
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              </div>
            </div>
            {/* The certificate notice lives HERE for the live domain and is
                suppressed on its calm row: "your site shows a browser warning" is a
                fact about this address, so it belongs beside it, once. */}
            {certificateNotice(liveDomain) ? (
              <p
                className={cn(
                  "mt-3 text-xs leading-relaxed",
                  certificateNoticeClassName(liveDomain),
                )}
              >
                {certificateNotice(liveDomain)}
              </p>
            ) : null}
          </div>
        ) : null}

        {isError ? (
          <p
            role="status"
            className="rounded-card border border-destructive/35 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {t("domains.loadFailed")}
          </p>
        ) : null}

        {isLoading ? (
          <div className="space-y-3">
            <p role="status" className="sr-only">
              {t("domains.loading")}
            </p>
            <Skeleton className="h-20 w-full rounded-card" />
            <Skeleton className="h-20 w-full rounded-card" />
          </div>
        ) : null}

        {!isLoading &&
          setupDomains.map((domain) => {
            const records = domain.dns_records ?? [];
            const plan = buildDnsPlan(records);
            const recordsOpen = !collapsedRecords.has(domain.public_id);
            const step1Open = !collapsedStep1.has(domain.public_id);
            const fallbackIsOpen = fallbackOpen.has(domain.public_id);
            const check = lastCheck[domain.public_id];
            const ownershipDone =
              domain.status === "active" ||
              domain.status === "verifying" ||
              check?.ownership_ok === true;
            const pointingDone = domain.status === "active" || check?.pointing_ok === true;
            const step1Visible = !ownershipDone || step1Open;

            const groupHint = (which: "own" | "point") =>
              which === "own"
                ? ownershipDone
                  ? t("domains.stepOwnDone")
                  : t("domains.stepOwnHint")
                : plan.hasChoice
                  ? t("domains.stepPointHintChoice")
                  : t("domains.stepPointHintSingle");

            return (
              <article
                key={domain.public_id}
                className="overflow-hidden rounded-card border border-primary/30 bg-card"
              >
                <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p dir="ltr" className="break-all font-medium text-foreground">
                        {domain.hostname}
                      </p>
                      <span
                        className={cn(
                          "rounded-ui border px-1.5 py-0.5 text-xs font-medium",
                          statusBadgeClassName(domain.status),
                        )}
                      >
                        {statusLabel(domain.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {t("domains.kindCustom")}
                    </p>
                  </div>
                  {domain.removable ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="relative size-8 shrink-0 text-destructive hover:text-destructive after:absolute after:-inset-1.5 after:content-[''] sm:after:hidden"
                      aria-label={t("domains.removeAria")}
                      disabled={busy || !canManage}
                      onClick={() => void handleRemove(domain)}
                    >
                      <Trash className="size-4" />
                    </Button>
                  ) : null}
                </div>

                {/* The fear answer, read before they act. */}
                <div className="space-y-1 border-b border-border bg-muted/20 px-4 py-3">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t("domains.setupReassurance")}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t("domains.setupRevertible")}
                  </p>
                </div>

                {records.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("domains.dnsHeading")}
                      </h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto shrink-0 px-0 text-xs text-muted-foreground hover:text-foreground"
                        aria-expanded={recordsOpen}
                        aria-controls={`dns-${domain.public_id}`}
                        onClick={() => toggleIn(setCollapsedRecords, domain.public_id)}
                      >
                        {recordsOpen ? t("domains.hideRecords") : t("domains.showRecords")}
                      </Button>
                    </div>

                    {recordsOpen ? (
                      <div id={`dns-${domain.public_id}`}>
                        <p className="border-b border-border px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">
                          {t("domains.whereToAdd")}
                        </p>

                        {/* Desktop: a real table. table-fixed plus break-all means a
                            43-character token can never widen the page, which is why
                            there is no overflow-x container hiding it. */}
                        <div className="hidden sm:block">
                          <table className="w-full table-fixed text-left text-sm">
                            <caption className="sr-only">
                              {t("domains.dnsTableCaption", { hostname: domain.hostname })}
                            </caption>
                            <thead>
                              <tr className="border-b border-border bg-muted/40">
                                <th scope="col" className="th w-[7.5rem]">
                                  {t("domains.colType")}
                                </th>
                                <th scope="col" className="th w-[32%]">
                                  {t("domains.colName")}
                                </th>
                                <th scope="col" className="th">
                                  {t("domains.colValue")}
                                </th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-border/60">
                              <tr className="bg-muted/25">
                                <th scope="colgroup" colSpan={3} className="px-4 py-2 text-left font-normal">
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className="text-xs font-semibold text-foreground">
                                      {t("domains.stepOwnTitle")}
                                    </span>
                                    <StepChip
                                      done={ownershipDone}
                                      label={ownershipDone ? t("domains.stepDone") : t("domains.stepWaiting")}
                                    />
                                    {ownershipDone ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="ml-auto h-auto px-0 text-xs font-normal text-muted-foreground hover:text-foreground"
                                        aria-expanded={step1Open}
                                        aria-controls={`dns-step1-d-${domain.public_id}`}
                                        onClick={() => toggleIn(setCollapsedStep1, domain.public_id)}
                                      >
                                        {step1Open ? t("domains.hideRecords") : t("domains.showRecords")}
                                      </Button>
                                    ) : null}
                                  </div>
                                  <p className="mt-0.5 text-xs font-normal leading-relaxed text-muted-foreground">
                                    {groupHint("own")}
                                  </p>
                                </th>
                              </tr>
                              {step1Visible
                                ? plan.step1.map((row) => (
                                    <tr key={row.key} id={`dns-step1-d-${domain.public_id}`}>
                                      {renderRecordCells(row, false)}
                                    </tr>
                                  ))
                                : null}
                            </tbody>

                            <tbody className="divide-y divide-border/60 border-t border-border">
                              <tr className="bg-muted/25">
                                <th scope="colgroup" colSpan={3} className="px-4 py-2 text-left font-normal">
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className="text-xs font-semibold text-foreground">
                                      {t("domains.stepPointTitle")}
                                    </span>
                                    <StepChip
                                      done={pointingDone}
                                      label={pointingDone ? t("domains.stepDone") : t("domains.stepWaiting")}
                                    />
                                  </div>
                                  <p className="mt-0.5 text-xs font-normal leading-relaxed text-muted-foreground">
                                    {groupHint("point")}
                                  </p>
                                </th>
                              </tr>
                              {plan.step2Visible.map((row) => (
                                <tr
                                  key={row.key}
                                  className={
                                    row.tier === "recommended" && plan.hasChoice
                                      ? "bg-emerald-50/50 dark:bg-emerald-950/20"
                                      : undefined
                                  }
                                >
                                  {renderRecordCells(row, row.tier === "recommended" && plan.hasChoice)}
                                </tr>
                              ))}
                              {plan.hasChoice ? (
                                <tr>
                                  <td colSpan={3} className="px-4 py-2.5">
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-1 text-left text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                                      aria-expanded={fallbackIsOpen}
                                      aria-controls={`dns-fallback-d-${domain.public_id}`}
                                      onClick={() => toggleIn(setFallbackOpen, domain.public_id)}
                                    >
                                      <ChevronRight
                                        className={cn(
                                          "size-3.5 shrink-0 transition-transform",
                                          fallbackIsOpen && "rotate-90",
                                        )}
                                      />
                                      {t("domains.fallbackToggle")}
                                    </button>
                                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                      {t("domains.fallbackToggleHint")}
                                    </p>
                                  </td>
                                </tr>
                              ) : null}
                            </tbody>

                            {plan.hasChoice && fallbackIsOpen ? (
                              <tbody
                                id={`dns-fallback-d-${domain.public_id}`}
                                className="divide-y divide-border/60 border-t border-border bg-muted/20"
                              >
                                <tr>
                                  <td colSpan={3} className="px-4 py-2.5">
                                    <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                                      {t("domains.fallbackWhy")}
                                    </p>
                                    {plan.step2Fallback.length > 1 ? (
                                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                        {t("domains.fallbackAddAll")}
                                      </p>
                                    ) : null}
                                  </td>
                                </tr>
                                {plan.step2Fallback.map((row) => (
                                  <tr key={row.key}>{renderRecordCells(row, false)}</tr>
                                ))}
                              </tbody>
                            ) : null}
                          </table>
                        </div>

                        {/* Mobile: same view-model, stacked. Both renderings are in
                            the DOM, but display:none removes the hidden one from the
                            accessibility tree, so ids are suffixed -d / -m to keep
                            aria-controls unambiguous. */}
                        <div className="sm:hidden">
                          <div className="border-b border-border bg-muted/25 px-4 py-2">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <h4 className="text-xs font-semibold text-foreground">
                                {t("domains.stepOwnTitle")}
                              </h4>
                              <StepChip
                                done={ownershipDone}
                                label={ownershipDone ? t("domains.stepDone") : t("domains.stepWaiting")}
                              />
                              {ownershipDone ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="ml-auto h-auto px-0 text-xs font-normal text-muted-foreground hover:text-foreground"
                                  aria-expanded={step1Open}
                                  aria-controls={`dns-step1-m-${domain.public_id}`}
                                  onClick={() => toggleIn(setCollapsedStep1, domain.public_id)}
                                >
                                  {step1Open ? t("domains.hideRecords") : t("domains.showRecords")}
                                </Button>
                              ) : null}
                            </div>
                            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                              {groupHint("own")}
                            </p>
                          </div>
                          {step1Visible ? (
                            <ul id={`dns-step1-m-${domain.public_id}`} className="divide-y divide-border/60">
                              {plan.step1.map((row) => renderMobileRow(row, false))}
                            </ul>
                          ) : null}

                          <div className="border-b border-t border-border bg-muted/25 px-4 py-2">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <h4 className="text-xs font-semibold text-foreground">
                                {t("domains.stepPointTitle")}
                              </h4>
                              <StepChip
                                done={pointingDone}
                                label={pointingDone ? t("domains.stepDone") : t("domains.stepWaiting")}
                              />
                            </div>
                            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                              {groupHint("point")}
                            </p>
                          </div>
                          <ul className="divide-y divide-border/60">
                            {plan.step2Visible.map((row) =>
                              renderMobileRow(row, row.tier === "recommended" && plan.hasChoice),
                            )}
                          </ul>

                          {plan.hasChoice ? (
                            <div className="border-t border-border px-4 py-2.5">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 text-left text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                                aria-expanded={fallbackIsOpen}
                                aria-controls={`dns-fallback-m-${domain.public_id}`}
                                onClick={() => toggleIn(setFallbackOpen, domain.public_id)}
                              >
                                <ChevronRight
                                  className={cn(
                                    "size-3.5 shrink-0 transition-transform",
                                    fallbackIsOpen && "rotate-90",
                                  )}
                                />
                                {t("domains.fallbackToggle")}
                              </button>
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                {t("domains.fallbackToggleHint")}
                              </p>
                            </div>
                          ) : null}
                          {plan.hasChoice && fallbackIsOpen ? (
                            <div id={`dns-fallback-m-${domain.public_id}`} className="bg-muted/20">
                              <div className="border-t border-border px-4 py-2.5">
                                <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                                  {t("domains.fallbackWhy")}
                                </p>
                                {plan.step2Fallback.length > 1 ? (
                                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                    {t("domains.fallbackAddAll")}
                                  </p>
                                ) : null}
                              </div>
                              <ul className="divide-y divide-border/60">
                                {plan.step2Fallback.map((row) => renderMobileRow(row, false))}
                              </ul>
                            </div>
                          ) : null}
                        </div>

                        {/* The UI never computes a shortened name: guessing wrong
                            here takes a live shop down, so the full name from the
                            API stays the copy value. */}
                        <p className="border-t border-border px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">
                          {t("domains.nameHint")}
                        </p>
                      </div>
                    ) : null}
                  </>
                ) : null}

                {domain.check_error ? (
                  <div className="border-t border-border px-4 py-2.5">
                    <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                      {domain.check_error}
                    </p>
                    {domain.last_checked_at ? (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {t("domains.lastCheckedAt", {
                          when: formatDashboardDateTime(domain.last_checked_at, locale),
                        })}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 border-t border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {t("domains.propagationHint")}
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {t("domains.stillStuck")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn("w-full shrink-0 sm:w-auto", settingsInvertedButtonClassName)}
                    loading={verify.isPending}
                    disabled={busy || !canManage}
                    onClick={() => void handleVerify(domain)}
                  >
                    <RefreshCcw className="mr-1 size-4" />
                    {t("domains.verifyNow")}
                  </Button>
                </div>
              </article>
            );
          })}

        {!isLoading && calmDomains.length > 0 ? (
          <ul className="space-y-3">
            {calmDomains.map((domain) => (
              <li
                key={domain.public_id}
                className="flex flex-col gap-3 rounded-card border border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p dir="ltr" className="break-all font-medium text-foreground">
                      {domain.hostname}
                    </p>
                    <span
                      className={cn(
                        "rounded-ui border px-1.5 py-0.5 text-xs font-medium",
                        statusBadgeClassName(domain.status),
                      )}
                    >
                      {statusLabel(domain.status)}
                    </span>
                    {domain.is_primary ? (
                      <span className="rounded-ui border border-primary/40 bg-primary/5 px-1.5 py-0.5 text-xs font-medium text-primary">
                        {t("domains.primaryBadge")}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
                    {domain.kind === "subdomain"
                      ? t("domains.kindSubdomain")
                      : t("domains.kindCustom")}
                    {domain.verified_at
                      ? ` · ${t("domains.verifiedAt")} ${formatDashboardDateTime(domain.verified_at, locale)}`
                      : ""}
                  </p>
                  {domain.public_id !== liveDomain?.public_id && certificateNotice(domain) ? (
                    <p
                      className={cn(
                        "mt-2 text-xs leading-relaxed",
                        certificateNoticeClassName(domain),
                      )}
                    >
                      {certificateNotice(domain)}
                    </p>
                  ) : null}
                  {domain.check_error ? (
                    <p className="mt-2 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                      {domain.check_error}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {!domain.is_primary && domain.status === "active" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={settingsInvertedButtonClassName}
                      disabled={busy || !canManage}
                      onClick={() => void handleSetPrimary(domain)}
                    >
                      <Star className="mr-1 size-4" />
                      {t("domains.setPrimary")}
                    </Button>
                  ) : null}
                  {domain.removable ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="relative size-8 text-destructive hover:text-destructive after:absolute after:-inset-1.5 after:content-[''] sm:after:hidden"
                      aria-label={t("domains.removeAria")}
                      disabled={busy || !canManage}
                      onClick={() => void handleRemove(domain)}
                    >
                      <Trash className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {!isLoading && domains.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("domains.empty")}</p>
        ) : null}

        {/* The everyday view ends on the store's address, not an empty text field.
            The disclosure itself is local UI, so it stays enabled for a
            domains.view-only user; every control inside remains permission-gated. */}
        {!isLoading && hasCustomDomain && !connectOpen ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-0 text-sm text-muted-foreground hover:text-foreground"
            aria-expanded={false}
            aria-controls="domains-connect"
            onClick={() => setConnectOpen(true)}
          >
            <Plus className="mr-1 size-4" />
            {t("domains.addAnother")}
          </Button>
        ) : null}

        {showConnectForm ? (
          <div id="domains-connect" className="space-y-2">
            <label htmlFor="domains_new_hostname" className="text-sm font-medium text-foreground">
              {t("domains.connectHeading")}
            </label>
            <p className="text-sm text-muted-foreground">{t("domains.connectHint")}</p>
            <div className="flex max-w-xl flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                id="domains_new_hostname"
                name="domains_new_hostname"
                type="text"
                inputMode="url"
                placeholder={t("domains.hostnamePlaceholder")}
                value={newHostname}
                onChange={(e) => setNewHostname(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleConnect();
                  }
                }}
                disabled={busy || !canManage}
                autoComplete="off"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                data-bwignore
                className="sm:flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn("shrink-0", settingsInvertedButtonClassName)}
                loading={connect.isPending}
                disabled={busy || !canManage || newHostname.trim().length === 0}
                onClick={() => void handleConnect()}
              >
                <Plus className="mr-2 size-4" />
                {t("domains.connectButton")}
              </Button>
            </div>
          </div>
        ) : null}
      </SettingsSectionBody>
    </section>
  );
}
