"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
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
import useSettingsPageController from "./useSettingsPageController";

export default function SettingsPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SettingsSection>("store");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [tabStripWidth, setTabStripWidth] = useState<number | null>(null);
  const [isLg, setIsLg] = useState(false);
  const desktopTabNavRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsLg(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useLayoutEffect(() => {
    if (!isLg) return;
    const el = desktopTabNavRef.current;
    if (!el) return;
    const measure = () => setTabStripWidth(el.scrollWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isLg, activeSection]);

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
    deletionInProgress,
    deleteConfirmMatches,
    deleteExpectedStoreName,
    deleteStoreDisplayName,
    deleteStoreReady,
    deleteRequestSubmitting,
    deleteSuccessDisplayed,
    deleteStatus,
    deleteRequestError,
    deletionSteps,
    handleDeleteConfirmed,
    resetDeleteFlow,
  } = controller;

  const activeSectionMeta = SECTIONS.find((s) => s.id === activeSection);
  const activeLabel = activeSectionMeta?.label ?? "Settings";
  const ActiveIcon = activeSectionMeta?.icon;

  const settingsShellStyle: CSSProperties | undefined =
    isLg && tabStripWidth != null ? { width: `min(${tabStripWidth}px, 100%)` } : undefined;

  return (
    <div className="flex flex-col gap-6">
      {/* Header + tabs + content share one column on lg so back button and title align with the tab strip and cards */}
      <div
        className="flex flex-col gap-6 lg:mx-auto lg:max-w-full lg:min-w-0"
        style={settingsShellStyle}
      >
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted/80 px-1 py-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Go back"
                onClick={() => router.back()}
                className="shrink-0"
              >
                <Undo2 className="size-4" />
              </Button>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Your control center for store owners. Manage your store identity, products, orders,
                integrations, and more.
              </p>
            </div>
          </div>
        </header>

        <div className="flex min-w-0 flex-col gap-6">
        {/* Mobile: in-place expandable section picker */}
        <div className="lg:hidden">
          <Collapsible open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between gap-2">
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
              <div className="mt-2 rounded-xl border border-dashed border-border bg-muted/30 p-3">
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
        <div className="hidden lg:block" aria-label="Settings navigation">
          <SettingsDesktopSectionNav
            ref={desktopTabNavRef}
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
            storeSubtitle={storeType.trim() ? storeType : "Current store"}
            logoSrc={previewUrl}
          />
        </main>
        </div>
      </div>

      <DeleteStoreFlow
        deleteConfirmOpen={deleteConfirmOpen}
        onDeleteConfirmOpenChange={setDeleteConfirmOpen}
        deleteConfirmStoreName={deleteConfirmStoreName}
        onDeleteConfirmStoreNameChange={setDeleteConfirmStoreName}
        deleteConfirmPhrase={deleteConfirmPhrase}
        onDeleteConfirmPhraseChange={setDeleteConfirmPhrase}
        handleDeleteConfirmed={handleDeleteConfirmed}
        deleteConfirmMatches={deleteConfirmMatches}
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
