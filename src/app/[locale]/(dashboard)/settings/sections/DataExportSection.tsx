"use client";

import type { LucideIcon } from "lucide-react";
import { Archive, Package, Store, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SettingsSectionBody, settingsSectionSurfaceClassName } from "../SettingsSectionBody";

type ExportVariant = "products" | "orders" | "backup";

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
  products: {
    shell: "border-[hsl(var(--chart-products)/0.38)]",
    middle: "border-[hsl(var(--chart-products)/0.2)] bg-[hsl(var(--chart-products)/0.06)]",
    footer: "border-[hsl(var(--chart-products)/0.28)] bg-[hsl(var(--chart-products)/0.09)]",
    iconWrap: "border-[hsl(var(--chart-products)/0.28)] bg-[hsl(var(--chart-products)/0.1)]",
    iconClass: "text-[hsl(var(--chart-products))]",
  },
  orders: {
    shell: "border-[hsl(var(--chart-orders)/0.38)]",
    middle: "border-[hsl(var(--chart-orders)/0.2)] bg-[hsl(var(--chart-orders)/0.06)]",
    footer: "border-[hsl(var(--chart-orders)/0.28)] bg-[hsl(var(--chart-orders)/0.09)]",
    iconWrap: "border-[hsl(var(--chart-orders)/0.28)] bg-[hsl(var(--chart-orders)/0.1)]",
    iconClass: "text-[hsl(var(--chart-orders))]",
  },
  backup: {
    shell: "border-[hsl(var(--chart-support-tickets)/0.38)]",
    middle: "border-[hsl(var(--chart-support-tickets)/0.2)] bg-[hsl(var(--chart-support-tickets)/0.06)]",
    footer: "border-[hsl(var(--chart-support-tickets)/0.28)] bg-[hsl(var(--chart-support-tickets)/0.09)]",
    iconWrap: "border-[hsl(var(--chart-support-tickets)/0.28)] bg-[hsl(var(--chart-support-tickets)/0.1)]",
    iconClass: "text-[hsl(var(--chart-support-tickets))]",
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
          className={cn(
            "shrink-0 border bg-background/80 hover:bg-muted/60",
            variant === "products" &&
              "border-[hsl(var(--chart-products)/0.45)] hover:bg-[hsl(var(--chart-products)/0.08)]",
            variant === "orders" &&
              "border-[hsl(var(--chart-orders)/0.45)] hover:bg-[hsl(var(--chart-orders)/0.08)]",
            variant === "backup" &&
              "border-[hsl(var(--chart-support-tickets)/0.45)] hover:bg-[hsl(var(--chart-support-tickets)/0.08)]",
          )}
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
  storeSubtitle,
  logoSrc,
}: {
  hidden: boolean;
  deleteStoreDisabled: boolean;
  onOpenDeleteConfirm: (open: boolean) => void;
  /** Shown in the delete preview row (matches confirmation modal). */
  storeDisplayName: string;
  /** Secondary line under the store name (e.g. store type). */
  storeSubtitle: string;
  /** Store logo URL for preview, or null for placeholder. */
  logoSrc: string | null;
}) {
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
          <h2 className="text-lg font-medium text-foreground">Data & Export</h2>
          <p className="text-sm text-muted-foreground">
            Export products, orders, backup your data, or delete your store.
          </p>
        </div>

        <div className="space-y-6">
        <ExportOptionCard
          variant="products"
          icon={Package}
          title="Export Products"
          description="Download your catalog, variants, images metadata, and inventory as CSV or JSON for spreadsheets or migrations."
          previewTitle="CSV / JSON"
          previewSubtitle="Structured export of your product catalog"
          inputPlaceholder="CSV / JSON — coming soon"
          buttonLabel="Export products"
        />

        <ExportOptionCard
          variant="orders"
          icon={ClipboardList}
          title="Export Orders"
          description="Export order history, line items, payment status, and fulfillment data for accounting or analysis."
          previewTitle="Order export"
          previewSubtitle="Includes orders and customer references"
          inputPlaceholder="Download order data — coming soon"
          buttonLabel="Export orders"
        />

        <ExportOptionCard
          variant="backup"
          icon={Archive}
          title="Backup Download"
          description="Create a full store snapshot including settings and data for disaster recovery or migration."
          previewTitle="Full store backup"
          previewSubtitle="Complete snapshot of store data"
          inputPlaceholder="Full store backup — coming soon"
          buttonLabel="Download backup"
        />

        <div
          className={cn(
            "overflow-hidden rounded-lg border border-destructive/40 bg-background",
            "shadow-sm",
          )}
        >
          <div className="p-5 md:p-6">
            <h3 className="text-base font-semibold text-foreground">Delete Store</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Permanently delete this store and all products, orders, customers, API keys, integrations,
              and settings. This action cannot be undone.
            </p>
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
              Delete Store
            </Button>
          </div>
        </div>
        </div>
      </SettingsSectionBody>
    </section>
  );
}
