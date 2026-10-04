import { useCallback, useEffect, useRef, useState } from "react";

import api from "@/lib/api";
import { isApiHttpError } from "@/lib/api-client";
import { notify } from "@/notifications";

/** Backend-reported generation stage (from the invoice task via Redis). */
export type InvoiceStage = "queued" | "rendering" | "uploading";

type InvoiceState =
  | { status: "idle" }
  | { status: "generating"; stage: InvoiceStage }
  | { status: "ready"; url: string }
  /** What went wrong, for the button to say in the page's words; `detail` is the server's own reason, when it gave one. */
  | { status: "error"; reason: "timed_out" | "request_failed"; detail?: string };

const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 80;

function coerceStage(raw?: string): InvoiceStage {
  return raw === "rendering" || raw === "uploading" ? raw : "queued";
}

export function useOrderInvoice(orderPublicId: string) {
  const [state, setState] = useState<InvoiceState>({ status: "idle" });
  /** DOM timer handle (`number`); avoid `NodeJS.Timeout` from merged typings. */
  const pollRef = useRef<number | null>(null);
  const pollCount = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    pollCount.current = 0;
  }, []);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const openInvoiceInNewTabAndReset = useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => setState({ status: "idle" }), 1000);
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollCount.current = 0;
    pollRef.current = window.setInterval(() => {
      void (async () => {
        pollCount.current += 1;
        if (pollCount.current > MAX_POLLS) {
          stopPolling();
          notify.error(new Error("invoice_timeout"), {
            title: { key: "pages.toastTitleInvoiceTimedOut" },
            fallbackMessage: { key: "pages.toastDescInvoiceTimedOut" },
          });
          setState({ status: "error", reason: "timed_out" });
          return;
        }
        try {
          const res = await api.get<{ ready: boolean; url: string; stage?: string }>(
            `admin/orders/${orderPublicId}/invoice/status/`,
          );
          if (res.data.ready && res.data.url) {
            stopPolling();
            setState({ status: "ready", url: res.data.url });
            openInvoiceInNewTabAndReset(res.data.url);
          } else {
            setState({ status: "generating", stage: coerceStage(res.data.stage) });
          }
        } catch {
          // Keep polling on transient errors
        }
      })();
    }, POLL_INTERVAL_MS);
  }, [orderPublicId, stopPolling, openInvoiceInNewTabAndReset]);

  const getInvoice = useCallback(async () => {
    setState({ status: "generating", stage: "queued" });
    try {
      const res = await api.get<{
        ready: boolean;
        url: string;
        status?: string;
        stage?: string;
      }>(`admin/orders/${orderPublicId}/invoice/`);
      if (res.data.ready && res.data.url) {
        setState({ status: "ready", url: res.data.url });
        openInvoiceInNewTabAndReset(res.data.url);
      } else {
        setState({ status: "generating", stage: coerceStage(res.data.stage) });
        startPolling();
      }
    } catch (err: unknown) {
      notify.error(err, {
        title: { key: "pages.toastTitleInvoiceRequestFailed" },
        fallbackMessage: { key: "pages.toastDescInvoiceRequestFailed" },
      });
      const detail = isApiHttpError(err) || err instanceof Error ? err.message || undefined : undefined;
      setState({ status: "error", reason: "request_failed", detail });
    }
  }, [orderPublicId, startPolling, openInvoiceInNewTabAndReset]);

  const reset = useCallback(() => {
    stopPolling();
    setState({ status: "idle" });
  }, [stopPolling]);

  return { state, getInvoice, reset };
}
