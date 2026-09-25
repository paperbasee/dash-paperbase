"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ClipboardTextIcon } from "@phosphor-icons/react";
import { Check, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import { apiOrigin } from "@/lib/api-client";
import { courierPath } from "@/lib/integrations/services";
import { couriersQueryKey } from "@/lib/query-keys";
import type { Courier } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { notify } from "@/notifications";
import { cn } from "@/lib/utils";

// Where Steadfast sends delivery updates: THIS instance's API, never paperbase's.
const CALLBACK_URL = `${apiOrigin()}/api/v1/webhooks/steadfast/`;

function newToken(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "true");
  el.style.position = "fixed";
  el.style.left = "-9999px";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  el.remove();
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-1.5">
        <span className="shrink-0 text-[11px] text-muted-foreground">{n}</span>
        <span className="text-[12px] font-medium text-foreground">{title}</span>
      </div>
      {children}
    </div>
  );
}

/**
 * The four steps that give one Steadfast account live delivery updates: the
 * callback address, and a token Steadfast signs every update with. The token is
 * made here, pasted into Steadfast, and saved to Paperbase, which keeps it to
 * check updates but can never show it again.
 */
export default function SteadfastWebhookSetup({ courier }: { courier: Courier }) {
  const t = useTranslations("settings.courier.webhook");
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [focused, setFocused] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(id);
  }, [copied]);

  const hasLocal = token.trim().length > 0;
  const hasStored = Boolean(courier.has_webhook_token);
  const hasToken = hasLocal || hasStored;
  const showPlain = !hasToken || revealed || focused;

  async function copy(text: string, afterwards?: () => void) {
    try {
      await copyText(text.trim());
      afterwards?.();
      notify.success(t("copiedBody"), { title: t("copiedTitle") });
    } catch (err) {
      notify.error(err, { title: t("copyBlockedTitle"), fallbackMessage: t("copyBlockedBody") });
    }
  }

  function generate() {
    const make = () => {
      setToken(newToken());
      setRevealed(true);
      setCopied(false);
    };
    if (!hasLocal) {
      make();
      return;
    }
    void confirm({
      title: t("regenerateTitle"),
      message: t("regenerateMessage"),
      confirmText: t("regenerateConfirm"),
      onConfirm: async () => make(),
    });
  }

  async function save() {
    const value = token.trim();
    if (!value) return;
    setSaving(true);
    try {
      await api.patch(courierPath(courier.public_id), { webhook_token: value });
      notify.success(t("savedBody"), { title: t("savedTitle") });
      void queryClient.invalidateQueries({ queryKey: couriersQueryKey });
    } catch (err) {
      notify.error(err, { title: t("saveFailedTitle"), fallbackMessage: t("saveFailedBody") });
    } finally {
      setSaving(false);
    }
  }

  const fieldId = `steadfast-webhook-token-${courier.public_id}`;

  return (
    <div className="border-t border-border">
      <button
        type="button"
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 px-3.5 py-2.5 text-start text-[12px] text-muted-foreground transition-colors hover:bg-muted/40"
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronRight
          aria-hidden
          className={cn("size-3 shrink-0 transition-transform duration-150", open && "rotate-90")}
        />
        <span>
          {t("title")}
          <span className="ms-1 text-[11px] text-muted-foreground/70">— {t("hint")}</span>
        </span>
      </button>
      {open ? (
        <div className="flex flex-col gap-3.5 px-3.5 pb-3.5">
          <Step n={1} title={t("step1Title")}>
            <p className="text-[12px] text-muted-foreground">{t("step1Body")}</p>
          </Step>

          <Step n={2} title={t("step2Title")}>
            <p className="text-[12px] text-muted-foreground">{t("step2Body")}</p>
            <div className="mt-1 flex items-center gap-2 rounded-md bg-muted px-2.5 py-1.5">
              <span className="flex-1 break-all font-mono text-[11px] text-muted-foreground">{CALLBACK_URL}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={t("copyUrl")}
                title={t("copyUrl")}
                className="shrink-0"
                onClick={() => void copy(CALLBACK_URL)}
              >
                <ClipboardTextIcon className="size-3.5" aria-hidden />
              </Button>
            </div>
          </Step>

          <Step n={3} title={t("step3Title")}>
            <p className="text-[12px] text-muted-foreground">{t("step3Body")}</p>
            <div className="mt-1 flex flex-col gap-1">
              <label htmlFor={fieldId} className="text-[11px] text-muted-foreground">
                {t("tokenLabel")}
              </label>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
                <div className="flex min-w-0 flex-1 items-stretch gap-2">
                  {hasToken && !showPlain ? (
                    <button
                      type="button"
                      id={fieldId}
                      title={t("reveal")}
                      aria-label={t("reveal")}
                      onClick={() => setRevealed(true)}
                      className="flex h-8 w-full min-w-0 cursor-pointer items-center rounded-md border border-border bg-background px-2.5 py-1 text-start font-mono text-[12px] shadow-xs outline-none transition-[color,box-shadow] hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      <span className="truncate tracking-[0.2em] text-muted-foreground" aria-hidden>
                        {"•".repeat(Math.min(hasLocal ? token.length : 32, 48))}
                      </span>
                    </button>
                  ) : (
                    <Input
                      id={fieldId}
                      name={fieldId}
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      className="h-8 min-w-0 flex-1 font-mono text-[12px]"
                      placeholder={
                        hasStored && !hasLocal
                          ? t("placeholderStored")
                          : hasToken
                            ? t("placeholderReplace")
                            : t("placeholderGenerate")
                      }
                      autoComplete="off"
                      spellCheck={false}
                      autoCapitalize="off"
                      autoCorrect="off"
                      data-1p-ignore
                      data-lpignore="true"
                      data-bwignore
                    />
                  )}
                  {hasLocal && showPlain ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title={t("copyToken")}
                      aria-label={copied ? t("copiedTitle") : t("copyToken")}
                      className="size-9 shrink-0"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => void copy(token, () => setCopied(true))}
                    >
                      {copied ? (
                        <Check className="size-4 text-emerald-600" aria-hidden />
                      ) : (
                        <ClipboardTextIcon className="size-4" aria-hidden />
                      )}
                    </Button>
                  ) : null}
                </div>
                <Button type="button" variant="outline" size="sm" className="shrink-0 text-[12px]" onClick={generate}>
                  {hasToken ? t("regenerate") : t("generate")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-[12px]"
                  disabled={!hasLocal || saving}
                  loading={saving}
                  onClick={() => void save()}
                >
                  {t("save")}
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{t("keepCopy")}</p>
              {hasStored && !hasLocal ? (
                <p className="text-[11px] text-muted-foreground">{t("storedHidden")}</p>
              ) : null}
            </div>
          </Step>

          <Step n={4} title={t("step4Title")}>
            <p className="text-[12px] text-muted-foreground">{t("step4Body")}</p>
          </Step>
        </div>
      ) : null}
    </div>
  );
}
