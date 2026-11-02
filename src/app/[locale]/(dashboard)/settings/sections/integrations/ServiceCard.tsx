"use client";

import { useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { DotsThreeIcon, LinkBreakIcon, SealCheckIcon } from "@phosphor-icons/react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { SERVICE_LOGO_FILES, type ServiceKey } from "@/lib/integrations/services";
import { settingsInvertedButtonClassName } from "../../SettingsSectionBody";

/**
 * One service on Settings > Integrations (owner, 2026-11-02, from a design they chose): its logo,
 * name and state, a green seal once it is connected, what it does in one sentence, and View details
 * -- which opens the service's pop-up, where every connection is listed and the whole service is
 * switched. Not in the grid: the owner found a card opening in place "unprofessional" (2026-09-25).
 *
 * Column widths follow the `cards` container, the width the page really has, not the screen's.
 */

export type ServiceTone = "on" | "off" | "none";

/** The sides and foot of every pop-up screen, so the screens line up with each other. */
export const DIALOG_BODY = "px-4 pb-5 sm:px-7 sm:pb-[26px]";

/** Colour logos sit straight on a light card; on a dark one, a wordmark's dark letters need a white tile. */
function ServiceLogo({ service, faded = false }: { service: ServiceKey; faded?: boolean }) {
  const { src, wide } = SERVICE_LOGO_FILES[service];
  return (
    <span
      className={cn(
        "flex h-11 shrink-0 items-center justify-center overflow-hidden rounded-ui dark:bg-white",
        wide ? "w-[68px] dark:w-[74px] dark:px-1.5" : "w-9 dark:w-11 dark:p-1.5",
        faded && "opacity-70",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a fixed, local file */}
      <img src={src} alt="" className="size-full object-contain" />
    </span>
  );
}

export function StatusLine({ tone, children }: { tone: ServiceTone; children: ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-2 text-[12px] text-muted-foreground">
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          tone === "on" ? "bg-green-500 ring-[3px] ring-green-500/20" : "bg-muted-foreground/60",
        )}
      />
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

export function ServiceCard({
  service,
  name,
  blurb,
  status,
  tone,
  sealed = false,
  onOpen,
  onConnect,
  comingSoon = false,
  filteredOut = false,
}: {
  service: ServiceKey;
  name: string;
  /** What the service does for the shop, in one sentence. */
  blurb: string;
  status?: ReactNode;
  tone: ServiceTone;
  /** The green seal: it has a connection that can run. Grey while they are all off. */
  sealed?: boolean;
  /** Opens the service's pop-up. Absent: nothing to open (not connected, or not built yet). */
  onOpen?: () => void;
  /** Absent for whoever may not connect it. */
  onConnect?: () => void;
  comingSoon?: boolean;
  /** Hidden, not removed: the card holds its pop-up, which a filter must never close. */
  filteredOut?: boolean;
}) {
  const t = useTranslations("settings.integrations");
  return (
    <article
      data-service={service}
      hidden={filteredOut}
      className={cn(
        "relative flex min-w-0 flex-col rounded-card border border-border transition-colors hover:border-muted-foreground/40",
        comingSoon
          ? "col-span-1 p-3 @min-[36rem]/cards:p-[18px]"
          : "col-span-2 bg-card p-[15px] @min-[36rem]/cards:col-span-1 @min-[36rem]/cards:min-h-[206px] @min-[36rem]/cards:p-[18px]",
      )}
    >
      <div className={cn("flex min-w-0 items-center gap-3", comingSoon && "flex-wrap gap-y-2 @min-[36rem]/cards:flex-nowrap")}>
        <ServiceLogo service={service} faded={comingSoon} />
        <div className={cn("min-w-0 flex-1", comingSoon && "basis-full @min-[36rem]/cards:basis-0")}>
          <p
            className={cn(
              "leading-snug",
              comingSoon
                ? "text-[13px] font-medium text-muted-foreground @min-[36rem]/cards:text-[15px]"
                : "truncate pe-7 text-[15px] font-semibold text-foreground",
            )}
          >
            {name}
          </p>
          {status ? <div className="mt-0.5"><StatusLine tone={tone}>{status}</StatusLine></div> : null}
        </div>
        {comingSoon ? (
          <span className="order-last -mt-1.5 basis-full text-[11.5px] text-muted-foreground @min-[36rem]/cards:order-none @min-[36rem]/cards:mt-0 @min-[36rem]/cards:basis-auto @min-[36rem]/cards:self-start @min-[36rem]/cards:whitespace-nowrap @min-[36rem]/cards:rounded-ui @min-[36rem]/cards:border @min-[36rem]/cards:border-border @min-[36rem]/cards:px-[7px] @min-[36rem]/cards:py-0.5 @min-[36rem]/cards:text-[11px]">
            {t("comingSoon")}
          </span>
        ) : null}
      </div>
      {sealed ? (
        <SealCheckIcon
          aria-hidden
          weight="fill"
          className={cn(
            "absolute end-4 top-4 size-[22px]",
            tone === "on" ? "text-green-600 dark:text-green-500" : "text-muted-foreground/60",
          )}
        />
      ) : null}
      <p className={cn("mt-3 flex-1 text-[13px] leading-relaxed text-muted-foreground", comingSoon && "hidden @min-[36rem]/cards:block")}>
        {blurb}
      </p>
      {onOpen || onConnect ? (
        <div className="mt-2.5 flex justify-end">
          {onOpen ? (
            <Button type="button" variant="outline" size="sm" className="text-[12px]" aria-haspopup="dialog" onClick={onOpen}>
              {t("viewDetails")}
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" className={cn("text-[12px]", settingsInvertedButtonClassName)} onClick={onConnect}>
              {t("connect")}
            </Button>
          )}
        </div>
      ) : null}
    </article>
  );
}

/** The logo at the head of a pop-up: always on its tile, so the pop-up opens on the service's mark. */
function DialogLogo({ service }: { service: ServiceKey }) {
  const { src, wide } = SERVICE_LOGO_FILES[service];
  return (
    <span
      className={cn(
        "flex h-11 shrink-0 items-center justify-center overflow-hidden rounded-ui bg-white ring-1 ring-border sm:h-[52px]",
        wide ? "w-[70px] px-1.5 sm:w-[88px] sm:px-2" : "w-11 p-2 sm:w-[52px] sm:p-2.5",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a fixed, local file */}
      <img src={src} alt="" className="size-full object-contain" />
    </span>
  );
}

/** How far down a phone's sheet is pulled before letting go closes it. */
const SHEET_CLOSE_PX = 80;

/** The bar at the top of a phone's sheet: pull it down to close. Decoration to a screen reader, which has Close. */
function SheetHandle({ onClose }: { onClose: () => void }) {
  const startY = useRef<number | null>(null);
  const sheetOf = (event: React.PointerEvent) =>
    event.currentTarget.closest<HTMLElement>('[data-slot="dialog-content"]');

  function release(event: React.PointerEvent, closes: boolean) {
    const sheet = sheetOf(event);
    if (sheet) {
      sheet.style.transform = "";
      sheet.style.transition = "";
    }
    startY.current = null;
    if (closes) onClose();
  }

  return (
    <div
      aria-hidden
      className="absolute inset-x-0 top-0 z-10 flex h-7 touch-none justify-center pt-2 sm:hidden"
      onPointerDown={(event) => {
        startY.current = event.clientY;
        event.currentTarget.setPointerCapture(event.pointerId);
        const sheet = sheetOf(event);
        if (sheet) sheet.style.transition = "none";
      }}
      onPointerMove={(event) => {
        if (startY.current === null) return;
        const sheet = sheetOf(event);
        if (sheet) sheet.style.transform = `translateY(${Math.max(0, event.clientY - startY.current)}px)`;
      }}
      onPointerUp={(event) => {
        if (startY.current === null) return;
        release(event, event.clientY - startY.current > SHEET_CLOSE_PX);
      }}
      onPointerCancel={(event) => release(event, false)}
    >
      <span className="h-1 w-[38px] rounded-full bg-muted-foreground/50" />
    </div>
  );
}

/**
 * A pop-up of this page (owner, 2026-11-02): a raised card, as tall as what it holds, on a softly
 * blurred page. No close button: pressing outside closes it, as does Esc; the hidden Close is for a
 * screen reader, which can press neither. On a phone it rises from the bottom, so there is an
 * outside to press, and its bar can be pulled down.
 *
 * It holds one screen at a time -- the list, or a form or a question opened from it, with a Back
 * arrow -- so a pop-up never opens on top of another. `service` draws its logo on the list screen;
 * `control` sits on the title's line.
 */
export function ServiceDialog({
  open,
  onOpenChange,
  service,
  title,
  subtitle,
  onBack,
  control,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: ServiceKey;
  title: string;
  subtitle: ReactNode;
  /** Shown on every screen but the list. */
  onBack?: () => void;
  control?: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations("settings.integrations");
  const tCommon = useTranslations("common");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/30 backdrop-blur-[8px] dark:bg-black/60"
        className={cn(
          "flex max-h-[86dvh] flex-col gap-0 overflow-hidden border-0 bg-card p-0 [box-shadow:var(--shadow-raised)]",
          "max-sm:inset-x-0 max-sm:top-auto max-sm:bottom-0 max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none",
          "max-sm:data-[state=open]:animate-[sheet-rise_320ms_cubic-bezier(0.16,1,0.3,1)]! max-sm:data-[state=closed]:animate-[sheet-fall_180ms_ease-in_forwards]!",
          "sm:max-h-[min(90dvh,44rem)] sm:w-[calc(100vw-2rem)] sm:max-w-[35rem] sm:rounded-card",
          "sm:data-[state=open]:animate-[card-rise_300ms_cubic-bezier(0.16,1,0.3,1)]!",
        )}
      >
        <SheetHandle onClose={() => onOpenChange(false)} />
        <DialogClose className="sr-only">{tCommon("close")}</DialogClose>
        <DialogHeader className="shrink-0 border-b-0 px-4 pb-4 pt-6 sm:px-7 sm:pb-5 sm:pt-7">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            {onBack ? (
              <Button type="button" variant="ghost" size="icon" className="-ms-2 shrink-0" onClick={onBack} aria-label={t("back")}>
                <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
              </Button>
            ) : service ? (
              <DialogLogo service={service} />
            ) : null}
            <div className="min-w-0 flex-1 space-y-0.5 text-start">
              <DialogTitle className="text-[17px] font-semibold leading-snug tracking-[-0.01em]">{title}</DialogTitle>
              <DialogDescription asChild className="text-[12px]">
                <div>{subtitle}</div>
              </DialogDescription>
            </div>
            {control}
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
  cancelLabel,
  confirmDanger = false,
  busy,
  onCancel,
  onConfirm,
  formId,
}: {
  children: ReactNode;
  confirmLabel: string;
  /** "Cancel" unless the question reads better with its own words. */
  cancelLabel?: string;
  confirmDanger?: boolean;
  busy: boolean;
  onCancel: () => void;
  /** A question's action; a form submits through `formId` instead. */
  onConfirm?: () => void;
  formId?: string;
}) {
  const t = useTranslations("settings");
  return (
    <div className={cn("flex flex-col gap-4", DIALOG_BODY)}>
      {children}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          {cancelLabel ?? t("cancel")}
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

/** A service's connections, held together on a quiet panel; the pop-up is as tall as they are (owner, 2026-11-02). */
export function ConnectionList({ children }: { children: ReactNode }) {
  return <div className="mx-4 overflow-hidden rounded-ui bg-muted/60 ring-1 ring-inset ring-border sm:mx-7">{children}</div>;
}

/** Under the list: what can be added, and how many more. */
export function ConnectionFoot({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-5 pt-3.5 sm:px-7 sm:pb-[26px] sm:pt-[18px]">{children}</div>
  );
}

/** What can be done to a connection, behind its ···, so a row stays one calm line. */
export function ConnectionMenu({ items }: { items: { label: string; onSelect: () => void }[] }) {
  const t = useTranslations("nav");
  if (items.length === 0) return null;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="w-9 px-0" aria-label={t("more")}>
          <DotsThreeIcon weight="bold" className="size-5" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {items.map((item) => (
          <DropdownMenuItem key={item.label} onSelect={item.onSelect}>
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
      <div className="flex min-h-16 min-w-0 flex-wrap items-center gap-x-3 gap-y-1 py-2 pe-2 ps-3.5 sm:min-h-[72px]">
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
