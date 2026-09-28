"use client";

import { ChevronUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { AuthLanguageSwitch } from "@/components/auth/AuthLanguageSwitch";
import { PaperbaseWordmark } from "@/components/auth/AuthParts";
import { ScaleToFit } from "@/components/shop-preview/ScaleToFit";
import {
  SHOP_PHONE_WIDTH,
  SHOP_WINDOW_WIDTH,
  ShopWindow,
  type ShopDevice,
} from "@/components/shop-preview/ShopWindow";
import { heroPhoto } from "@/components/shop-preview/samples";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { toLocaleDigits } from "@/lib/locale-digits";
import { cn } from "@/lib/utils";

import { SETUP_STEPS, type SetupState, type SetupStep } from "./useSetup";

const STEP_LABEL: Record<SetupStep, string> = {
  sell: "stepSell",
  name: "stepName",
  address: "stepAddress",
  look: "stepLook",
  contact: "stepContact",
};

/**
 * Setup's two columns on a computer, the owner's design of 2026-09-28: the questions on the left,
 * the shop's dark panel on the right, as the sign-in pages are laid out.
 */
export const SETUP_COLUMNS =
  "lg:grid lg:grid-cols-[minmax(30rem,0.68fr)_minmax(0,1fr)] lg:gap-3 lg:p-3 min-[1800px]:grid-cols-[42rem_minmax(0,1fr)]";

/** The owner's shop as it stands at this step: their name, address, colours, and contact. */
export function SetupPreview({
  setup,
  device,
  fill,
  building,
  className,
}: {
  setup: SetupState;
  device?: ShopDevice;
  fill?: boolean;
  /** While setup finishes: how many of its last saves have landed (ShopWindow's `building`). */
  building?: number;
  className?: string;
}) {
  const t = useTranslations("shopPreview");
  const reached = (step: SetupStep) =>
    setup.phase === "finishing" ||
    setup.phase === "ready" ||
    SETUP_STEPS.indexOf(setup.phase as SetupStep) >= SETUP_STEPS.indexOf(step);
  const phone = reached("contact") ? setup.phoneForShop : null;
  const announcement = phone
    ? t(setup.whatsapp ? "callOrWhatsApp" : "call", { phone })
    : t("cashOnDelivery");
  return (
    <ShopWindow
      className={className}
      device={device}
      fill={fill}
      building={building}
      name={setup.shopName.trim() || t("yourShop")}
      hostname={setup.shownHostname || "…"}
      hostnameFlashKey={setup.shownHostname || undefined}
      kind={setup.kind ?? "clothing"}
      tokens={setup.paletteTokens}
      announcement={announcement}
      contact={phone}
      whatsapp={reached("contact") && setup.whatsapp}
      facebook={reached("contact") && Boolean(setup.facebook.trim())}
    />
  );
}

/**
 * The dark rounded panel a computer shows the owner's shop in, beside the questions -- the same
 * panel the sign-in pages show their photos in. The shop fills the panel's width and runs off its
 * foot, scrolling inside like a browser, with nothing empty around it (owner, 2026-09-28); it can
 * be seen as a computer shows it or as a phone does.
 *
 * `children` draws the shop for the screen chosen; `overlay` lies over it (setup's last saves
 * while they run, a note once the shop is live). `keepFrame` keeps one page across Desktop and
 * Mobile -- the real shop's frame, which a new page would have to open again -- where the drawn
 * one rises in anew.
 */
export function PreviewPanel({
  badge,
  overlay,
  keepFrame = false,
  children,
}: {
  badge: ReactNode;
  overlay?: ReactNode;
  keepFrame?: boolean;
  children: (device: ShopDevice) => ReactNode;
}) {
  const t = useTranslations("auth.onboarding");
  const [device, setDevice] = useState<ShopDevice>("computer");
  const phone = device === "phone";

  return (
    <aside className="sticky top-3 hidden h-[calc(100dvh-1.5rem)] min-w-0 flex-col self-start overflow-hidden rounded-card bg-[#141414] lg:flex dark:ring-1 dark:ring-white/[0.06]">
      <div className="flex items-center justify-between gap-3 px-7 pt-6">
        {badge}
        <div role="group" aria-label={t("previewOn")} className="flex gap-0.5 rounded-ui bg-white/[0.05] p-0.5 text-xs">
          {(["computer", "phone"] as const).map((one) => (
            <button
              key={one}
              type="button"
              aria-pressed={device === one}
              onClick={() => setDevice(one)}
              className={cn(
                "rounded-xs px-2.5 py-1 transition-colors",
                device === one ? "bg-white/[0.12] font-medium text-white" : "text-white/55 hover:text-white"
              )}
            >
              {t(one === "computer" ? "previewDesktop" : "previewMobile")}
            </button>
          ))}
        </div>
      </div>
      <div className="relative min-h-0 flex-1 px-10 pt-9">
        <ScaleToFit
          key={keepFrame ? undefined : device}
          width={phone ? SHOP_PHONE_WIDTH : SHOP_WINDOW_WIDTH}
          mode="fill"
          maxScale={phone ? 0.9 : 1}
        >
          {children(device)}
        </ScaleToFit>
        {overlay}
      </div>
    </aside>
  );
}

/**
 * Setup's frame, the owner's design of 2026-09-28: on the left "Paperbase" and Sign out, the five
 * steps as bars with where the owner is and what comes next, the question, and at the foot
 * English / বাংলা with the step's buttons; on a computer the owner's shop in the dark panel on
 * the right, changing as they answer. A phone keeps the shop behind a button that slides it up.
 */
export function SetupShell({
  setup,
  children,
  actions,
}: {
  setup: SetupState;
  children: ReactNode;
  actions: ReactNode;
}) {
  const t = useTranslations("auth.onboarding");
  const locale = useLocale();
  const [sheetOpen, setSheetOpen] = useState(false);
  const current = SETUP_STEPS.indexOf(setup.phase as SetupStep);
  const step = SETUP_STEPS[current];
  const next = SETUP_STEPS[current + 1];
  const stepOf = toLocaleDigits(t("stepOf", { current: current + 1, total: SETUP_STEPS.length }), locale);

  return (
    <div className={cn("pb-motion min-h-dvh bg-background", SETUP_COLUMNS)}>
      <div className="flex min-h-dvh min-w-0 flex-col lg:min-h-[calc(100dvh-1.5rem)]">
        <header className="shrink-0 px-5 pt-5 sm:px-12 sm:pt-8 lg:px-10 lg:pt-10 xl:px-14">
          <div className="flex items-center gap-3">
            <PaperbaseWordmark />
            <div className="ml-auto flex items-center gap-3">
              {/* On a wide screen English / বাংলা sits at the foot, beside the buttons. */}
              <AuthLanguageSwitch className="xl:hidden" />
              <button
                type="button"
                onClick={setup.logout}
                className="rounded-xs text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("signOut")}
              </button>
            </div>
          </div>
          <ol className="mt-8 grid grid-cols-5 gap-1.5 lg:mt-12" aria-label={stepOf}>
            {SETUP_STEPS.map((one, i) => (
              <li key={one} aria-current={i === current ? "step" : undefined}>
                <div className="h-[3px] overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full bg-foreground transition-[width] duration-700 ease-out"
                    style={{ width: i <= current ? "100%" : "0%" }}
                  />
                </div>
                <span className="sr-only">{t(STEP_LABEL[one])}</span>
              </li>
            ))}
          </ol>
          <div className="mt-2.5 flex items-center justify-between gap-3 text-xs" aria-hidden>
            <span className="truncate font-medium text-foreground">
              {stepOf} · {t(STEP_LABEL[step])}
            </span>
            <span className="shrink-0 text-muted-foreground">
              {next ? t("nextStep", { step: t(STEP_LABEL[next]) }) : t("lastStep")}
            </span>
          </div>
        </header>

        <div className="flex flex-1 flex-col px-5 pt-9 sm:px-12 sm:pt-12 lg:px-10 lg:pt-14 xl:px-14">
          <div className="flex-1">{children}</div>
          <div className="sticky bottom-0 -mx-5 mt-8 flex items-center gap-3 bg-gradient-to-b from-transparent to-background to-25% px-5 pb-5 pt-6 sm:-mx-12 sm:px-12 lg:static lg:mx-0 lg:bg-none lg:px-0 lg:pb-10">
            <AuthLanguageSwitch className="hidden xl:flex" />
            {/* Back on the left and the next step on the right; the first step's button alone keeps right. */}
            <div className="flex flex-1 items-center justify-between gap-3 lg:justify-end [&>:only-child]:ml-auto">{actions}</div>
          </div>
        </div>
      </div>

      <PreviewPanel
        badge={
          <span className="flex items-center gap-2 text-xs text-white/60">
            <span className="pb-live-dot size-[7px] rounded-full bg-[hsl(var(--accent-green))]" />
            {t("livePreviewNote")}
          </span>
        }
      >
        {/* A new screen rises in, as a new step does. */}
        {(device) => <SetupPreview setup={setup} device={device} fill className="pb-rise" />}
      </PreviewPanel>

      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="pb-rise fixed bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-border-subtle bg-background py-1.5 pl-1.5 pr-3.5 text-[12.5px] font-medium shadow-[0_10px_24px_-10px_rgb(15_23_42/0.35)] lg:hidden"
        style={{ animationDelay: "500ms" }}
      >
        <span className="size-6 overflow-hidden rounded-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- a fixed, pre-sized sample photo */}
          <img src={heroPhoto(setup.kind ?? "clothing")} alt="" className="size-full object-cover" />
        </span>
        {t("previewYourShop")}
        <ChevronUp className="size-3.5" aria-hidden />
      </button>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-card bg-muted px-3 pb-6 pt-4 lg:hidden">
          <SheetTitle className="px-2 text-sm">{t("livePreview")}</SheetTitle>
          {/* On a phone, the shop as a phone shows it. */}
          <ScaleToFit width={SHOP_PHONE_WIDTH}>
            <SetupPreview setup={setup} device="phone" />
          </ScaleToFit>
        </SheetContent>
      </Sheet>
    </div>
  );
}
