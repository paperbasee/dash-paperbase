"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Undo2, ChevronDown } from "lucide-react";
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
import { SettingsDesktopSectionNav, SettingsSectionNav } from "./SettingsNav";
import { SECTIONS, type SettingsSection } from "./settingsSections";
import { settingsInvertedButtonClassName } from "./SettingsSectionBody";
import useSettingsPageController from "./useSettingsPageController";

export default function SettingsPage() {
  const router = useRouter();
  const tSettings = useTranslations("settings");
  const [activeSection, setActiveSection] = useState<SettingsSection>("store");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
    setLanguage,
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
  } = controller;

  const activeSectionMeta = SECTIONS.find((s) => s.id === activeSection);
  const activeLabel = activeSectionMeta
    ? tSettings(activeSectionMeta.labelKey)
    : tSettings("title");
  const ActiveIcon = activeSectionMeta?.icon;

  return (
    <div className="w-full">
      <div className="flex w-full flex-col gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="hidden rounded-card bg-muted/80 px-1 py-1 md:block">
              <button
                type="button"
                onClick={() => router.back()}
                aria-label={tSettings("goBackAria")}
                className="flex items-center justify-center rounded-ui p-1 text-muted-foreground hover:bg-muted"
              >
                <Undo2 className="h-4 w-4" />
              </button>
            </div>
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

        <p className="hidden text-sm text-muted-foreground md:block">
          {tSettings("subtitle")}
        </p>

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
              <div className="mt-2 rounded-card border border-dashed border-border bg-muted/30 p-3">
                <SettingsSectionNav
                  activeSection={activeSection}
                  onSelect={(id) => {
                    setActiveSection(id);
                    setMobileNavOpen(false);
                  }}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="hidden min-w-0 md:block" aria-label={tSettings("navAria")}>
          <SettingsDesktopSectionNav
            activeSection={activeSection}
            onSelect={setActiveSection}
          />
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
            language={language}
            onStoreNameChange={setStoreName}
            onStoreTypeChange={setStoreType}
            onContactEmailChange={setContactEmail}
            onPhoneChange={setPhone}
            onAddressChange={setAddress}
            onLanguageChange={setLanguage}
            socialLinks={socialLinks}
            onSocialLinkChange={setSocialLink}
            storeSaving={storeSaving}
            storeMessage={storeMessage}
            onSubmit={handleStoreSubmit}
          />

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
