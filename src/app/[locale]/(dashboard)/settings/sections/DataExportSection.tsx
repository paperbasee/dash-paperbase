"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Download, Store, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  REMOVE_STORE_CONFIRM_PHRASE,
  isDeleteStoreModalStoreNameConfirmed,
  isRemoveStoreModalPhraseConfirmed,
} from "@/lib/validation";
import { cn } from "@/lib/utils";
import {
  SettingsSectionBody,
  settingsInvertedButtonClassName,
  settingsSectionSurfaceClassName,
} from "../SettingsSectionBody";

type ExportVariant = "exportStore" | "importStore";

const EXPORT_VARIANT: Record<
  ExportVariant,
  {
    shell: string;
    middle: string;
    footer: string;
    iconWrap: string;
    iconClass: string;
  }
> = {
  exportStore: {
    shell: "border-[hsl(var(--chart-products)/0.38)]",
    middle: "border-[hsl(var(--chart-products)/0.2)] bg-[hsl(var(--chart-products)/0.06)]",
    footer: "border-[hsl(var(--chart-products)/0.28)] bg-[hsl(var(--chart-products)/0.09)]",
    iconWrap: "border-[hsl(var(--chart-products)/0.28)] bg-[hsl(var(--chart-products)/0.1)]",
    iconClass: "text-[hsl(var(--chart-products))]",
  },
  importStore: {
    shell: "border-[hsl(var(--chart-orders)/0.38)]",
    middle: "border-[hsl(var(--chart-orders)/0.2)] bg-[hsl(var(--chart-orders)/0.06)]",
    footer: "border-[hsl(var(--chart-orders)/0.28)] bg-[hsl(var(--chart-orders)/0.09)]",
    iconWrap: "border-[hsl(var(--chart-orders)/0.28)] bg-[hsl(var(--chart-orders)/0.1)]",
    iconClass: "text-[hsl(var(--chart-orders))]",
  },
};

function ExportOptionCard({
  variant,
  title,
  description,
  previewTitle,
  previewSubtitle,
  inputPlaceholder,
  icon: Icon,
  buttonLabel,
}: {
  variant: ExportVariant;
  title: string;
  description: string;
  previewTitle: string;
  previewSubtitle: string;
  inputPlaceholder: string;
  icon: LucideIcon;
  buttonLabel: string;
}) {
  const v = EXPORT_VARIANT[variant];
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-background shadow-sm",
        v.shell,
      )}
    >
      <div className="p-5 md:p-6">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>

      <div className={cn("border-t px-5 py-4 md:px-6", v.middle)}>
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border",
              v.iconWrap,
            )}
            aria-hidden
          >
            <Icon className={cn("size-7 stroke-[1.5]", v.iconClass)} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-base font-semibold text-foreground">{previewTitle}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{previewSubtitle}</p>
          </div>
        </div>
        <div className="mt-4">
          <Input placeholder={inputPlaceholder} disabled />
        </div>
      </div>

      <div className={cn("flex justify-end border-t px-4 py-3 md:px-5", v.footer)}>
        <Button
          type="button"
          variant="outline"
          className={cn("shrink-0", settingsInvertedButtonClassName)}
          disabled
        >
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}

