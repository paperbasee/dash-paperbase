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
import DataExportSection from "./sections/DataExportSection";
import DeleteStoreFlow from "./DeleteStoreFlow";
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
    socialLinks,
    setSocialLink,
    previewUrl,
    currentLogoUrl,
    clearLogo,
    setClearLogo,
    logoFile,
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
    deleteConfirmPhrase,
    setDeleteConfirmPhrase,
    deleteConfirmStoreName,
    setDeleteConfirmStoreName,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    deleteModalStep,
    deleteOtpCode,
    setDeleteOtpCode,
    deletionInProgress,
    deleteConfirmMatches,
    deleteOtpValid,
    deleteExpectedStoreName,
    deleteStoreDisplayName,
    deleteStoreReady,
    deleteRequestSubmitting,
    deleteSuccessDisplayed,
    deleteStatus,
    deleteRequestError,
    deletionSteps,
    handleSendDeleteOtp,
    handleConfirmDeleteOtp,
    backToDeletePhraseStep,
    resetDeleteFlow,
    removeStore,
    removeStoreSubmitting,
    removeStoreError,
    clearRemoveStoreError,
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
        {/* Mobile: in-place expandable section picker */}
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

        {/* Desktop: horizontal nav at top */}
        <div className="hidden min-w-0 md:block" aria-label={tSettings("navAria")}>
          <SettingsDesktopSectionNav
            activeSection={activeSection}
            onSelect={setActiveSection}
          />
        </div>

        {/* Content area */}
        <main className="min-w-0 w-full flex-1">
          {/* Account section */}
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

          {/* Store Info section */}
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
          />

          {/* Dynamic Fields section */}
          <DynamicFieldsSection
            hidden={activeSection !== "eav"}
            message={dynamicFieldsMessage}
            onMessage={setDynamicFieldsMessage}
          />

          {/* Apps section */}
          <AppsSection hidden={activeSection !== "apps"} enabledApps={enabledApps} />

          {/* Integrations section */}
          <IntegrationsSection
            hidden={activeSection !== "integrations"}
          />

          {/* Networking section */}
          <NetworkingSection hidden={activeSection !== "networking"} />

          {/* Notifications section */}
          <NotificationsSection
            hidden={activeSection !== "notifications"}
            notificationPrefs={notificationPrefs}
            onUpdatePref={updateNotificationPref}
            orderEmailNotificationsEnabled={orderEmailNotificationsEnabled}
            orderEmailFeatureLoading={orderEmailFeatureLoading}
            emailPrefsSaving={emailPrefsSaving}
          />

          {/* Security section */}
          <SecuritySection hidden={activeSection !== "security"} />

          {/* Billing section */}
          <BillingSection hidden={activeSection !== "billing"} />

          {/* Data & Export section */}
          <DataExportSection
            hidden={activeSection !== "data"}
            deleteStoreDisabled={
              isLoading || !deleteStoreReady || deletionInProgress || deleteRequestSubmitting
            }
            onOpenDeleteConfirm={setDeleteConfirmOpen}
            storeDisplayName={deleteStoreDisplayName}
            expectedStoreNameForRemove={deleteExpectedStoreName}
            storeSubtitle={storeType.trim() ? storeType : tSettings("currentStoreFallback")}
            logoSrc={previewUrl}
            contactEmail={contactEmail}
            onRemoveStore={removeStore}
            removeStoreError={removeStoreError}
            clearRemoveStoreError={clearRemoveStoreError}
            removeStoreDisabled={
              isLoading ||
              !contactEmail.trim() ||
              removeStoreSubmitting ||
              deletionInProgress ||
              deleteRequestSubmitting
            }
            removeStoreSubmitting={removeStoreSubmitting}
          />
        </main>
        </div>
      </div>

      <DeleteStoreFlow
        deleteConfirmOpen={deleteConfirmOpen}
        onDeleteConfirmOpenChange={setDeleteConfirmOpen}
        deleteModalStep={deleteModalStep}
        deleteConfirmStoreName={deleteConfirmStoreName}
        onDeleteConfirmStoreNameChange={setDeleteConfirmStoreName}
        deleteConfirmPhrase={deleteConfirmPhrase}
        onDeleteConfirmPhraseChange={setDeleteConfirmPhrase}
        otpCode={deleteOtpCode}
        onOtpCodeChange={setDeleteOtpCode}
        handleSendDeleteOtp={handleSendDeleteOtp}
        handleConfirmDeleteOtp={handleConfirmDeleteOtp}
        onBackToPhraseStep={backToDeletePhraseStep}
        deleteConfirmMatches={deleteConfirmMatches}
        otpValid={deleteOtpValid}
        deletionInProgress={deletionInProgress}
        deleteRequestSubmitting={deleteRequestSubmitting}
        deleteSuccessDisplayed={deleteSuccessDisplayed}
        deleteStatus={deleteStatus}
        deletionSteps={deletionSteps}
        deleteRequestError={deleteRequestError}
        expectedStoreName={deleteExpectedStoreName}
        storeDisplayName={deleteStoreDisplayName}
        onCloseDeletion={resetDeleteFlow}
      />
    </div>
  );
}
