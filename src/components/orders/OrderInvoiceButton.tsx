"use client";

import { DownloadIcon } from "@phosphor-icons/react";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useOrderInvoice } from "@/hooks/useOrderInvoice";

interface OrderInvoiceButtonProps {
  orderPublicId: string;
}

export function OrderInvoiceButton({ orderPublicId }: OrderInvoiceButtonProps) {
  const { state, getInvoice, reset } = useOrderInvoice(orderPublicId);

  const isGenerating = state.status === "generating";
  const isError = state.status === "error";

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full gap-2 rounded-card"
        loading={isGenerating}
        disabled={isGenerating}
        onClick={() => void getInvoice()}
      >
        {!isGenerating && <DownloadIcon className="size-4" aria-hidden />}
        {isGenerating ? "Preparing invoice..." : "Get Invoice"}
      </Button>
      {isError && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{state.status === "error" ? state.message : ""}</span>
          <button
            type="button"
            onClick={reset}
            className="ml-auto underline underline-offset-2 hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
