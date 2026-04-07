/** Must match API `StoreDeletionJob` step strings (used for status matching). */
export const DELETION_STEPS_API = [
  "Removing orders...",
  "Clearing customer data...",
  "Deleting products...",
  "Deleting analytics...",
  "Finalizing...",
] as const;

export type DeletionStepApi = (typeof DELETION_STEPS_API)[number];

const STEP_TO_I18N_KEY: Record<DeletionStepApi, string> = {
  "Removing orders...": "deleteFlow.stepRemovingOrders",
  "Clearing customer data...": "deleteFlow.stepClearingCustomers",
  "Deleting products...": "deleteFlow.stepDeletingProducts",
  "Deleting analytics...": "deleteFlow.stepDeletingAnalytics",
  "Finalizing...": "deleteFlow.stepFinalizing",
};

export function translateDeletionStep(
  step: string,
  t: (key: string) => string,
): string {
  if (step.includes("Scheduled")) {
    return t("deleteFlow.stepScheduled");
  }
  const key = STEP_TO_I18N_KEY[step as DeletionStepApi];
  return key ? t(key) : step;
}
