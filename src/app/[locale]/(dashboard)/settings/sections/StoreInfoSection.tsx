"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import type React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
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
}) {
  const t = useTranslations("settings");
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

        <form onSubmit={onSubmit} className="w-full space-y-6">
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
              <div className="flex size-20 items-center justify-center rounded-full border border-dashed border-border bg-muted text-muted-foreground">
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
            />
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
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    value={socialLinks[key]}
                    onChange={(e) => onSocialLinkChange(key, e.target.value)}
                    placeholder={`Enter ${key} URL`}
                    aria-label={label}
                    className="min-w-0 text-xs sm:text-sm"
                  />
                </InputGroup>
              );
            })}
          </div>
        </div>

        {storeMessage && (
          <p
            className={storeMessage.type === "success" ? "text-sm text-green-600" : "text-sm text-destructive"}
          >
            {storeMessage.text}
          </p>
        )}

        <Button
          type="submit"
          variant="outline"
          className={settingsInvertedButtonClassName}
          disabled={storeSaving}
        >
          {storeSaving ? t("saving") : t("store.saveButton")}
        </Button>
        </form>
      </SettingsSectionBody>
    </section>
  );
}

