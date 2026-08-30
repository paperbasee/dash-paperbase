"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBranding } from "@/context/BrandingContext";
import { formatOrderNumber } from "@/lib/orders/format-order-number";
import { numberTextClass } from "@/lib/number-font";
import { cn } from "@/lib/utils";
import { OrderPreviewContent } from "./OrderPreviewContent";
import { useOrderPreview } from "./use-order-preview";

export type OrderPreviewDialogProps = {
  orderPublicId: string | null;
  orderNumber: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function OrderPreviewDialog({
  orderPublicId,
  orderNumber,
  open,
  onOpenChange,
}: OrderPreviewDialogProps) {
  const locale = useLocale();
  const numClass = numberTextClass(locale);
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const { currencySymbol } = useBranding();
  const { order, loading, error } = useOrderPreview(orderPublicId, open);

  const rawTitleNumber = order?.order_number ?? orderNumber;
  const titleNumber = rawTitleNumber ? formatOrderNumber(rawTitleNumber) : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex max-h-[min(calc(100vh-2rem),520px)] w-[calc(100vw-2rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:w-full",
        )}
      >
        <DialogClose
          className={cn(
            "absolute right-4 top-4 z-10 text-sm font-medium text-muted-foreground transition-colors",
            "hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        >
          {tCommon("close")}
        </DialogClose>
        <DialogHeader className="shrink-0 border-b border-border pb-4 pr-14 pt-6 text-left">
          <DialogTitle className={cn("text-base sm:text-lg", numClass)}>
            {tPages("ordersPreviewTitle", { orderNumber: titleNumber })}
          </DialogTitle>
          <DialogDescription>{tPages("ordersPreviewDescription")}</DialogDescription>
        </DialogHeader>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-4 sm:px-4 sm:pb-4 sm:pt-5",
            "[scrollbar-width:thin]",
          )}
        >
          <OrderPreviewContent
            order={order}
            loading={loading}
            error={error}
            currencySymbol={currencySymbol}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
