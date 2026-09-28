"use client";

import { Check, CircleCheck, Cloud, Copy, Globe, Lock, RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";

import { SocialMark } from "@/components/SocialMark";
import { KIND_ICONS, SHOP_KINDS, SUGGESTED_PALETTE, heroPhoto } from "@/components/shop-preview/samples";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toLocaleDigits } from "@/lib/locale-digits";
import { paletteName } from "@/lib/theme-editor/palettes";
import { cn } from "@/lib/utils";

import { StepHeading } from "./SetupShell";
import { DOMAINS_ENABLED, type SetupState } from "./useSetup";

/** "Step 2 of 5", in the reader's digits. */
function useStepKicker(step: number): string {
  const t = useTranslations("auth.onboarding");
  const locale = useLocale();
  return toLocaleDigits(t("stepOf", { current: step, total: 5 }), locale);
}

function FieldError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-2 text-xs text-destructive">
      {children}
    </p>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-3.5 animate-spin rounded-full border-[1.5px] border-border border-t-foreground", className)}
    />
  );
}

/** A round tick that pops in; a spinning ring while working; an empty ring before. */
function TickMark({ state, tone = "ok" }: { state: "todo" | "now" | "done" | "fail"; tone?: "ok" | "ink" }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] text-white transition-all duration-300",
        state === "todo" && "border-border",
        state === "now" && "animate-spin border-border border-t-foreground",
        state === "done" && cn("pb-pop", tone === "ok" ? "border-[hsl(var(--accent-green))] bg-[hsl(var(--accent-green))]" : "border-foreground bg-foreground text-background"),
        state === "fail" && "border-dashed border-border-hover"
      )}
      aria-hidden
    >
      {state === "done" ? <Check className="size-3" /> : null}
    </span>
  );
}

export { TickMark };

// ---- 1. What will you sell? --------------------------------------------------------------------

export function SellStep({ setup, className }: { setup: SetupState; className?: string }) {
  const t = useTranslations("auth.onboarding");
  const tKinds = useTranslations("shopPreview.kinds");
  return (
    <div className={cn("space-y-7", className)}>
      <StepHeading kicker={t("sellKicker")} title={t("sellTitle")} body={t("sellBody")} />
      <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label={t("sellTitle")}>
        {SHOP_KINDS.map((kind) => {
          const Icon = KIND_ICONS[kind];
          const on = setup.kind === kind;
          return (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setup.setKind(kind)}
              className={cn(
                "relative flex flex-col items-start gap-2.5 rounded-card border p-3 text-left transition-[border-color,background-color,box-shadow] duration-150 sm:flex-row sm:items-center sm:gap-3 sm:p-3.5",
                on
                  ? "border-foreground shadow-[inset_0_0_0_1px_hsl(var(--foreground))]"
                  : "border-border-subtle hover:border-border-hover hover:bg-muted/40"
              )}
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-ui transition-colors duration-200",
                  on ? "bg-foreground text-background" : "bg-muted text-foreground/80"
                )}
              >
                <Icon className="size-5" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{tKinds(`${kind}.name`)}</span>
                <span className="hidden text-xs text-muted-foreground sm:block">{tKinds(`${kind}.examples`)}</span>
              </span>
              <span
                className={cn(
                  "absolute right-2.5 top-2.5 flex size-[18px] items-center justify-center rounded-full bg-foreground text-background transition-transform duration-200",
                  on ? "scale-100" : "scale-0"
                )}
                aria-hidden
              >
                <Check className="size-3" />
              </span>
            </button>
          );
        })}
      </div>
      {setup.stepError === "sell" ? <FieldError>{t("sellRequired")}</FieldError> : null}
    </div>
  );
}

// ---- 2. What's your shop called? ---------------------------------------------------------------

