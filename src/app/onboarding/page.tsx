"use client";

import { Suspense } from "react";
import { useOnboarding } from "./useOnboarding";
import { StoreDetailsStep } from "./StoreDetailsStep";
import { AppSelectionStep } from "./AppSelectionStep";

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function OnboardingPageContent() {
  const {
    isAddMode,
    isReady,
    step,
    loading,
    error,
    formData,
    selectedApps,
    updateField,
    toggleApp,
    handleStep1Submit,
    handleStep2Submit,
    goBack,
  } = useOnboarding();

  if (!isReady) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {isAddMode ? "Create a new store" : "Set up your store"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {step === 1
              ? "Step 1 of 2: Store details"
              : "Step 2 of 2: Choose apps"}
          </p>
        </div>
        <div className="page-card rounded-none p-5 md:p-6">
          {step === 1 ? (
            <StoreDetailsStep
              formData={formData}
              error={error}
              onFieldChange={updateField}
              onSubmit={handleStep1Submit}
            />
          ) : (
            <AppSelectionStep
              selectedApps={selectedApps}
              loading={loading}
              error={error}
              onToggleApp={toggleApp}
              onSubmit={handleStep2Submit}
              onBack={goBack}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <OnboardingPageContent />
    </Suspense>
  );
}
