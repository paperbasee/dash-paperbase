"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowsLeftRightIcon, LinkBreakIcon, MetaLogoIcon, TiktokLogoIcon } from "@phosphor-icons/react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { PLATFORM_MARK_SRC, SERVICE_LOGO_FILES, type ServiceKey } from "@/lib/integrations/services";
import { settingsInvertedButtonClassName } from "../../SettingsSectionBody";

/**
 * One service on Settings > Integrations (owner, 2026-09-25, from a reference
 * they chose): the Paperbase mark and the service's own logo joined by arrows,
 * the service's name and state, and its switch. Clicking it opens the
 * service's pop-up, where every connection of the service is listed -- not
 * inline: the owner found a card opening in the grid "unprofessional".
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

export function StatusLine({ tone, children }: { tone: ServiceTone; children: ReactNode }) {
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
  onOpen,
  comingSoon = false,
}: {
  service: ServiceKey;
  name: string;
  status: ReactNode;
  tone: ServiceTone;
  /** The card's switch, its Connect button, or nothing. */
  control?: ReactNode;
  /** Opens the service's pop-up. Absent: nothing to open (not connected, or not built yet). */
  onOpen?: () => void;
  comingSoon?: boolean;
}) {
  const t = useTranslations("settings.integrations");
  const top = (
    <span className="flex h-[76px] w-full items-center justify-center border-b border-border bg-muted/40">
      <LogoPair service={service} />
    </span>
  );
  const bottom = (
    <span className="flex min-h-[52px] w-full items-center px-3.5 py-2.5 pe-24">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-start">
        <span className="flex min-w-0 items-center gap-1">
          <span className="truncate text-[13px] font-medium text-foreground">{name}</span>
          {onOpen ? <ChevronRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground" /> : null}
        </span>
        <StatusLine tone={tone}>{status}</StatusLine>
      </span>
    </span>
  );
  // The logos and the words are ONE button, so a click anywhere opens the
  // pop-up; the switch sits beside it rather than inside it (a control in a control).
  return (
    <div
      data-service={service}
      className={cn(
        "relative min-w-0 overflow-hidden rounded-card border border-border bg-card",
        comingSoon && "opacity-60",
      )}
    >
      {onOpen ? (
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={onOpen}
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
      <div className="absolute end-3.5 bottom-0 flex h-[52px] items-center">
        {comingSoon ? (
          <Badge variant="outline" className="shrink-0 text-[11px] font-normal text-muted-foreground">
            {t("comingSoon")}
          </Badge>
        ) : (
          control
        )}
      </div>
    </div>
  );
}

/**
 * A service's pop-up. It holds one screen at a time -- the list, or a form or
 * a question opened from it, with a Back arrow -- so a pop-up never opens on
 * top of another. On a phone it fills the screen.
 */
export function ServiceDialog({
  open,
  onOpenChange,
  service,
  title,
  subtitle,
  onBack,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceKey;
  title: string;
  subtitle: ReactNode;
  /** Shown on every screen but the list. */
  onBack?: () => void;
  children: ReactNode;
}) {
  const t = useTranslations("settings.integrations");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex h-dvh max-h-dvh w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none p-0",
          "sm:h-auto sm:max-h-[min(90dvh,44rem)] sm:w-[calc(100vw-2rem)] sm:max-w-[40rem] sm:rounded-card",
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pe-12 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            {onBack ? (
              <Button type="button" variant="ghost" size="icon" className="-ms-2 shrink-0" onClick={onBack} aria-label={t("back")}>
                <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
              </Button>
            ) : (
              <LogoPair service={service} compact />
            )}
            <div className="min-w-0 space-y-0.5 text-start">
              <DialogTitle className="truncate text-[15px] font-medium leading-snug">{title}</DialogTitle>
              <DialogDescription asChild className="text-[12px]">
                <div>{subtitle}</div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

/** A form or a question inside the pop-up: its body, then its two buttons. */
export function DialogScreen({
  children,
  confirmLabel,
  confirmDanger = false,
  busy,
  onCancel,
  onConfirm,
  formId,
}: {
  children: ReactNode;
  confirmLabel: string;
  confirmDanger?: boolean;
  busy: boolean;
  onCancel: () => void;
  /** A question's action; a form submits through `formId` instead. */
  onConfirm?: () => void;
  formId?: string;
}) {
  const t = useTranslations("settings");
  return (
    <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
      {children}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          {t("cancel")}
        </Button>
        <Button
          type={formId ? "submit" : "button"}
          form={formId}
          variant={confirmDanger ? "destructive" : "outline"}
          className={confirmDanger ? undefined : settingsInvertedButtonClassName}
          onClick={onConfirm}
          disabled={busy}
          loading={busy}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}

/** A connection's on/off, named for the connection. */
export function ConnectionSwitch({
  active,
  label,
  disabled,
  onSwitch,
}: {
  active: boolean;
  label: string;
  disabled: boolean;
  onSwitch: (next: boolean) => void;
}) {
  return <Switch checked={active} onCheckedChange={onSwitch} disabled={disabled} aria-label={label} />;
}

/** Where a disconnected connection's switch would be: it has none until reconnected. */
export function DisconnectedMark() {
  return (
    <span className="flex h-11 w-10 shrink-0 items-center justify-center text-muted-foreground md:h-9" aria-hidden>
      <LinkBreakIcon className="size-4" />
    </span>
  );
}

/**
 * The pop-up keeps room for THREE connections, the most a service has (owner,
 * 2026-09-25: one or two "looks too small"), and never grows past it. A row is
 * one 3.5rem line plus its 1px border; a Steadfast account adds its 2.5rem
 * delivery-updates line and that line's border.
 */
const ROOM_FOR_THREE = {
  pixels: "sm:min-h-[calc(3*(3.5rem_+_1px))]",
  accounts: "sm:min-h-[calc(3*(6rem_+_2px))]",
} as const;

export function ConnectionList({ kind, children }: { kind: keyof typeof ROOM_FOR_THREE; children: ReactNode }) {
  return <div className={ROOM_FOR_THREE[kind]}>{children}</div>;
}

/** One connection in a service's pop-up: its switch, what it is, and what can be done to it. */
export function ConnectionRow({
  lead,
  title,
  detail,
  detailTone,
  actions,
  children,
}: {
  lead: ReactNode;
  title: ReactNode;
  detail: ReactNode;
  detailTone?: "warning";
  actions?: ReactNode;
  /** Anything the connection carries below its row (Steadfast's webhook setup). */
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex min-h-14 min-w-0 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 sm:px-5">
        {lead}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-foreground">{title}</p>
          <p
            className={cn(
              "truncate text-[12px]",
              detailTone === "warning" ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground",
            )}
          >
            {detail}
          </p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