export default function DataExportSection({
  hidden,
  deleteStoreDisabled,
  onOpenDeleteConfirm,
  storeDisplayName,
  expectedStoreNameForRemove,
  storeSubtitle,
  logoSrc,
  contactEmail,
  onRemoveStore,
  removeStoreError,
  clearRemoveStoreError,
  removeStoreDisabled,
  removeStoreSubmitting,
}: {
  hidden: boolean;
  deleteStoreDisabled: boolean;
  onOpenDeleteConfirm: (open: boolean) => void;
  /** Shown in the delete preview row (matches confirmation modal). */
  storeDisplayName: string;
  /** Exact store name for API `store_name` (same as delete flow). */
  expectedStoreNameForRemove: string;
  /** Secondary line under the store name (e.g. store type). */
  storeSubtitle: string;
  /** Store logo URL for preview, or null for placeholder. */
  logoSrc: string | null;
  contactEmail: string;
  onRemoveStore: (storeName: string, confirmationPhrase: string) => Promise<boolean>;
  removeStoreError: string | null;
  clearRemoveStoreError: () => void;
  removeStoreDisabled: boolean;
  removeStoreSubmitting: boolean;
}) {
  const t = useTranslations("settings");
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeName, setRemoveName] = useState("");
  const [removePhrase, setRemovePhrase] = useState("");

  const removeNameOk = isDeleteStoreModalStoreNameConfirmed(removeName, expectedStoreNameForRemove);
  const removePhraseOk = isRemoveStoreModalPhraseConfirmed(removePhrase);
  const removeConfirmOk = removeNameOk && removePhraseOk;

  useEffect(() => {
    if (!removeOpen) return;
    setRemoveName("");
    setRemovePhrase("");
    clearRemoveStoreError();
  }, [removeOpen, clearRemoveStoreError]);

  function handleRemoveDialogChange(open: boolean) {
    if (!open && removeStoreSubmitting) return;
    setRemoveOpen(open);
  }

  async function handleSubmitRemove() {
    if (!removeConfirmOk || removeStoreSubmitting) return;
    const ok = await onRemoveStore(expectedStoreNameForRemove.trim(), removePhrase.trim());
    if (ok) setRemoveOpen(false);
  }

  return (
    <section
      id="panel-data"
      role="tabpanel"
      aria-labelledby="tab-data"
      hidden={hidden}
      className={settingsSectionSurfaceClassName}
    >
      <SettingsSectionBody>
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-foreground">{t("dataExport.heading")}</h2>
          <p className="text-sm text-muted-foreground">{t("dataExport.subtitle")}</p>
        </div>

        <div className="space-y-6">
        <ExportOptionCard
          variant="exportStore"
          icon={Download}
          title={t("dataExport.exportStoreTitle")}
          description={t("dataExport.exportStoreDesc")}
          previewTitle={t("dataExport.exportStorePreviewTitle")}
          previewSubtitle={t("dataExport.exportStorePreviewSubtitle")}
          inputPlaceholder={t("dataExport.exportStorePlaceholder")}
          buttonLabel={t("dataExport.exportStoreButton")}
        />

        <ExportOptionCard
          variant="importStore"
          icon={Upload}
          title={t("dataExport.importStoreTitle")}
          description={t("dataExport.importStoreDesc")}
          previewTitle={t("dataExport.importStorePreviewTitle")}
          previewSubtitle={t("dataExport.importStorePreviewSubtitle")}
          inputPlaceholder={t("dataExport.importStorePlaceholder")}
          buttonLabel={t("dataExport.importStoreButton")}
        />

        <div
          className={cn(
            "overflow-hidden rounded-lg border border-amber-600/35 bg-background",
            "shadow-sm",
          )}
        >
          <div className="p-5 md:p-6">
            <h3 className="text-base font-semibold text-foreground">{t("dataExport.removeTitle")}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {contactEmail.trim() ? t("dataExport.removeDesc") : t("dataExport.removeNeedsContact")}
            </p>
          </div>
          <div className="flex justify-end border-t border-amber-600/25 bg-amber-500/5 px-4 py-3 md:px-5">
            <Button
              type="button"
              variant="outline"
              className={cn("shrink-0", settingsInvertedButtonClassName)}
              onClick={() => setRemoveOpen(true)}
              disabled={removeStoreDisabled}
            >
              {t("dataExport.removeButton")}
            </Button>
          </div>
        </div>

        <Dialog open={removeOpen} onOpenChange={handleRemoveDialogChange}>
          <DialogContent
            className={cn(
              "gap-0 p-0 sm:rounded-lg",
              "max-sm:max-w-[min(20rem,calc(100vw-1.5rem))] max-sm:rounded-lg",
            )}
            onPointerDownOutside={(e) => {
              if (removeStoreSubmitting) e.preventDefault();
            }}
            onEscapeKeyDown={(e) => {
              if (removeStoreSubmitting) e.preventDefault();
            }}
          >
            <DialogHeader className="gap-1 border-b border-border p-4 sm:p-6">
              <DialogTitle className="text-base font-semibold">{t("dataExport.removeDialogTitle")}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {t("dataExport.removeDialogDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 p-4 sm:space-y-4 sm:p-6">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="remove-store-name" className="text-sm font-medium text-foreground">
                  {t("dataExport.removeConfirmNameLabel")}{" "}
                  <span className="font-semibold">{expectedStoreNameForRemove || storeDisplayName}</span>
                </label>
                <Input
                  id="remove-store-name"
                  autoComplete="off"
                  value={removeName}
                  onChange={(e) => setRemoveName(e.target.value)}
                  disabled={removeStoreSubmitting}
                  placeholder={expectedStoreNameForRemove || storeDisplayName}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="remove-store-phrase" className="text-sm font-medium text-foreground">
                  {t("dataExport.removeConfirmPhraseLabel")}{" "}
                  <span className="font-semibold">{REMOVE_STORE_CONFIRM_PHRASE}</span>
                </label>
                <Input
                  id="remove-store-phrase"
                  autoComplete="off"
                  value={removePhrase}
                  onChange={(e) => setRemovePhrase(e.target.value)}
                  disabled={removeStoreSubmitting}
                  placeholder={t("dataExport.removeConfirmPhraseHint")}
                />
              </div>
              {removeStoreError ? (
                <p className="text-sm text-destructive" role="alert">
                  {removeStoreError}
                </p>
              ) : null}
            </div>
            <DialogFooter className="flex flex-row justify-end gap-2 border-t border-border p-4 sm:p-6">
              <Button
                type="button"
                variant="outline"
                className={settingsInvertedButtonClassName}
                onClick={() => setRemoveOpen(false)}
                disabled={removeStoreSubmitting}
              >
                {t("dataExport.removeDialogCancel")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className={settingsInvertedButtonClassName}
                onClick={() => void handleSubmitRemove()}
                disabled={!removeConfirmOk || removeStoreSubmitting}
              >
                {removeStoreSubmitting ? t("dataExport.removeWorking") : t("dataExport.removeDialogSubmit")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div
          className={cn(
            "overflow-hidden rounded-lg border border-destructive/40 bg-background",
            "shadow-sm",
          )}
        >
          <div className="p-5 md:p-6">
            <h3 className="text-base font-semibold text-foreground">{t("dataExport.deleteTitle")}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("dataExport.deleteDescScheduled")}</p>
          </div>

          <div className="border-t border-border/80 bg-muted/20 px-5 py-4 md:px-6">
            <div className="flex items-center gap-4">
              <div
                className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border bg-muted"
                aria-hidden
              >
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt={storeDisplayName}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted-foreground">
                    <Store className="size-7" strokeWidth={1.5} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-foreground">{storeDisplayName}</p>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{storeSubtitle}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t border-destructive/30 bg-destructive/10 px-4 py-3 md:px-5">
            <Button
              type="button"
              variant="destructive"
              className="shrink-0"
              onClick={() => onOpenDeleteConfirm(true)}
              disabled={deleteStoreDisabled}
            >
              {t("dataExport.deleteButton")}
            </Button>
          </div>
        </div>
        </div>
      </SettingsSectionBody>
    </section>
  );
}
