"use client";

import { ChevronUp, LogOut } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { AuthLanguageSwitch } from "@/components/auth/AuthLanguageSwitch";
import { ScaleToFit } from "@/components/shop-preview/ScaleToFit";
import { SHOP_WINDOW_WIDTH, ShopWindow } from "@/components/shop-preview/ShopWindow";
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

/** The owner's shop as it stands at this step: their name, address, colours, and contact. */
export function SetupPreview({ setup, className }: { setup: SetupState; className?: string }) {
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
      name={setup.shopName.trim() || t("yourShop")}
      hostname={setup.shownHostname || "…"}
      hostnameFlashKey={setup.shownHostname || undefined}
      kind={setup.kind ?? "clothing"}
      tokens={setup.paletteTokens}
      announcement={announcement}
      whatsapp={reached("contact") && setup.whatsapp}
    />
  );
}

/**
 * The dark rounded panel a computer shows the owner's shop in, beside the questions -- the same
 * panel the sign-in pages show their photos in (owner, 2026-09-28). `badge` sits in its top-left
 * corner, English / বাংলা in its top-right, after `corner`.
 */
export function PreviewPanel({
  badge,
  corner,
  children,
}: {
  badge: ReactNode;
  corner?: ReactNode;
  children: ReactNode;
}) {
  return (
    <aside className="sticky top-3 hidden h-[calc(100dvh-1.5rem)] min-w-0 flex-col self-start overflow-hidden rounded-card bg-[#141414] bg-[radial-gradient(70%_55%_at_50%_50%,rgb(255_255_255/0.07),transparent_75%)] lg:flex dark:ring-1 dark:ring-white/[0.06]">
      <div className="flex items-center justify-between gap-3 px-7 pt-7">
        {badge}
        <div className="flex items-center gap-2">
          {corner}
          <AuthLanguageSwitch onPhoto />
        </div>
      </div>
      {/* Grows past its drawn size to fill the panel (owner, 2026-09-28: "too much empty space"). */}
      <div className="min-h-0 flex-1 px-8 pb-8 pt-5 xl:px-12">
        <ScaleToFit width={SHOP_WINDOW_WIDTH} mode="contain" maxScale={1.7}>
          {children}
        </ScaleToFit>
      </div>
    </aside>
  );
}

function SignOut({ onClick, onPhoto = false, className }: { onClick: () => void; onPhoto?: boolean; className?: string }) {
  const t = useTranslations("auth.onboarding");
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("signOut")}
      className={cn(
        "flex items-center gap-1.5 rounded-ui px-2 py-1 text-xs transition-colors",
        onPhoto ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
    >
      <LogOut className="size-3.5" aria-hidden />
      <span className="hidden sm:inline">{t("signOut")}</span>
    </button>
  );
}

/**
 * Setup's frame: the step progress above the question on the left, and on a computer the owner's
 * shop in a dark panel on the right, changing as they answer. A phone keeps the shop behind a
 * button that slides it up.
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

  return (
    <div className="pb-motion min-h-dvh bg-background lg:grid lg:grid-cols-[minmax(26rem,33rem)_minmax(0,1fr)] lg:gap-3 lg:p-3">
      <div className="flex min-h-dvh min-w-0 flex-col lg:min-h-[calc(100dvh-1.5rem)]">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-4 border-b border-border-subtle bg-background/95 px-4 backdrop-blur sm:h-16 sm:gap-6 sm:px-7 lg:h-auto lg:border-0 lg:px-12 lg:pb-2 lg:pt-7">
          <ol className="hidden flex-1 grid-cols-5 gap-1.5 md:grid" aria-label={t("stepOf", { current: current + 1, total: SETUP_STEPS.length })}>
            {SETUP_STEPS.map((step, i) => (
              <li key={step} className="min-w-0" aria-current={i === current ? "step" : undefined}>
                <div className="h-[3px] overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full bg-foreground transition-[width] duration-700 ease-out"
                    style={{ width: i < current ? "100%" : i === current ? "50%" : "0%" }}
                  />
                </div>
                <span
                  className={cn(
                    "mt-1.5 block truncate text-[11px] transition-colors",
                    i === current ? "font-medium text-foreground" : i < current ? "text-muted-foreground" : "text-muted-foreground/60"
                  )}
                >
                  {t(STEP_LABEL[step])}
                </span>
              </li>
            ))}
          </ol>
          <span className="whitespace-nowrap text-xs text-muted-foreground md:hidden">
            {toLocaleDigits(t("stepOf", { current: current + 1, total: SETUP_STEPS.length }), locale)}
          </span>
          {/* On a computer both sit in the shop panel's top corner, leaving the steps the row. */}
          <div className="ml-auto flex items-center gap-2 lg:hidden">
            <AuthLanguageSwitch />
            <SignOut onClick={setup.logout} />
          </div>
          <div className="absolute inset-x-0 -bottom-px h-[3px] bg-border md:hidden">
            <div
              className="h-full bg-foreground transition-[width] duration-700 ease-out"
              style={{ width: `${((current + 1) / SETUP_STEPS.length) * 100}%` }}
            />
          </div>
        </header>

        <div className="flex flex-1 flex-col px-5 pt-7 sm:px-12 sm:pt-12 lg:pt-10">
          <div className="flex-1">{children}</div>
          <div className="sticky bottom-0 -mx-5 mt-8 flex items-center justify-between gap-3 bg-gradient-to-b from-transparent to-background to-25% px-5 pb-5 pt-6 sm:-mx-12 sm:px-12 lg:static lg:mx-0 lg:bg-none lg:px-0 lg:pb-8">
            {actions}
          </div>
        </div>
      </div>

      <PreviewPanel
        corner={<SignOut onPhoto onClick={setup.logout} />}
        badge={
          <span className="flex items-center gap-2 text-xs text-white/65">
            <span className="pb-live-dot size-[7px] rounded-full bg-[hsl(var(--accent-green))]" />
            {t("livePreview")}
          </span>
        }
      >
        <div className="pb-rise" style={{ animationDelay: "150ms" }}>
          <SetupPreview setup={setup} />
        </div>
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
          <ScaleToFit width={SHOP_WINDOW_WIDTH}>
            <SetupPreview setup={setup} />
          </ScaleToFit>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/** The heading every step opens with. */
export function StepHeading({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <div>
      <p className="mb-2.5 text-xs font-medium tracking-[0.02em] text-muted-foreground">{kicker}</p>
      <h1 className="text-2xl font-semibold leading-tight tracking-[-0.025em] text-foreground sm:text-[1.875rem]">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
