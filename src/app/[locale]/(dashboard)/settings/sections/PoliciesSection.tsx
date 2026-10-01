"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePermissions } from "@/context/PermissionsContext";
import { useConfirm } from "@/context/ConfirmDialogContext";
import {
  COMMON_POLICY_KINDS,
  policyPath,
  usePoliciesQuery,
  type Policy,
  type PolicyKind,
} from "@/hooks/usePoliciesQuery";
import api from "@/lib/api";
import { isApiHttpError } from "@/lib/api-client";
import { policiesQueryKey } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { notify } from "@/notifications";
import { SettingsSectionBody, settingsSectionSurfaceClassName } from "../SettingsSectionBody";

/*
 * Settings -> Policies (owner, 2026-09-25).
 *
 * A merchant writes their shop's policies here. Nothing reaches the shop by being
 * written: a policy shows where the merchant links it (a column of the footer, in
 * the theme editor), and every WRITTEN policy is listed beside the footer's year
 * and at checkout. A policy with a title and no words is kept as a draft and is
 * nowhere on the shop -- the list says so beside it.
 *
 * The four common kinds start from a button that fills in the title only (the
 * owner's choice): it saves typing, and the merchant still writes every word.
 * The body is the blog's box -- plain text, or the HTML the blog keeps.
 */

const KIND_WORDS: Record<Exclude<PolicyKind, "other">, string> = {
  privacy: "policiesKindPrivacy",
  terms: "policiesKindTerms",
  shipping: "policiesKindShipping",
  returns: "policiesKindReturns",
};

type Draft = { public_id?: string; kind: PolicyKind; title: string; content: string };
type Errors = { title?: string; kind?: string; content?: string; detail?: string };

function errorsFrom(err: unknown): Errors {
  if (!isApiHttpError(err)) return {};
  const data = (err.response?.data ?? {}) as Record<string, unknown>;
  const first = (value: unknown) =>
    typeof value === "string" ? value : Array.isArray(value) && typeof value[0] === "string" ? value[0] : undefined;
  return {
    title: first(data.title),
    kind: first(data.kind),
    content: first(data.content),
    detail: first(data.detail) ?? first(data.non_field_errors),
  };
}

export default function PoliciesSection({ hidden }: { hidden: boolean }) {
  const t = useTranslations("settings");
  const { has } = usePermissions();
  const canManage = has("settings.manage");
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const policies = usePoliciesQuery(!hidden);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const list = policies.data ?? [];
  const held = new Set(list.map((policy) => policy.kind));
  const startable = COMMON_POLICY_KINDS.filter((kind) => !held.has(kind));

  const open = (next: Draft) => {
    setErrors({});
    setDraft(next);
  };

  async function save() {
    if (!draft) return;
    setSaving(true);
    setErrors({});
    try {
      const body = { kind: draft.kind, title: draft.title, content: draft.content };
      if (draft.public_id) await api.patch(`admin/policies/${draft.public_id}/`, body);
      else await api.post("admin/policies/", body);
      await queryClient.invalidateQueries({ queryKey: policiesQueryKey });
      setDraft(null);
    } catch (err) {
      const found = errorsFrom(err);
      setErrors(found);
      if (!found.title && !found.kind && !found.content && !found.detail) {
        notify.error(err, { title: t("policiesSaveFailed"), fallbackMessage: t("policiesSaveFailed") });
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove(policy: Policy) {
    const ok = await confirm({
      title: t("policiesConfirmDeleteTitle"),
      message: t("policiesConfirmDeleteMessage", { title: policy.title }),
      variant: "danger",
    });
    if (!ok) return;
    setBusy(policy.public_id);
    try {
      await api.delete(`admin/policies/${policy.public_id}/`);
      await queryClient.invalidateQueries({ queryKey: policiesQueryKey });
    } catch (err) {
      notify.error(err, { title: t("policiesDeleteFailed"), fallbackMessage: t("policiesDeleteFailed") });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section
      id="panel-policies"
      role="tabpanel"
      aria-labelledby="tab-policies"
      hidden={hidden}
      className={settingsSectionSurfaceClassName}
    >
      <SettingsSectionBody>
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-foreground">{t("policiesTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("policiesIntro")}</p>
          {!canManage ? <p className="text-sm text-muted-foreground">{t("policiesReadOnly")}</p> : null}
        </div>

        {policies.isPending ? (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t("policiesLoading")}
          </p>
        ) : policies.isError ? (
          <p className="text-sm text-destructive">{t("policiesLoadFailed")}</p>
        ) : draft ? (
          <div className="space-y-4 rounded-sm border border-border p-4">
            <FormField label={t("policiesFieldTitle")} htmlFor="policy-title" error={errors.title ?? errors.kind}>
              <Input
                id="policy-title"
                value={draft.title}
                maxLength={120}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                aria-invalid={!!(errors.title ?? errors.kind)}
              />
            </FormField>
            <FormField
              label={t("policiesFieldBody")}
              htmlFor="policy-content"
              hint={t("policiesBodyHint")}
              error={errors.content}
            >
              <Textarea
                id="policy-content"
                rows={16}
                value={draft.content}
                placeholder={t("policiesBodyPlaceholder")}
                onChange={(event) => setDraft({ ...draft, content: event.target.value })}
                className="[field-sizing:fixed] h-80 resize-y overflow-y-auto text-sm"
              />
            </FormField>
            {errors.detail ? <p className="text-sm text-destructive">{errors.detail}</p> : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={() => setDraft(null)} disabled={saving}>
                {t("cancel")}
              </Button>
              <Button type="button" className="h-11 sm:h-9" onClick={save} disabled={saving || !draft.title.trim()}>
                {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                {saving ? t("saving") : t("save")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {canManage && startable.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">{t("policiesQuickAdd")}</p>
                <div className="flex flex-wrap gap-2">
                  {startable.map((kind) => (
                    <Button
                      key={kind}
                      type="button"
                      variant="outline"
                      className="h-11 md:h-9"
                      onClick={() => open({ kind, title: t(KIND_WORDS[kind]), content: "" })}
                    >
                      <Plus aria-hidden />
                      {t(KIND_WORDS[kind])}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("policiesEmpty")}</p>
            ) : (
              <ul className="divide-y divide-border rounded-sm border border-border">
                {list.map((policy) => (
                  <li key={policy.public_id} className="flex flex-wrap items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{policy.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5",
                            policy.is_written
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {policy.is_written ? t("policiesWritten") : t("policiesNotWritten")}
                        </span>
                        <span className="font-mono">{policyPath(policy)}</span>
                      </p>
                    </div>
                    {canManage ? (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-11 md:h-9"
                          onClick={() =>
                            open({
                              public_id: policy.public_id,
                              kind: policy.kind,
                              title: policy.title,
                              content: policy.content,
                            })
                          }
                        >
                          <Pencil aria-hidden />
                          {t("policiesEdit")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-11 md:size-9"
                          aria-label={t("policiesDeleteNamed", { title: policy.title })}
                          disabled={busy === policy.public_id}
                          onClick={() => remove(policy)}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            {canManage ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full md:h-9 md:w-auto"
                onClick={() => open({ kind: "other", title: "", content: "" })}
              >
                <Plus aria-hidden />
                {t("policiesAdd")}
              </Button>
            ) : null}
          </div>
        )}
      </SettingsSectionBody>
    </section>
  );
}
