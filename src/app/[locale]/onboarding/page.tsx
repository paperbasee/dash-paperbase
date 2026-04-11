"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { useOnboarding, type OnboardingStep } from "./useOnboarding";
import { StoreDetailsStep } from "./StoreDetailsStep";
import { AppSelectionStep } from "./AppSelectionStep";
import { IntroStep } from "./IntroStep";
import { IdentityStep } from "./IdentityStep";
import { AccountStep } from "./AccountStep";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

export function OnboardingLoadingSpinner() {
  return (
    <AuthPageShell appName="">
      <div className="mx-auto flex w-full max-w-sm items-center justify-center py-6 sm:py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    </AuthPageShell>
  );
}

export function OnboardingPageContent({
  initialStep,
}: {
  initialStep?: OnboardingStep;
}) {
  const t = useTranslations("auth.onboarding");
  const {
    isAddMode,
    isReady,
    step,
    loading,
    stepLoading,
    error,
    fieldErrors,
    formData,
    selectedApps,
    updateField,
    toggleApp,
    nextStep,
    prevStep,
    submitFinalStep,
  } = useOnboarding({ initialStep });

  if (!isReady) return <OnboardingLoadingSpinner />;

  const showProgress = step > 1;
  const progress = ((step - 1) / 4) * 100;

  return (
    <AuthPageShell
      appName={step === 1 ? "" : "Paperbase"}
      headline={step === 1 ? undefined : isAddMode ? t("titleNewStore") : t("titleSetup")}
      description={step === 1 ? undefined : t("headlineDescription")}
      containerClassName="max-w-xl space-y-4 sm:space-y-5"
    >
      {showProgress ? (
        <div className="space-y-2">
          <p className="text-center text-sm text-muted-foreground">
            {t("stepProgress", { current: step, total: 5 })}
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}

      <div key={step} className="w-full animate-[onboardingStepIn_.24s_ease-out]">
        {step === 1 ? (
          <IntroStep loading={stepLoading} onStart={nextStep} />
        ) : null}

        {step === 2 ? (
          <IdentityStep
            formData={formData}
            error={error}
            fieldErrors={fieldErrors}
            onFieldChange={updateField}
            loading={stepLoading}
            onNext={nextStep}
            onBack={prevStep}
          />
        ) : null}

        {step === 3 ? (
          <StoreDetailsStep
            formData={formData}
            error={error}
            fieldErrors={fieldErrors}
            onFieldChange={updateField}
            loading={stepLoading}
            onNext={nextStep}
            onBack={prevStep}
          />
        ) : null}

        {step === 4 ? (
          <AccountStep
            formData={formData}
            error={error}
            fieldErrors={fieldErrors}
            loading={stepLoading}
            onFieldChange={updateField}
            onNext={nextStep}
            onBack={prevStep}
          />
        ) : null}

        {step === 5 ? (
          <AppSelectionStep
            formData={formData}
            selectedApps={selectedApps}
            loading={loading}
            error={error}
            onToggleApp={toggleApp}
            onSubmit={submitFinalStep}
            onBack={prevStep}
          />
        ) : null}
      </div>
      <style jsx>{`
        @keyframes onboardingStepIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </AuthPageShell>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingLoadingSpinner />}>
      <OnboardingPageContent />
    </Suspense>
  );
}
