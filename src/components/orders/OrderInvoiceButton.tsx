"use client";

import { useEffect, useRef, useState } from "react";
import { DownloadIcon } from "@phosphor-icons/react";
import { AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useOrderInvoice, type InvoiceStage } from "@/hooks/useOrderInvoice";

interface OrderInvoiceButtonProps {
  orderPublicId: string;
}

// Backend-reported stage -> label + the progress band it fills within.
const STAGE_META: Record<InvoiceStage, { label: string; base: number; cap: number }> = {
  queued: { label: "Queued…", base: 6, cap: 20 },
  rendering: { label: "Generating invoice…", base: 28, cap: 80 },
  uploading: { label: "Almost ready…", base: 84, cap: 95 },
};

export function OrderInvoiceButton({ orderPublicId }: OrderInvoiceButtonProps) {
  const { state, getInvoice, reset } = useOrderInvoice(orderPublicId);

  const isGenerating = state.status === "generating";
  const isReady = state.status === "ready";
  const isError = state.status === "error";
  const showProgress = isGenerating || isReady;
  const stage = state.status === "generating" ? state.stage : null;

  // Fill smoothly within the current backend stage so the bar reflects real
  // progress (queued → rendering → uploading → ready) and never looks frozen.
  const [now, setNow] = useState(() => Date.now());
  const stageStartRef = useRef<number>(Date.now());
  const prevStageRef = useRef<InvoiceStage | null>(null);

  useEffect(() => {
    if (stage && stage !== prevStageRef.current) {
      prevStageRef.current = stage;
      stageStartRef.current = Date.now();
    }
    if (!stage) prevStageRef.current = null;
  }, [stage]);

  useEffect(() => {
    if (!isGenerating) return;
    const id = window.setInterval(() => setNow(Date.now()), 120);
    return () => window.clearInterval(id);
  }, [isGenerating]);

  let progress = 0;
  let label = "";
  if (isReady) {
    progress = 100;
    label = "Opening…";
  } else if (stage) {
    const meta = STAGE_META[stage];
    const elapsed = now - stageStartRef.current;
    progress = meta.base + (meta.cap - meta.base) * (1 - Math.exp(-elapsed / 1600));
    label = meta.label;
  }

  return (
    <div className="flex flex-col gap-2">
      {showProgress ? (
        <div
          className="w-full rounded-card border border-border bg-muted/30 p-3"
          role="status"
          aria-live="polite"
        >
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              {label}
            </span>
            <span className="tabular-nums text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-foreground transition-[width] duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-2 rounded-card"
          onClick={() => void getInvoice()}
        >
          <DownloadIcon className="size-4" aria-hidden />
          Get Invoice
        </Button>
      )}
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
