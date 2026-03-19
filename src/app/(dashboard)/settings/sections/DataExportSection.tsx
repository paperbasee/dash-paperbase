 "use client";

import { Trash2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function DataExportSection({
  hidden,
  deleteEmailInput,
  deleteStoreNameInput,
  onDeleteEmailChange,
  onDeleteStoreNameChange,
  deletionInProgress,
  deleteRequestSubmitting,
  deleteInputsMatch,
  deleteRequestError,
  onOpenDeleteConfirm,
}: {
  hidden: boolean;
  deleteEmailInput: string;
  deleteStoreNameInput: string;
  onDeleteEmailChange: Dispatch<SetStateAction<string>> | ((value: string) => void);
  onDeleteStoreNameChange: Dispatch<SetStateAction<string>> | ((value: string) => void);
  deletionInProgress: boolean;
  deleteRequestSubmitting: boolean;
  deleteInputsMatch: boolean;
  deleteRequestError: string | null;
  onOpenDeleteConfirm: (open: boolean) => void;
}) {
  return (
    <section
      id="panel-data"
      role="tabpanel"
      aria-labelledby="tab-data"
      hidden={hidden}
      className="rounded-xl border border-dashed border-border bg-background p-4 md:p-6"
    >
      <h2 className="text-lg font-medium text-foreground">Data & Export</h2>
      <p className="mb-4 text-sm text-muted-foreground">Export products, orders, backup your data, or delete your store.</p>

      <div className="w-full max-w-6xl space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Export Products</label>
          <Input placeholder="CSV / JSON" disabled />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Export Orders</label>
          <Input placeholder="Download order data" disabled />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Backup Download</label>
          <Input placeholder="Full store backup" disabled />
        </div>

        <div className="flex flex-col gap-2">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Trash2 className="size-4 text-destructive" />
                <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
              </div>
              <span className="text-xs text-destructive/80">Irreversible</span>
            </div>

            <p className="mt-2 text-sm text-destructive">
              This is a destructive action. Deleting your store will permanently remove all associated data including
              products, orders, customers, and analytics. This action cannot be undone.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Account email</label>
                <Input
                  placeholder="Type your account email"
                  value={deleteEmailInput}
                  onChange={(e) => onDeleteEmailChange(e.target.value)}
                  disabled={deletionInProgress || deleteRequestSubmitting}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Store name</label>
                <Input
                  placeholder="Type your store name"
                  value={deleteStoreNameInput}
                  onChange={(e) => onDeleteStoreNameChange(e.target.value)}
                  disabled={deletionInProgress || deleteRequestSubmitting}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={() => onOpenDeleteConfirm(true)}
                disabled={!deleteInputsMatch || deletionInProgress || deleteRequestSubmitting}
              >
                {deleteRequestSubmitting ? "Preparing..." : "Delete Store"}
              </Button>
              <p className="text-xs text-destructive/90">Enter both values exactly to enable deletion.</p>
            </div>

            {deleteRequestError && <p className="mt-3 text-sm text-destructive">{deleteRequestError}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

