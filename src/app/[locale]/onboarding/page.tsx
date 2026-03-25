"use client";

import { Suspense } from "react";
import { useOnboarding } from "./useOnboarding";
import { StoreDetailsStep } from "./StoreDetailsStep";
import { AppSelectionStep } from "./AppSelectionStep";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

function LoadingSpinner() {
  return (
    <AuthPageShell>
      <div className="mx-auto flex w-full max-w-sm items-center justify-center py-6 sm:py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    </AuthPageShell>
  );
}

function OnboardingPageContent() {
  const {
    isAddMode,
    isReady,
    step,
    loading,
    error,
    fieldErrors,
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
    <AuthPageShell containerClassName="max-w-xl space-y-4 sm:space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {isAddMode ? "Create a new store" : "Set up your store"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {step === 1 ? "Step 1 of 2: Store details" : "Step 2 of 2: Choose apps"}
        </p>
      </div>

      <div className="w-full">
        {step === 1 ? (
          <StoreDetailsStep
            formData={formData}
            error={error}
            fieldErrors={fieldErrors}
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
    </AuthPageShell>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <OnboardingPageContent />
    </Suspense>
  );
}
