"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { isApiHttpError } from "@/lib/api-client";
import { usePermissions } from "@/context/PermissionsContext";
import { useStoreSettingsCurrentQuery } from "@/hooks/useStoreSettingsCurrentQuery";
import { storeSettingsCurrentQueryKey } from "@/lib/query-keys";
import {
  settingsInvertedButtonClassName,
  settingsSectionSurfaceClassName,
} from "../SettingsSectionBody";

// Keep in sync with StoreSettingsSerializer.validate_invoice_terms on the API.
const MAX_LEN = 8000;

type Message = { type: "success" | "error"; text: string } | null;

export default function InvoiceSettingsPanel() {
  const ts = useTranslations("settings.store");
  const queryClient = useQueryClient();
  const { data, isLoading } = useStoreSettingsCurrentQuery();
  const { has } = usePermissions();
  // Reading terms is fine for any staff; persisting requires settings.manage
  // (enforced by the settings PATCH endpoint), so gate the editor to match.
  const canManage = has("settings.manage");

  const [terms, setTerms] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  useEffect(() => {
    setTerms(data?.invoice_terms ?? "");
    setMessage(null);
  }, [data]);

  const dirty = useMemo(
    () => (data ? (data.invoice_terms ?? "") !== terms : false),
    [data, terms],
  );
  const tooLong = terms.length > MAX_LEN;

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.patch("store/settings/current/", { invoice_terms: terms });
      setMessage({ type: "success", text: ts("invoiceTermsSaved") });
      void queryClient.invalidateQueries({ queryKey: storeSettingsCurrentQueryKey });
    } catch (err) {
      let text = ts("invoiceTermsError");
      if (isApiHttpError(err)) {
        const d = err.response?.data as Record<string, unknown> | undefined;
        const v = d?.invoice_terms ?? d?.detail;
        if (typeof v === "string" && v.trim()) text = v;
        else if (Array.isArray(v) && typeof v[0] === "string") text = v[0];
      }
      setMessage({ type: "error", text });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={settingsSectionSurfaceClassName}>
      <div className="space-y-1">
        <h2 className="text-lg font-medium text-foreground">{ts("invoiceTermsHeading")}</h2>
        <p className="text-sm text-muted-foreground">{ts("invoiceTermsDescription")}</p>
      </div>

      <div className="mt-4 space-y-2">
        <label htmlFor="invoice_terms" className="text-sm font-medium text-foreground">
          {ts("invoiceTermsLabel")}
        </label>
        <Textarea
          id="invoice_terms"
          rows={6}
          value={terms}
          disabled={isLoading || saving || !canManage}
          placeholder={ts("invoiceTermsPlaceholder")}
          onChange={(e) => setTerms(e.target.value)}
          aria-invalid={tooLong || undefined}
        />
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">{ts("invoiceTermsHint")}</p>
          <p className={tooLong ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
            {terms.length}/{MAX_LEN}
          </p>
        </div>

        {message && (
          <p
            className={
              message.type === "success"
                ? "text-sm text-green-600"
                : "text-sm text-destructive"
            }
            role={message.type === "error" ? "alert" : undefined}
          >
            {message.text}
          </p>
        )}

        {canManage && (
          <Button
            type="button"
            variant="outline"
            className={`${settingsInvertedButtonClassName} gap-2`}
            disabled={saving || !dirty || tooLong}
            onClick={() => void handleSave()}
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            {ts("invoiceTermsSave")}
          </Button>
        )}
      </div>
    </section>
  );
}
