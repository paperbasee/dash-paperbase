 "use client";

import type { Dispatch, SetStateAction } from "react";
import { Dialog } from "radix-ui";
import { Button } from "@/components/ui/button";

type DeleteStatus = {
  status: string;
  current_step: string;
  error_message: string | null;
} | null;

export default function DeleteStoreFlow({
  deleteConfirmOpen,
  onDeleteConfirmOpenChange,
  handleDeleteConfirmed,
  deleteInputsMatch,
  deletionInProgress,
  deleteRequestSubmitting,
  deleteSuccessDisplayed,
  deleteStatus,
  deletionSteps,
  deleteRequestError,
  onCloseDeletion,
}: {
  deleteConfirmOpen: boolean;
  onDeleteConfirmOpenChange: Dispatch<SetStateAction<boolean>> | ((open: boolean) => void);
  handleDeleteConfirmed: () => void;
  deleteInputsMatch: boolean;
  deletionInProgress: boolean;
  deleteRequestSubmitting: boolean;
  deleteSuccessDisplayed: boolean;
  deleteStatus: DeleteStatus;
  deletionSteps: string[];
  deleteRequestError: string | null;
  onCloseDeletion: () => void;
}) {
  function stepDisplay(step: string) {
    return step;
  }

  return (
    <>
      <Dialog.Root open={deleteConfirmOpen} onOpenChange={onDeleteConfirmOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-[35%] z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-none border-0 bg-background p-0 shadow-none md:rounded-lg md:border md:shadow-lg">
            <div className="p-6">
              <Dialog.Title className="sr-only">Delete Store</Dialog.Title>
              <h3 className="text-lg font-semibold text-destructive">Delete Store</h3>
              <p className="mt-3 text-sm text-destructive">
                This is a destructive action. Deleting your store will permanently remove all associated data
                including products, orders, customers, and analytics. This action cannot be undone.
              </p>

              <div className="mt-6 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onDeleteConfirmOpenChange(false)}
                  disabled={deleteRequestSubmitting || deletionInProgress}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteConfirmed}
                  disabled={!deleteInputsMatch || deleteRequestSubmitting || deletionInProgress}
                >
                  {deleteRequestSubmitting ? "Starting..." : "Confirm Delete Store"}
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {deletionInProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-xl bg-background p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {deleteSuccessDisplayed ? "Store deleted" : "Deleting your store"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {deleteSuccessDisplayed
                    ? "Your store has been permanently deleted."
                    : "Please keep this page open until deletion finishes."}
                </p>
              </div>
            </div>

            {!deleteSuccessDisplayed && deleteStatus && (
              <div className="mt-6">
                <ol className="space-y-2">
                  {deletionSteps.map((step, idx) => {
                    const currentIdx = deletionSteps.indexOf(deleteStatus.current_step);
                    const done = currentIdx !== -1 && idx < currentIdx;
                    const active = currentIdx !== -1 && idx === currentIdx;
                    return (
                      <li
                        key={step}
                        className={[
                          "flex items-center gap-2 text-sm",
                          active
                            ? "text-destructive"
                            : done
                              ? "text-muted-foreground"
                              : "text-muted-foreground/70",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs",
                            active
                              ? "border-destructive/40 text-destructive"
                              : done
                                ? "border-border bg-muted text-muted-foreground"
                                : "border-border text-muted-foreground/70",
                          ].join(" ")}
                        >
                          {done ? "✓" : idx + 1}
                        </span>
                        <span>{stepDisplay(step)}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {deleteRequestError && (
              <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm text-destructive">{deleteRequestError}</p>
                <div className="mt-4 flex justify-end">
                  <Button type="button" variant="outline" onClick={onCloseDeletion}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

