"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Check, Loader2, Lock, TriangleAlert } from "lucide-react";

import { SupportReadOnly } from "@/components/support/SupportReadOnly";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { useFraudKeyQuery } from "@/hooks/useFraudKeyQuery";
import api from "@/lib/api";
import { isApiHttpError } from "@/lib/api-client";
import {
  removeFraudKey,
  saveFraudKey,
  testFraudKey,
  type FraudKey,
  type FraudKeyMode,
} from "@/lib/fraud-key";
import { fraudKeyQueryKey } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { notify } from "@/notifications";

import {
  SettingsSectionBody,
  settingsInvertedButtonClassName,
  settingsSectionSurfaceClassName,
} from "../SettingsSectionBody";

const MODES: readonly FraudKeyMode[] = ["paperbase", "own"];

/** Why the Test key could not ask, as the API names it. */
const TEST_PROBLEMS: Record<string, string> = {
  no_token: "testNoToken",
  no_shop_phone: "testNoPhone",
  own_key_minute: "testTooMany",
};

/**
 * Settings > Fraud check (phase 5a, owner 2026-11-17; guidelines/own-fraud-key-plan.md): one choice,
 * Paperbase's check or the shop's own key -- a provider from the list and its token, shown by its last
 * four only, with a Test key. On its own key there is no fallback, nothing counts against Paperbase's
 * limits, and its answers are shared with every shop for a day (while Paperbase shares them). A
 * failing key is said here loudly, and on the orders list.
 *
 * Shown to the Admin role and the owner (settings.manage); Premium only -- on another plan it is
 * locked and a saved key waits, unused, for the renewal. Paperbase support only reads it.
 */
