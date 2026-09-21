"use client";

import { Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type OrderPreviewTriggerButtonProps = {
  orderNumber: string;
  onClick: () => void;
  className?: string;
};

export function OrderPreviewTriggerButton({
  orderNumber,
  onClick,
  className,
}: OrderPreviewTriggerButtonProps) {
  const tPages = useTranslations("pages");

  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 items-center justify-center p-0 text-muted-foreground",
        "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      aria-label={tPages("ordersListPreviewAria", { orderNumber })}
    >
      <Eye className="size-4" aria-hidden />
    </button>
  );
}
