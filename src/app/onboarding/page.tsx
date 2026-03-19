"use client";

import { Suspense } from "react";
import { useOnboarding } from "./useOnboarding";
import { StoreDetailsStep } from "./StoreDetailsStep";
import { AppSelectionStep } from "./AppSelectionStep";

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted">
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted px-4 py-8">
      <div className="w-full max-w-lg border border-border bg-card p-8 shadow-xl backdrop-blur">
        <div className="mb-8 space-y-2">
          <p className="text-sm font-normal uppercase tracking-[0.25em] text-muted-foreground">
            Gadzilla Dashboard
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {isAddMode ? "Create a new store" : "Set up your store"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {step === 1
              ? "Step 1 of 2: Store details"
              : "Step 2 of 2: Choose apps"}
          </p>
        </div>

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
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <OnboardingPageContent />
    </Suspense>
  );
}
