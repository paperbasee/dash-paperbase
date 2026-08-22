"use client";

import { useEffect, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import type React from "react";
import { useLocale, useTranslations } from "next-intl";
import { ClipboardTextIcon } from "@phosphor-icons/react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { useEnterNavigation } from "@/hooks/useEnterNavigation";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { usePermissions } from "@/context/PermissionsContext";
import {
  SettingsSectionBody,
  settingsInvertedButtonClassName,
  settingsSectionSurfaceClassName,
} from "../SettingsSectionBody";
import SocialLinkGlyph from "./SocialLinkGlyph";
import {
  STORE_SOCIAL_LINK_KEYS,
  type StoreSocialLinkKey,
} from "@/lib/storeSocialLinks";

type SettingsMessage = { type: "success" | "error"; text: string } | null;

function generateRevalidateSecret(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < 32; i++) {
    out += alphabet[bytes[i]! % alphabet.length]!;
  }
  return out;
}

export default function StoreInfoSection({
  hidden,
  previewUrl,
  currentLogoUrl,
  clearLogo,
  fileInputRef,
  onLogoFileChange,
  onClearLogoChange,
  storeName,
  storeType,
  contactEmail,
  phone,
  address,
  socialLinks,
  onSocialLinkChange,
  onStoreNameChange,
  onStoreTypeChange,
  onContactEmailChange,
  onPhoneChange,
  onAddressChange,
  storeSaving,
  storeMessage,
  onSubmit,
  storefrontUrl,
  onStorefrontUrlChange,
  revalidateSecret,
  onRevalidateSecretChange,
}: {
  hidden: boolean;
  previewUrl: string | null;
  currentLogoUrl: string | null;
  clearLogo: boolean;
  fileInputRef: React.Ref<HTMLInputElement>;
  onLogoFileChange: Dispatch<SetStateAction<File | null>> | ((value: File | null) => void);
  onClearLogoChange: Dispatch<SetStateAction<boolean>> | ((value: boolean) => void);
  storeName: string;
  storeType: string;
  contactEmail: string;
  phone: string;
  address: string;
  socialLinks: Record<StoreSocialLinkKey, string>;
  onSocialLinkChange: (key: StoreSocialLinkKey, value: string) => void;
  onStoreNameChange: Dispatch<SetStateAction<string>>;
  onStoreTypeChange: Dispatch<SetStateAction<string>>;
  onContactEmailChange: Dispatch<SetStateAction<string>>;
  onPhoneChange: Dispatch<SetStateAction<string>>;
  onAddressChange: Dispatch<SetStateAction<string>>;
  storeSaving: boolean;
  storeMessage: SettingsMessage;
  onSubmit: (e: FormEvent) => void;
  storefrontUrl: string;
  onStorefrontUrlChange: Dispatch<SetStateAction<string>>;
  revalidateSecret: string;
  onRevalidateSecretChange: Dispatch<SetStateAction<string>>;
}) {
  const t = useTranslations("settings");
  const locale = useLocale();
  const confirm = useConfirm();
  // Store profile persists via settings.manage; view-only roles see it read-only.
  const { has } = usePermissions();
  const canManage = has("settings.manage");
  const [secretRevealed, setSecretRevealed] = useState(false);
  const [secretFieldFocused, setSecretFieldFocused] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const secretInputRef = useRef<HTMLInputElement>(null);
  const hasRevalidateSecret = revalidateSecret.trim().length > 0;
  const showPlainSecretInput =
    !hasRevalidateSecret || secretRevealed || secretFieldFocused;

  useEffect(() => {
    if (!hasRevalidateSecret) setSecretRevealed(false);
  }, [hasRevalidateSecret]);

  useEffect(() => {
    if (!secretRevealed) setSecretCopied(false);
  }, [secretRevealed]);

  useEffect(() => {
    if (!secretCopied) return;
    const timer = window.setTimeout(() => setSecretCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [secretCopied]);

  async function copyRevalidateSecret() {
    const text = revalidateSecret.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setSecretCopied(true);
    } catch {
      /* ignore */
    }
  }

  async function handleSecretGenerateClick() {
    if (hasRevalidateSecret) {
      const ok = await confirm({
        title: t("store.revalidateSecretRegenerateDialogTitle"),
        message: t("store.revalidateSecretRegenerateDialogBody"),
        confirmText: t("store.revalidateSecretRegenerate"),
        variant: "warning",
      });
      if (!ok) return;
    } else {
      const ok = await confirm({
        title: t("store.revalidateSecretGenerateDialogTitle"),
        message: t("store.revalidateSecretGenerateDialogBody"),
        confirmText: t("store.revalidateSecretGenerate"),
        variant: "default",
      });
      if (!ok) return;
    }
    onRevalidateSecretChange(generateRevalidateSecret());
    setSecretRevealed(true);
  }
  const formRef = useRef<HTMLFormElement>(null);
  const { handleKeyDown } = useEnterNavigation(() => formRef.current?.requestSubmit());
  return (
    <section
      id="panel-store"
      role="tabpanel"
      aria-labelledby="tab-store"
      hidden={hidden}
      className={settingsSectionSurfaceClassName}
    >
      <SettingsSectionBody>
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-foreground">{t("store.heading")}</h2>
          <p className="text-sm text-muted-foreground">{t("store.subtitle")}</p>
        </div>

        <form ref={formRef} onSubmit={onSubmit} className="w-full">
          <fieldset
            disabled={!canManage}
            className="m-0 w-full min-w-0 space-y-6 border-0 p-0"
          >
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t("store.logo")}
          </label>

          <div className="flex flex-wrap items-center gap-4">
            {previewUrl && !clearLogo ? (
              <div className="relative size-20 overflow-hidden rounded-full border border-border bg-muted">
                <img src={previewUrl} alt={t("store.logoPreviewAlt")} className="size-full object-cover" />
              </div>
            ) : (
              <div className="flex size-20 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
                {t("store.noLogo")}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="form-file-input text-sm"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  onLogoFileChange(f || null);
                  if (f) onClearLogoChange(false);
                }}
                onKeyDown={handleKeyDown}
              />

              {currentLogoUrl && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={clearLogo}
                    onChange={(e) => {
                      onClearLogoChange(e.target.checked);
                      if (e.target.checked) onLogoFileChange(null);
                    }}
                    onKeyDown={handleKeyDown}
                  />
                  {t("store.removeLogo")}
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="store_name" className="text-sm font-medium leading-normal text-foreground">
              {t("store.storeName")}
            </label>
            <Input
              id="store_name"
              value={storeName}
              onChange={(e) => onStoreNameChange(e.target.value)}
              placeholder={t("store.storeNamePlaceholder")}
              className="w-full"
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="store_type" className="text-sm font-medium leading-normal text-foreground">
              {t("store.storeType")}
            </label>
            <Input
              id="store_type"
              value={storeType}
              onChange={(e) => onStoreTypeChange(e.target.value)}
              placeholder={t("store.storeTypePlaceholder")}
              className="w-full"
              maxLength={60}
              onKeyDown={handleKeyDown}
            />
            <p className="text-xs text-muted-foreground">{t("store.storeTypeHint")}</p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="store_contact_email" className="text-sm font-medium leading-normal text-foreground">
              {t("store.contactEmail")}
            </label>
            <Input
              id="store_contact_email"
              type="email"
              value={contactEmail}
              onChange={(e) => onContactEmailChange(e.target.value)}
              placeholder={t("store.contactEmailPlaceholder")}
              className="w-full"
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="store_phone" className="text-sm font-medium leading-normal text-foreground">
              {t("store.phone")}
            </label>
            <Input
              id="store_phone"
              type="tel"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder={t("store.phonePlaceholder")}
              className="w-full"
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="flex flex-col gap-2 md:col-span-2">
            <label htmlFor="store_address" className="text-sm font-medium leading-normal text-foreground">
              {t("store.address")}
            </label>
            <Input
              id="store_address"
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
              placeholder={t("store.addressPlaceholder")}
              className="w-full"
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>

        <div className="rounded-card border border-border/80 bg-muted/20 p-3 sm:p-4">
          <div className="mb-3 space-y-1">
            <h3 className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
              {t("store.storefrontIntegrationHeading")}
            </h3>
            <p className="text-xs leading-snug text-muted-foreground sm:text-sm sm:leading-relaxed">
              {t("store.storefrontIntegrationSubtitle")}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2 md:col-span-2">
              <label
                htmlFor="storefront_url"
                className="text-sm font-medium leading-normal text-foreground"
              >
                {t("store.storefrontUrlLabel")}
              </label>
              <Input
                id="storefront_url"
                type="text"
                autoComplete="off"
                value={storefrontUrl}
                onChange={(e) => onStorefrontUrlChange(e.target.value)}
                placeholder={t("store.storefrontUrlPlaceholder")}
                className="w-full"
                onKeyDown={handleKeyDown}
              />
              <p className="text-xs text-muted-foreground">{t("store.storefrontUrlHelp")}</p>
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <div
                id="store_revalidate_secret_label"
                className="text-sm font-medium leading-normal text-foreground"
              >
                {t("store.revalidateSecretLabel")}
              </div>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
                <div className="flex min-w-0 flex-1 items-stretch gap-2">
                  {hasRevalidateSecret && !showPlainSecretInput ? (
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          id="revalidate_secret"
                          aria-labelledby="store_revalidate_secret_label"
                          onClick={() => {
                            setSecretRevealed(true);
                            queueMicrotask(() => secretInputRef.current?.focus());
                          }}
                          className={cn(
                            "flex h-9 min-w-0 w-full cursor-pointer items-center rounded-ui border border-border bg-background px-3 py-1 text-left font-mono text-sm text-foreground shadow-xs",
                            "transition-[color,box-shadow] outline-none hover:bg-muted/40",
                            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          )}
                        >
                          <span className="truncate tracking-[0.2em] text-muted-foreground" aria-hidden>
                            {"•".repeat(Math.min(revalidateSecret.length, 48))}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={8} variant="light">
                        <p
                          lang={locale === "bn" ? "bn" : "en"}
                          className="leading-relaxed text-balance"
                        >
                          {t("store.revalidateSecretClickToReveal")}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Input
                      ref={secretInputRef}
                      id="revalidate_secret"
                      aria-labelledby="store_revalidate_secret_label"
                      name="storefront_revalidate_secret"
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      autoCapitalize="off"
                      autoCorrect="off"
                      data-1p-ignore
                      data-lpignore="true"
                      data-bwignore
                      value={revalidateSecret}
                      onChange={(e) => onRevalidateSecretChange(e.target.value)}
                      onFocus={() => setSecretFieldFocused(true)}
                      onBlur={() => {
                        setSecretFieldFocused(false);
                        if (revalidateSecret.trim().length > 0) {
                          setSecretRevealed(false);
                        }
                      }}
                      className="min-w-0 flex-1 font-mono text-sm"
                      maxLength={64}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        hasRevalidateSecret ? undefined : t("store.revalidateSecretPlaceholder")
                      }
                    />
                  )}
                  {hasRevalidateSecret && showPlainSecretInput && (
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={
                            secretCopied
                              ? t("store.revalidateSecretCopiedShort")
                              : t("store.revalidateSecretClickToCopy")
                          }
                          className="size-9 shrink-0"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => void copyRevalidateSecret()}
                        >
                          {secretCopied ? (
                            <Check className="size-4 text-emerald-600" aria-hidden />
                          ) : (
                            <ClipboardTextIcon className="size-4" aria-hidden />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={8} variant="light">
                        <p
                          lang={locale === "bn" ? "bn" : "en"}
                          className="leading-relaxed text-balance"
                        >
                          {secretCopied
                            ? t("store.revalidateSecretCopiedShort")
                            : t("store.revalidateSecretClickToCopy")}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`${settingsInvertedButtonClassName} shrink-0 sm:self-stretch`}
                  onClick={() => void handleSecretGenerateClick()}
                >
                  {hasRevalidateSecret
                    ? t("store.revalidateSecretRegenerate")
                    : t("store.revalidateSecretGenerate")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t("store.revalidateSecretHelp")}</p>
            </div>
          </div>
        </div>

        <div className="rounded-card border border-border/80 bg-muted/20 p-3 sm:p-4">
          <div className="mb-3 space-y-1">
            <h3 className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
              {t("store.socialHeading")}
            </h3>
            <p className="text-xs leading-snug text-muted-foreground sm:text-sm sm:leading-relaxed">
              {t("store.socialSubtitle")}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {STORE_SOCIAL_LINK_KEYS.map((key) => {
              const label = t(`store.socialLabels.${key}` as never);
              return (
                <InputGroup key={key} className="h-9 min-w-0 bg-background shadow-sm">
                  <InputGroupAddon
                    align="inline-start"
                    className="w-[7.25rem] shrink-0 justify-start gap-2 border-r border-border/80 py-0 pl-2.5 pr-2"
                    title={label}
                  >
                    <span className="text-muted-foreground">
                      <SocialLinkGlyph platform={key} />
                    </span>
                    <span className="min-w-0 truncate text-xs font-medium text-foreground">
                      {label}
                    </span>
                  </InputGroupAddon>
                  <InputGroupInput
                    id={`social_${key}`}
                    type={key === "whatsapp" ? "text" : "url"}
                    inputMode={key === "whatsapp" ? "tel" : "url"}
                    autoComplete="off"
                    value={socialLinks[key]}
                    onChange={(e) => onSocialLinkChange(key, e.target.value)}
                    placeholder={key === "whatsapp" ? "Enter WhatsApp number or URL" : `Enter ${key} URL`}
                    aria-label={label}
                    className="min-w-0 text-xs sm:text-sm"
                    onKeyDown={handleKeyDown}
                  />
                </InputGroup>
              );
            })}
          </div>
        </div>

        {storeMessage?.type === "error" && (
          <p className="text-sm text-destructive" role="alert">
            {storeMessage.text}
          </p>
        )}

        <Button
          type="submit"
          variant="outline"
          className={`${settingsInvertedButtonClassName} gap-2`}
          disabled={storeSaving}
        >
          {storeSaving && <Loader2 className="size-4 animate-spin" />}
          {t("store.saveButton")}
        </Button>
          </fieldset>
        </form>
      </SettingsSectionBody>
    </section>
  );
}