export function NameStep({ setup, className }: { setup: SetupState; className?: string }) {
  const t = useTranslations("auth.onboarding");
  const kicker = useStepKicker(2);
  const check = setup.nameCheck;
  const hostname = setup.storeMade ? setup.storeHostname : check.state === "ok" ? check.hostname : "";

  return (
    <div className={cn("space-y-7", className)}>
      <StepHeading kicker={kicker} title={t("nameTitle")} body={t("nameBody")} />
      <div>
        <label htmlFor="shop_name" className="field-label">
          {t("nameLabel")}
        </label>
        <Input
          id="shop_name"
          size="lg"
          autoFocus
          autoComplete="organization"
          maxLength={60}
          value={setup.shopName}
          onChange={(e) => setup.setShopName(e.target.value)}
          placeholder={t("namePlaceholder")}
          aria-invalid={setup.stepError === "name" || check.state === "needs_letters"}
          className="h-14 text-lg font-medium md:text-lg"
        />
        {setup.stepError === "name" ? <FieldError>{t("nameRequired")}</FieldError> : null}
        {check.state === "needs_letters" ? <FieldError>{t("nameNeedsLetters")}</FieldError> : null}

        {/* The address this name gets: shown while typed, the shop's own once it is made. */}
        {setup.storeMade && !hostname ? null : (
          <div className="mt-3.5 flex min-h-[46px] items-center gap-2.5 rounded-ui bg-muted/60 px-3.5 py-2.5 text-[13px]">
            <Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            {hostname ? (
              <span className="min-w-0 truncate text-foreground">
                <b className="font-medium">{hostname.split(".")[0]}</b>
                {hostname.slice(hostname.indexOf("."))}
              </span>
            ) : (
              <span className="text-muted-foreground">{t("addressPending")}</span>
            )}
            {check.state === "checking" && !setup.storeMade ? (
              <span className="ml-auto flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                <Spinner />
                {t("checking")}
              </span>
            ) : hostname ? (
              <span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-[hsl(var(--accent-green))]">
                <CircleCheck className="size-3.5" aria-hidden />
                {t("available")}
              </span>
            ) : null}
          </div>
        )}
      </div>

      {setup.askOwnerName ? (
        <fieldset className="space-y-2">
          <legend className="field-label">{t("yourName")}</legend>
          <div className="grid grid-cols-2 gap-3">
            <Input
              size="lg"
              aria-label={t("firstName")}
              placeholder={t("firstName")}
              value={setup.ownerFirst}
              onChange={(e) => setup.setOwnerFirst(e.target.value)}
              autoComplete="given-name"
            />
            <Input
              size="lg"
              aria-label={t("lastName")}
              placeholder={t("lastName")}
              value={setup.ownerLast}
              onChange={(e) => setup.setOwnerLast(e.target.value)}
              autoComplete="family-name"
            />
          </div>
          {setup.stepError === "owner" ? <FieldError>{t("ownerNameRequired")}</FieldError> : null}
        </fieldset>
      ) : null}
    </div>
  );
}

// ---- 3. Where will shoppers find you? ----------------------------------------------------------

function CopyButton({ value }: { value: string }) {
  const t = useTranslations("auth.onboarding");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void navigator.clipboard?.writeText(value).then(() => setCopied(true));
      }}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-ui border px-2 py-1 text-[11.5px] transition-colors",
        copied
          ? "border-[hsl(var(--accent-green)/0.4)] bg-[hsl(var(--accent-green)/0.1)] text-[hsl(var(--accent-green))]"
          : "border-border-subtle text-foreground/80 hover:bg-muted"
      )}
    >
      {copied ? <Check className="size-3" aria-hidden /> : <Copy className="size-3" aria-hidden />}
      {copied ? t("copied") : t("copy")}
    </button>
  );
}

