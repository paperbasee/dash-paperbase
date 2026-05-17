"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import AccountSection from "./sections/AccountSection";
import StoreInfoSection from "./sections/StoreInfoSection";
import DynamicFieldsSection from "./sections/DynamicFieldsSection";
import AppsSection from "./sections/AppsSection";
import IntegrationsSection from "./sections/IntegrationsSection";
import NetworkingSection from "./sections/NetworkingSection";
import NotificationsSection from "./sections/NotificationsSection";
import SecuritySection from "./sections/SecuritySection";
import BillingSection from "./sections/BillingSection";
import CustomizationSection from "./sections/CustomizationSection";
import CheckoutSettingsSection from "./sections/CheckoutSettingsSection";
import { SettingsSectionNav } from "./SettingsNav";
import { SECTIONS, type SettingsSection } from "./settingsSections";
import { settingsInvertedButtonClassName } from "./SettingsSectionBody";
import useSettingsPageController from "./useSettingsPageController";
import { useDeferredNavigate } from "@/hooks/useDeferredNavigate";

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const navigate = useDeferredNavigate();
  const tSettings = useTranslations("settings");
  const [activeSection, setActiveSection] = useState<SettingsSection>("store");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const validSectionIds = useMemo(() => new Set(SECTIONS.map((s) => s.id)), []);

  useEffect(() => {
    const raw = (searchParams.get("tab") || "").trim();
    if (!raw) return;
    if (!validSectionIds.has(raw as SettingsSection)) return;
    const next = raw as SettingsSection;
    setActiveSection((prev) => (prev === next ? prev : next));
  }, [searchParams, validSectionIds]);

  function setSection(next: SettingsSection) {
    const current = (searchParams.get("tab") || "").trim();
    if (current === next) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    const qs = params.toString();
    const href = qs ? `/settings?${qs}` : "/settings";
    void navigate(href);
  }

  const controller = useSettingsPageController();
  const {
    isLoading,
    enabledApps,
    ownerName,
    setOwnerName,
    ownerEmail,
    storeName,
    setStoreName,
    storeType,
    setStoreType,
    contactEmail,
    setContactEmail,
    phone,
    setPhone,
    address,
    setAddress,
    language,
    socialLinks,
    setSocialLink,
    previewUrl,
    currentLogoUrl,
    clearLogo,
    setClearLogo,
    setLogoFile,
    fileInputRef,
    accountSaving,
    accountMessage,
    storeSaving,
    storeMessage,
    dynamicFieldsMessage,
    setDynamicFieldsMessage,
    notificationPrefs,
    updateNotificationPref,
    orderEmailNotificationsEnabled,
    orderEmailFeatureLoading,
    emailPrefsSaving,
    handleAccountSubmit,
    handleStoreSubmit,
    languageSaving,
    languageMessage,
    persistLanguage,
    storefrontUrl,
    setStorefrontUrl,
    revalidateSecret,
    setRevalidateSecret,
  } = controller;

  const activeSectionMeta = SECTIONS.find((s) => s.id === activeSection);
  const activeLabel = activeSectionMeta
    ? "labelKey" in activeSectionMeta
      ? tSettings(activeSectionMeta.labelKey)
      : activeSectionMeta.displayLabel
    : tSettings("title");
  const ActiveIcon = activeSectionMeta?.icon;

  return (
    <div className="w-full">
      <div className="flex w-full flex-col gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:hidden">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {tSettings("title")}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground md:hidden">
                {tSettings("subtitle")}
              </p>
            </div>
          </div>
        </header>

        <div className="flex min-w-0 flex-col gap-6">
        <div className="md:hidden">
          <Collapsible open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-between gap-2", settingsInvertedButtonClassName)}
              >
                <span className="flex items-center gap-2">
                  {ActiveIcon && <ActiveIcon className="size-4" />}
                  {activeLabel}
                </span>
                <ChevronDown
                  className={cn("size-4 shrink-0 transition-transform", mobileNavOpen && "rotate-180")}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 rounded-card border border-border bg-muted/30 p-3">
                <SettingsSectionNav
                  activeSection={activeSection}
                  onSelect={(id) => {
                    setSection(id);
                    setMobileNavOpen(false);
                  }}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <main className="min-w-0 w-full flex-1">
          <AccountSection
            hidden={activeSection !== "account"}
            isLoading={isLoading}
            ownerName={ownerName}
            ownerEmail={ownerEmail}
            onOwnerNameChange={setOwnerName}
            accountSaving={accountSaving}
            accountMessage={accountMessage}
            onSubmit={handleAccountSubmit}
          />

          <StoreInfoSection
            hidden={activeSection !== "store"}
            previewUrl={previewUrl}
            currentLogoUrl={currentLogoUrl}
            clearLogo={clearLogo}
            fileInputRef={fileInputRef}
            onLogoFileChange={setLogoFile}
            onClearLogoChange={setClearLogo}
            storeName={storeName}
            storeType={storeType}
            contactEmail={contactEmail}
            phone={phone}
            address={address}
            onStoreNameChange={setStoreName}
            onStoreTypeChange={setStoreType}
            onContactEmailChange={setContactEmail}
            onPhoneChange={setPhone}
            onAddressChange={setAddress}
            socialLinks={socialLinks}
            onSocialLinkChange={setSocialLink}
            storeSaving={storeSaving}
            storeMessage={storeMessage}
            onSubmit={handleStoreSubmit}
            storefrontUrl={storefrontUrl}
            onStorefrontUrlChange={setStorefrontUrl}
            revalidateSecret={revalidateSecret}
            onRevalidateSecretChange={setRevalidateSecret}
          />

          <CustomizationSection
            hidden={activeSection !== "customization"}
            language={language}
            onLanguageChange={persistLanguage}
            languageSaving={languageSaving}
            languageMessage={languageMessage}
          />

          <CheckoutSettingsSection hidden={activeSection !== "checkout"} />

          <DynamicFieldsSection
            hidden={activeSection !== "eav"}
            message={dynamicFieldsMessage}
            onMessage={setDynamicFieldsMessage}
          />

          <AppsSection hidden={activeSection !== "apps"} enabledApps={enabledApps} />

          <IntegrationsSection
            hidden={activeSection !== "integrations"}
          />

          <NetworkingSection hidden={activeSection !== "networking"} />

          <NotificationsSection
            hidden={activeSection !== "notifications"}
            notificationPrefs={notificationPrefs}
            onUpdatePref={updateNotificationPref}
            orderEmailNotificationsEnabled={orderEmailNotificationsEnabled}
            orderEmailFeatureLoading={orderEmailFeatureLoading}
            emailPrefsSaving={emailPrefsSaving}
          />

          <SecuritySection hidden={activeSection !== "security"} />

          <BillingSection hidden={activeSection !== "billing"} />
        </main>
        </div>
      </div>
    </div>
  );
}