export default function FraudCheckSection({ hidden }: { hidden: boolean }) {
  const t = useTranslations("settings.fraudKey");
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { data: key } = useFraudKeyQuery({ enabled: !hidden });

  // What is being chosen, before Save; null: as saved.
  const [mode, setMode] = useState<FraudKeyMode | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [changingToken, setChangingToken] = useState(false);
  const [tokenInvalid, setTokenInvalid] = useState(false);
  const [busy, setBusy] = useState<"save" | "test" | "remove" | null>(null);

  if (hidden) return null;

  function settle(next: FraudKey) {
    queryClient.setQueryData(fraudKeyQueryKey, next);
    setMode(null);
    setProvider(null);
    setToken("");
    setChangingToken(false);
    setTokenInvalid(false);
  }

  async function handleSave(chosen: FraudKeyMode, chosenProvider: string) {
    setBusy("save");
    setTokenInvalid(false);
    try {
      const typed = token.trim();
      settle(
        await saveFraudKey(api, {
          mode: chosen,
          ...(chosen === "own" ? { provider: chosenProvider } : {}),
          ...(chosen === "own" && typed ? { token: typed } : {}),
        }),
      );
      notify.success({ key: chosen === "own" ? "settings.fraudKey.savedOwn" : "settings.fraudKey.savedPaperbase" });
    } catch (err) {
      const body = isApiHttpError(err) && typeof err.data === "object" && err.data ? err.data : null;
      if (body && "token" in body) setTokenInvalid(true);
      else notify.error(err, { fallbackMessage: t("saveFailed") });
    } finally {
      setBusy(null);
    }
  }

  async function handleTest() {
    setBusy("test");
    try {
      const result = await testFraudKey(api);
      queryClient.setQueryData(fraudKeyQueryKey, result.key);
      if (result.ok) notify.success({ key: "settings.fraudKey.testOk" });
    } catch (err) {
      const code = isApiHttpError(err) && typeof err.data === "object" && err.data ? (err.data as { code?: unknown }).code : null;
      const problem = typeof code === "string" ? TEST_PROBLEMS[code] : undefined;
      notify.error(err, { fallbackMessage: t(problem ?? "testFailed") });
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove() {
    const ok = await confirm({
      title: t("removeTitle"),
      message: t("removeMessage"),
      confirmText: t("remove"),
      variant: "warning",
    });
    if (!ok) return;
    setBusy("remove");
    try {
      settle(await removeFraudKey(api));
      notify.success({ key: "settings.fraudKey.removed" });
    } catch (err) {
      notify.error(err, { fallbackMessage: t("saveFailed") });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section
      id="panel-fraud_check"
      role="tabpanel"
      aria-labelledby="tab-fraud_check"
      className={settingsSectionSurfaceClassName}
    >
      {key ? (
        <SettingsSectionBody>
          <FraudKeyForm
            saved={key}
            mode={mode ?? key.mode}
            provider={provider ?? key.provider}
            token={token}
            changingToken={changingToken}
            tokenInvalid={tokenInvalid}
            busy={busy}
            onMode={setMode}
            onProvider={setProvider}
            onToken={(value) => {
              setToken(value);
              setTokenInvalid(false);
            }}
            onChangeToken={() => setChangingToken(true)}
            onSave={() => void handleSave(mode ?? key.mode, provider ?? key.provider)}
            onTest={() => void handleTest()}
            onRemove={() => void handleRemove()}
          />
        </SettingsSectionBody>
      ) : null}
    </section>
  );
}

function FraudKeyForm({
  saved,
  mode,
  provider,
  token,
  changingToken,
  tokenInvalid,
  busy,
  onMode,
  onProvider,
  onToken,
  onChangeToken,
  onSave,
  onTest,
  onRemove,
}: {
  saved: FraudKey;
  mode: FraudKeyMode;
  provider: string;
  token: string;
  changingToken: boolean;
  tokenInvalid: boolean;
  busy: "save" | "test" | "remove" | null;
  onMode: (mode: FraudKeyMode) => void;
  onProvider: (provider: string) => void;
  onToken: (token: string) => void;
  onChangeToken: () => void;
  onSave: () => void;
  onTest: () => void;
  onRemove: () => void;
}) {
  const t = useTranslations("settings.fraudKey");
  const locked = !saved.included;
  const providerName = saved.providers.find((row) => row.value === provider)?.label ?? provider;
  const typing = mode === "own" && (!saved.hasToken || changingToken);
  const unchanged = mode === saved.mode && provider === saved.provider && !token.trim();
  // A warning about the saved key, while the shop's checks run on it.
  const live = saved.mode === "own" && saved.included;

  return (
    <div className="w-full space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium text-foreground">{t("heading")}</h2>
          {locked ? (
            <span className="inline-flex items-center gap-1 rounded-tooltip border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
              <Lock className="size-3 shrink-0" aria-hidden />
              {t("premium")}
            </span>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {live && saved.state === "failing" ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-ui border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-900 dark:text-red-200"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="min-w-0 space-y-0.5">
            <p className="font-medium">{t("failingTitle")}</p>
            <p>{t("failingBody", { provider: providerName, detail: saved.failing?.detail || t("noDetail") })}</p>
          </div>
        </div>
      ) : null}
      {live && saved.state === "missing" ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-ui border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-sm text-amber-900 dark:text-amber-200"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{t("missingBody")}</p>
        </div>
      ) : null}
      {locked && saved.hasToken ? <p className="text-sm text-muted-foreground">{t("keptNote")}</p> : null}

      <SupportReadOnly>
        <fieldset disabled={locked || busy !== null} className="m-0 min-w-0 space-y-6 border-0 p-0">
          <div
            role="radiogroup"
            aria-label={t("heading")}
            className="divide-y divide-border overflow-hidden rounded-ui bg-muted/60 ring-1 ring-inset ring-border"
          >
            {MODES.map((one) => {
              const selected = mode === one;
              return (
                <button
                  key={one}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onMode(one)}
                  className={cn(
                    "flex min-h-11 w-full items-start justify-between gap-4 px-4 py-[15px] text-start transition-colors",
                    "outline-none focus-visible:bg-foreground/5 disabled:cursor-not-allowed",
                    selected ? "bg-foreground/[0.065]" : "hover:bg-foreground/[0.04] disabled:hover:bg-transparent",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-foreground">{t(one)}</span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">
                      {t(`${one}Note`)}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "mt-px grid size-5 shrink-0 place-items-center rounded-full border",
                      selected ? "border-foreground bg-foreground text-background" : "border-muted-foreground/50",
                    )}
                  >
                    {selected ? <Check className="size-3.5" strokeWidth={3} /> : null}
                  </span>
                </button>
              );
            })}
          </div>

          {mode === "own" ? (
            <div className="space-y-5">
              <div className="form-field max-w-sm">
                <label htmlFor="fraud-key-provider" className="field-label">
                  {t("provider")}
                </label>
                <Select id="fraud-key-provider" value={provider} onChange={(e) => onProvider(e.target.value)}>
                  {saved.providers.map((row) => (
                    <option key={row.value} value={row.value}>
                      {row.label}
                    </option>
                  ))}
                </Select>
              </div>

              {typing ? (
                <div className="form-field max-w-sm">
                  <label htmlFor="fraud-key-token" className="field-label">
                    {t("tokenLabel")}
                  </label>
                  <Input
                    id="fraud-key-token"
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    value={token}
                    onChange={(e) => onToken(e.target.value)}
                    aria-invalid={tokenInvalid ? true : undefined}
                  />
                  <p className={tokenInvalid ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                    {tokenInvalid ? t("tokenInvalid") : t("tokenHint", { provider: providerName })}
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-ui border border-border bg-muted/30 px-4 py-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm text-foreground">
                      {t("tokenSaved")} <span className="font-mono tracking-wider text-muted-foreground">••••</span>
                      <span className="font-mono">{saved.tokenLast4}</span>
                    </p>
                    <p
                      className={cn(
                        "text-xs",
                        saved.state === "working" && "text-emerald-700 dark:text-emerald-400",
                        saved.state === "failing" && "text-red-700 dark:text-red-400",
                        saved.state === "untested" && "text-muted-foreground",
                      )}
                    >
                      {t(saved.state === "working" ? "stateWorking" : saved.state === "failing" ? "stateFailing" : "stateUntested")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onTest}>
                      {busy === "test" ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                      {t("test")}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={onChangeToken}>
                      {t("change")}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={onRemove}>
                      {t("remove")}
                    </Button>
                  </div>
                </div>
              )}

              <ul className="list-disc space-y-1 ps-5 text-[12px] leading-relaxed text-muted-foreground">
                {typing ? null : <li>{t("testNote")}</li>}
                <li>{t("noFallback")}</li>
                <li>{t("noLimits")}</li>
                {saved.sharesAnswers ? <li>{t("sharing")}</li> : null}
              </ul>
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              className={`${settingsInvertedButtonClassName} gap-2`}
              disabled={unchanged || (mode === "own" && !saved.hasToken && !token.trim())}
              onClick={onSave}
            >
              {busy === "save" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {t("save")}
            </Button>
          </div>
        </fieldset>
      </SupportReadOnly>
    </div>
  );
}
