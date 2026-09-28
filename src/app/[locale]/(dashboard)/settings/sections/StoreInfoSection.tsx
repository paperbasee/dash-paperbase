"use client";

import { useRef, type Dispatch, type FormEvent, type SetStateAction } from "react";
import type React from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useEnterNavigation } from "@/hooks/useEnterNavigation";
import { usePermissions } from "@/context/PermissionsContext";
import type { SocialAccount } from "@/lib/storeSocialLinks";
import { IdentityAccounts, type AccountProblem } from "./IdentityAccounts";
import {
  SettingsSectionBody,
  settingsInvertedButtonClassName,
  settingsSectionSurfaceClassName,
} from "../SettingsSectionBody";

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
  language,
  onStoreNameChange,
  onStoreTypeChange,
  onContactEmailChange,
  onPhoneChange,
  onAddressChange,
  onLanguageChange,
  accounts,
  onAccountsChange,
  accountProblem,
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
  language: "en" | "bn";
  onStoreNameChange: Dispatch<SetStateAction<string>>;
  onStoreTypeChange: Dispatch<SetStateAction<string>>;
  onContactEmailChange: Dispatch<SetStateAction<string>>;
  onPhoneChange: Dispatch<SetStateAction<string>>;
  onAddressChange: Dispatch<SetStateAction<string>>;
  onLanguageChange: Dispatch<SetStateAction<"en" | "bn">>;
  /** Identity's social accounts (the one place they are typed), in the merchant's order. */
  accounts: SocialAccount[];
  onAccountsChange: (next: SocialAccount[]) => void;
  accountProblem: AccountProblem | null;
  storeSaving: boolean;
  storeMessage: SettingsMessage;
  onSubmit: (e: FormEvent) => void;
}) {
  const t = useTranslations("settings");
  // Store profile persists via settings.manage; view-only roles see it read-only.
  const { has } = usePermissions();
  const canManage = has("settings.manage");
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
            <label htmlFor="store_language" className="text-sm font-medium leading-normal text-foreground">
              {t("store.language")}
            </label>
            <Select
              id="store_language"
              value={language}
              onChange={(e) => onLanguageChange(e.target.value as "en" | "bn")}
            >
              <option value="en">{t("store.languageOptions.en")}</option>
              <option value="bn">{t("store.languageOptions.bn")}</option>
            </Select>
          </div>
        </div>

        {/*
          Identity (owner, 2026-09-29): how customers reach the shop, and the ONE place any of it
          is typed. The shop's footer, its Contact page and the home page's Sign-up button read it;
          the theme editor only chooses how they show it.
        */}
        <div className="space-y-4 border-t border-border pt-6">
          <div className="space-y-1">
            <h3 className="text-base font-medium text-foreground">{t("identity.title")}</h3>
            <p className="text-sm text-muted-foreground">{t("identity.subtitle")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <IdentityAccounts accounts={accounts} onChange={onAccountsChange} problem={accountProblem} />
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

