"use client";

import { useId, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowsLeftRightIcon, MetaLogoIcon, TiktokLogoIcon } from "@phosphor-icons/react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { PLATFORM_MARK_SRC, SERVICE_LOGO_FILES, type ServiceKey } from "@/lib/integrations/services";

/**
 * One service on Settings > Integrations (owner, 2026-09-25, from a reference
 * they chose): the Paperbase mark and the service's own logo joined by arrows,
 * the service's name and state, and its switch. Clicking it opens the card
 * across the whole grid, where every connection of the service is listed.
 */

export type ServiceTone = "on" | "off" | "none";

function ServiceLogo({ service, compact }: { service: ServiceKey; compact?: boolean }) {
  const file = SERVICE_LOGO_FILES[service];
  const tile = cn(
    "flex shrink-0 items-center justify-center overflow-hidden border border-border bg-white",
    compact ? "h-8 rounded-[7px]" : "h-10 rounded-[9px]",
    file?.wide ? (compact ? "w-[84px] px-1.5" : "w-[104px] px-2") : compact ? "w-8" : "w-10",
  );
  const icon = compact ? "size-5" : "size-6";
  return (
    <span className={tile}>
      {service === "facebook" ? (
        <MetaLogoIcon className={cn(icon, "text-[#0866FF]")} weight="bold" />
      ) : service === "tiktok" ? (
        <TiktokLogoIcon className={cn(icon, "text-black")} weight="fill" />
      ) : file ? (
        // eslint-disable-next-line @next/next/no-img-element -- a fixed, local file
        <img src={file.src} alt="" className={cn("h-full w-full object-contain", file.wide ? "py-1.5" : "p-1.5")} />
      ) : null}
    </span>
  );
}

export function LogoPair({ service, compact }: { service: ServiceKey; compact?: boolean }) {
  return (
    <span className="flex shrink-0 items-center gap-2" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- the dashboard's own icon */}
      <img
        src={PLATFORM_MARK_SRC}
        alt=""
        className={cn("shrink-0", compact ? "size-8 rounded-[7px]" : "size-10 rounded-[9px]")}
      />
      <ArrowsLeftRightIcon className="size-4 shrink-0 text-muted-foreground" />
      <ServiceLogo service={service} compact={compact} />
    </span>
  );
}

function StatusLine({ tone, children }: { tone: ServiceTone; children: ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-muted-foreground">
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          tone === "on" ? "bg-green-500" : "bg-muted-foreground/60",
        )}
      />
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

export function ServiceCard({
  service,
  name,
  status,
  tone,
  control,
  expanded = false,
  onToggleExpanded,
  comingSoon = false,
  children,
}: {
  service: ServiceKey;
  name: string;
  status: ReactNode;
  tone: ServiceTone;
  /** The card's switch, its Connect button, or nothing. */
  control?: ReactNode;
  expanded?: boolean;
  /** Absent: the card does not open (a service that is not connected, or not built yet). */
  onToggleExpanded?: () => void;
  comingSoon?: boolean;
  /** What the opened card holds: the service's connections. */
  children?: ReactNode;
}) {
  const t = useTranslations("settings.integrations");
  const bodyId = useId();
  const open = expanded && !!onToggleExpanded;
  const words = (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-start">
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-[13px] font-medium text-foreground">{name}</span>
        {onToggleExpanded ? (
          <ChevronDown
            aria-hidden
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground transition-transform duration-150",
              open && "rotate-180",
            )}
          />
        ) : null}
      </span>
      <StatusLine tone={tone}>{status}</StatusLine>
    </span>
  );
  const badge = comingSoon ? (
    <Badge variant="outline" className="shrink-0 text-[11px] font-normal text-muted-foreground">
      {t("comingSoon")}
    </Badge>
  ) : null;

  if (open) {
    return (
      <div
        data-service={service}
        className="col-span-full min-w-0 overflow-hidden rounded-card border border-border bg-card"
      >
        <div className="flex min-w-0 items-center gap-3 bg-muted/40 px-3.5 py-2.5">
          <LogoPair service={service} compact />
          <button
            type="button"
            aria-expanded
            aria-controls={bodyId}
            onClick={onToggleExpanded}
            className="flex min-h-11 min-w-0 flex-1 items-center rounded-ui outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20"
          >
            {words}
          </button>
          {control}
        </div>
        <div id={bodyId} className="border-t border-border">
          {children}
        </div>
      </div>
    );
  }

  // The logos and the words are ONE button, so a click anywhere opens the card;
  // the switch sits beside it rather than inside it (a control in a control).
  const top = (
    <span className="flex h-[76px] w-full items-center justify-center border-b border-border bg-muted/40">
      <LogoPair service={service} />
    </span>
  );
  const bottom = <span className="flex min-h-[52px] w-full items-center px-3.5 py-2.5 pe-24">{words}</span>;
  return (
    <div
      data-service={service}
      className={cn(
        "relative min-w-0 overflow-hidden rounded-card border border-border bg-card",
        comingSoon && "opacity-60",
      )}
    >
      {onToggleExpanded ? (
        <button
          type="button"
          aria-expanded={false}
          aria-controls={bodyId}
          onClick={onToggleExpanded}
          className="flex w-full flex-col outline-none transition-colors hover:bg-muted/20 focus-visible:ring-[3px] focus-visible:ring-ring/20"
        >
          {top}
          {bottom}
        </button>
      ) : (
        <div className="flex w-full flex-col">
          {top}
          {bottom}
        </div>
      )}
      <div className="absolute end-3.5 bottom-0 flex h-[52px] items-center">{control ?? badge}</div>
    </div>
  );
}

/** One connection inside an opened card: its switch, what it is, and what can be done to it. */
export function ConnectionRow({
  title,
  detail,
  active,
  switchLabel,
  canManage,
  switching,
  onSwitch,
  actions,
  children,
}: {
  title: ReactNode;
  detail: ReactNode;
  active: boolean;
  switchLabel: string;
  canManage: boolean;
  switching: boolean;
  onSwitch: (next: boolean) => void;
  actions?: ReactNode;
  /** Anything the connection carries below its row (Steadfast's webhook setup). */
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2">
        <Switch
          checked={active}
          onCheckedChange={onSwitch}
          disabled={!canManage || switching}
          aria-label={switchLabel}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-foreground">{title}</p>
          <p className="truncate text-[12px] text-muted-foreground">{detail}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
