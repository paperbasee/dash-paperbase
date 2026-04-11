"use client";

import { Suspense } from "react";
import {
  OnboardingLoadingSpinner,
  OnboardingPageContent,
} from "../page";

export default function CreateStoreOnboardingPage() {
  return (
    <Suspense fallback={<OnboardingLoadingSpinner />}>
      <OnboardingPageContent initialStep={2} />
    </Suspense>
  );
}
