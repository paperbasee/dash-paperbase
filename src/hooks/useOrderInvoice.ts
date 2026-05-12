import { useCallback, useEffect, useRef, useState } from "react";

import api from "@/lib/api";
import { isApiHttpError } from "@/lib/api-client";
import { notify } from "@/notifications";

type InvoiceState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "ready"; url: string }
  | { status: "error"; message: string };

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 40;

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
          setState({
            status: "error",
            message: "Invoice generation timed out. Please try again.",
          });
          return;
        }
        try {
          const res = await api.get<{ ready: boolean; url: string }>(
            `admin/orders/${orderPublicId}/invoice/status/`,
          );
          if (res.data.ready && res.data.url) {
            stopPolling();
            setState({ status: "ready", url: res.data.url });
            openInvoiceInNewTabAndReset(res.data.url);
          }
        } catch {
          // Keep polling on transient errors
        }
      })();
    }, POLL_INTERVAL_MS);
  }, [orderPublicId, stopPolling, openInvoiceInNewTabAndReset]);

  const getInvoice = useCallback(async () => {
    setState({ status: "generating" });
    try {
      const res = await api.get<{
        ready: boolean;
        url: string;
        status?: string;
      }>(`admin/orders/${orderPublicId}/invoice/`);
      if (res.data.ready && res.data.url) {
        setState({ status: "ready", url: res.data.url });
        openInvoiceInNewTabAndReset(res.data.url);
      } else {
        startPolling();
      }
    } catch (err: unknown) {
      notify.error(err, {
        title: { key: "pages.toastTitleInvoiceRequestFailed" },
        fallbackMessage: { key: "pages.toastDescInvoiceRequestFailed" },
      });
      let message = "Failed to request invoice. Please try again.";
      if (isApiHttpError(err)) {
        message = err.message || message;
      } else if (err instanceof Error && err.message) {
        message = err.message;
      }
      setState({ status: "error", message });
    }
  }, [orderPublicId, startPolling, openInvoiceInNewTabAndReset]);

  const reset = useCallback(() => {
    stopPolling();
    setState({ status: "idle" });
  }, [stopPolling]);

  return { state, getInvoice, reset };
}