function Option({
  on,
  onPick,
  children,
}: {
  on: boolean;
  onPick: () => void;
  children: ReactNode;
}) {
  return (
    <div
      role="radio"
      aria-checked={on}
      tabIndex={0}
      onClick={onPick}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPick();
        }
      }}
      className={cn(
        "flex cursor-pointer gap-3 rounded-card border p-4 text-left outline-none transition-[border-color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-ring",
        on ? "cursor-default border-foreground shadow-[inset_0_0_0_1px_hsl(var(--foreground))]" : "border-border-subtle hover:border-border-hover"
      )}
    >
      <span
        className={cn(
          "relative mt-0.5 size-[18px] shrink-0 rounded-full border-[1.5px] transition-colors",
          on ? "border-foreground" : "border-border-hover"
        )}
        aria-hidden
      >
        {on ? <span className="pb-pop absolute inset-[3px] rounded-full bg-foreground" /> : null}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function AddressStep({ setup, className }: { setup: SetupState; className?: string }) {
  const t = useTranslations("auth.onboarding");
  const kicker = useStepKicker(3);
  const free = setup.storeHostname;
  const example = free ? `${free.split(".")[0]}.com` : "yourshop.com";
  const check = setup.domainCheck;
  const result = check.result;
  const checking = check.state === "checking";

  return (
    <div className={cn("space-y-6", className)}>
      <StepHeading
        kicker={kicker}
        title={t("addressTitle")}
        body={DOMAINS_ENABLED ? t("addressBody") : t("addressBodyFreeOnly")}
      />
      <div className="space-y-3" role="radiogroup" aria-label={t("addressTitle")}>
        <Option on={setup.addressMode === "free"} onPick={() => setup.setAddressMode("free")}>
          <p className="text-sm font-medium text-foreground">{t("freeAddress")}</p>
          {free ? (
            <>
              <p className="mt-1 truncate font-mono text-[12.5px] text-foreground">{free}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-xs bg-[hsl(var(--accent-green)/0.1)] px-2 py-0.5 text-[11px] text-[hsl(var(--accent-green))]">
                  <CircleCheck className="size-3" aria-hidden />
                  {t("readyNow")}
                </span>
                <span className="inline-flex items-center gap-1 rounded-xs bg-muted px-2 py-0.5 text-[11px] text-foreground/80">
                  <Lock className="size-3" aria-hidden />
                  {t("httpsIncluded")}
                </span>
              </div>
            </>
          ) : (
            <p className="mt-1 text-[12.5px] text-muted-foreground">{t("freeAddressPending")}</p>
          )}
        </Option>

        {DOMAINS_ENABLED ? (
          <Option on={setup.addressMode === "own"} onPick={() => setup.setAddressMode("own")}>
            <p className="text-sm font-medium text-foreground">{t("ownDomain")}</p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
              {t("ownDomainBody", { example })}
            </p>
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-500 ease-out",
                setup.addressMode === "own" ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="min-h-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {setup.addressMode === "own" ? <OwnDomain setup={setup} example={example} checking={checking} result={result} /> : null}
              </div>
            </div>
          </Option>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => setup.go("look", "forward")}
        className="text-[13px] text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground"
      >
        {t("skipAddress")}
      </button>
    </div>
  );
}

function OwnDomain({
  setup,
  example,
  checking,
  result,
}: {
  setup: SetupState;
  example: string;
  checking: boolean;
  result: SetupState["domainCheck"]["result"];
}) {
  const t = useTranslations("auth.onboarding");
  const domain = setup.domain;

  if (!domain) {
    return (
      <div className="mt-3.5 flex flex-col gap-2 sm:flex-row">
        <Input
          size="lg"
          value={setup.domainInput}
          onChange={(e) => setup.setDomainInput(e.target.value)}
          onKeyDown={(e) => {
            // Inside setup's own form: Enter connects the domain, it does not move on.
            if (e.key !== "Enter") return;
            e.preventDefault();
            void setup.connectOwnDomain();
          }}
          placeholder={example}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="url"
          aria-label={t("ownDomain")}
          className="sm:flex-1"
        />
        <Button type="button" loading={setup.busy} onClick={() => void setup.connectOwnDomain()} className="h-11 px-5">
          {t("connect")}
        </Button>
        {setup.domainError ? <FieldError>{t("domainFailed")}</FieldError> : null}
      </div>
    );
  }

  const live = domain.status === "active";
  // After a check: what it found, one line at a time. Before one: nothing ticked yet.
  const ownership = checking ? "now" : result ? (result.ownership_ok ? "done" : "fail") : "todo";
  const pointing = checking ? "todo" : result ? (result.pointing_ok ? "done" : "fail") : "todo";
  const https = live ? (domain.ssl_status === "issued" ? "done" : "now") : "todo";

  return (
    <div className="pb-rise mt-3.5 space-y-3">
      {!live ? (
        <>
          <p className="text-[12.5px] text-foreground/80">{t("recordsIntro", { domain: domain.hostname })}</p>
          <div className="overflow-hidden rounded-ui border border-border-subtle">
            <div className="grid grid-cols-[4rem_minmax(0,1fr)_auto] gap-2.5 bg-muted/60 px-3 py-1.5 text-[11px] text-muted-foreground">
              <span>{t("recordType")}</span>
              <span>{t("recordNameValue")}</span>
              <span />
            </div>
            {(domain.dns_records ?? []).map((record) => (
              <div
                key={`${record.type}-${record.name}`}
                className="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-border-subtle px-3 py-2.5 text-xs"
              >
                <span className="justify-self-start rounded-xs bg-muted px-1.5 py-0.5 text-[11px] font-semibold">
                  {record.type}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-mono text-foreground">{record.name}</span>
                  <span className="block truncate font-mono text-[11px] text-muted-foreground">{record.value}</span>
                </span>
                <CopyButton value={record.value} />
              </div>
            ))}
          </div>
          <p className="flex gap-2 rounded-ui border border-[hsl(var(--accent-yellow)/0.5)] bg-[hsl(var(--accent-yellow)/0.1)] px-3 py-2 text-xs leading-relaxed text-foreground/85">
            <Cloud className="mt-px size-3.5 shrink-0" aria-hidden />
            {t("cloudflareTip")}
          </p>
        </>
      ) : null}

      {checking || result || live ? (
        <ul className="space-y-1.5">
          {!live ? (
            <>
              <li className="flex items-center gap-2.5 text-[13px]">
                <TickMark state={ownership} />
                {t("checkOwnership")}
              </li>
              <li className="flex items-center gap-2.5 text-[13px]">
                <TickMark state={pointing} />
                {t("checkPointing")}
              </li>
            </>
          ) : null}
          {live ? (
            <li className="flex items-center gap-2.5 text-[13px]">
              <TickMark state={https} />
              {https === "done" ? t("checkHttps") : t("httpsOnItsWay")}
            </li>
          ) : null}
        </ul>
      ) : null}

      {live ? (
        <p className="pb-rise flex items-center gap-2.5 rounded-ui border border-[hsl(var(--accent-green)/0.3)] bg-[hsl(var(--accent-green)/0.08)] px-3.5 py-3 text-[13px] text-foreground">
          <CircleCheck className="size-5 shrink-0 text-[hsl(var(--accent-green))]" aria-hidden />
          {t("domainConnected", { domain: domain.hostname })}
        </p>
      ) : result && !result.verified ? (
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">{t("domainNotYet")}</p>
      ) : null}

      {!live ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" loading={checking} onClick={() => void setup.checkOwnDomain()} className="h-10">
            <RefreshCw className="size-3.5" aria-hidden />
            {t("checkNow")}
          </Button>
          <button
            type="button"
            onClick={setup.pickAnotherDomain}
            className="text-xs text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground"
          >
            {t("useAnotherDomain")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ---- 4. Pick a look ----------------------------------------------------------------------------

export function LookStep({ setup, className }: { setup: SetupState; className?: string }) {
  const t = useTranslations("auth.onboarding");
  const kicker = useStepKicker(4);
  const locale = useLocale();
  const suggested = SUGGESTED_PALETTE[setup.kind ?? "clothing"];
  return (
    <div className={cn("space-y-7", className)}>
      <StepHeading kicker={kicker} title={t("lookTitle")} body={t("lookBody")} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label={t("lookTitle")}>
        {setup.palettes.map((palette) => {
          const on = setup.chosenPalette === palette.key;
          const tk = palette.tokens;
          return (
            <button
              key={palette.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setup.setPalette(palette.key)}
              className={cn(
                "rounded-card border p-2 text-left transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5",
                on ? "border-foreground shadow-[inset_0_0_0_1px_hsl(var(--foreground))]" : "border-border-subtle hover:border-border-hover"
              )}
            >
              <span className="block overflow-hidden rounded-xs border" style={{ background: tk.background, borderColor: tk.border }}>
                <span className="flex h-3.5 items-center border-b px-1.5" style={{ background: tk.header, borderColor: tk.border }}>
                  <i className="h-[3px] w-6 rounded-full opacity-80" style={{ background: tk.header_foreground }} />
                </span>
                <span className="m-1.5 block h-12 overflow-hidden rounded-[2px]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a fixed, pre-sized sample photo */}
                  <img src={heroPhoto(setup.kind ?? "clothing")} alt="" className="size-full object-cover" />
                </span>
                <span className="flex gap-1 px-1.5 pb-1.5">
                  <i className="h-2 flex-1 rounded-[2px]" style={{ background: tk.muted }} />
                  <i className="h-2 flex-1 rounded-[2px]" style={{ background: tk.muted }} />
                  <i className="h-2 flex-[0.8] rounded-[2px]" style={{ background: tk.primary }} />
                </span>
              </span>
              <span className="mt-2 flex items-center justify-between gap-1 px-0.5 text-[12.5px] font-medium text-foreground">
                <span className="truncate">{paletteName(palette, locale)}</span>
                <span className="flex shrink-0 items-center gap-1">
                  {palette.key === suggested ? (
                    <span className="text-[10.5px] font-normal text-muted-foreground">{t("suggested")}</span>
                  ) : null}
                  {on ? <CircleCheck className="pb-pop size-4" aria-hidden /> : null}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- 5. How can shoppers reach you? ------------------------------------------------------------

export function ContactStep({ setup, className }: { setup: SetupState; className?: string }) {
  const t = useTranslations("auth.onboarding");
  const kicker = useStepKicker(5);
  return (
    <div className={cn("space-y-6", className)}>
      <StepHeading kicker={kicker} title={t("contactTitle")} body={t("contactBody")} />
      <div>
        <label htmlFor="shop_phone" className="field-label">
          {t("phone")}
        </label>
        <div className="flex overflow-hidden rounded-xs border border-input-border bg-input-surface transition-shadow focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20">
          <span className="flex items-center gap-1.5 border-r border-input-border bg-muted/60 px-3 text-sm text-foreground/80">
            {/* eslint-disable-next-line @next/next/no-img-element -- a flag from the dashboard's own assets */}
            <img src="/assets/flags/bangladesh.png" alt="" className="h-3 w-4 rounded-[1px] object-cover" />
            +880
          </span>
          <input
            id="shop_phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            autoFocus
            value={setup.phone}
            onChange={(e) => setup.setPhone(e.target.value)}
            placeholder={t("phonePlaceholder")}
            aria-invalid={setup.contactError === "phone"}
            className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        {setup.contactError === "phone" ? <FieldError>{t("phoneInvalid")}</FieldError> : null}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={setup.whatsapp}
        onClick={() => setup.setWhatsapp(!setup.whatsapp)}
        className="flex w-full items-center gap-3 rounded-card border border-border-subtle p-3.5 text-left transition-colors hover:bg-muted/40"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#25d366]/12 text-[#1faa53]">
          <SocialMark platform="whatsapp" className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-medium text-foreground">{t("whatsappTitle")}</span>
          <span className="block text-xs text-muted-foreground">{t("whatsappBody")}</span>
        </span>
        <span
          className={cn(
            "relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-200",
            setup.whatsapp ? "bg-foreground" : "bg-border-hover"
          )}
          aria-hidden
        >
          <span
            className={cn(
              "absolute left-[3px] top-[3px] size-4 rounded-full bg-background shadow transition-transform duration-200",
              setup.whatsapp && "translate-x-4"
            )}
          />
        </span>
      </button>

      <div>
        <label htmlFor="shop_facebook" className="field-label flex justify-between">
          {t("facebook")}
          <span className="font-normal text-muted-foreground">{t("optional")}</span>
        </label>
        <div className="flex overflow-hidden rounded-xs border border-input-border bg-input-surface transition-shadow focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20">
          <span className="flex items-center gap-1.5 border-r border-input-border bg-muted/60 px-3 text-sm text-foreground/80">
            <SocialMark platform="facebook" className="size-4 text-[#1877f2]" />
            facebook.com/
          </span>
          <input
            id="shop_facebook"
            value={setup.facebook}
            onChange={(e) => setup.setFacebook(e.target.value)}
            placeholder={t("facebookPlaceholder")}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={setup.contactError === "facebook"}
            className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        {setup.contactError === "facebook" ? <FieldError>{t("facebookInvalid")}</FieldError> : null}
      </div>
    </div>
  );
}
