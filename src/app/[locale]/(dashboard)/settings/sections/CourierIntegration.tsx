"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Truck, Plus, X } from "lucide-react";
import api from "@/lib/api";
import { formatAdminApiErrorFromAxios } from "@/lib/admin-api-error";
import { formatDashboardDate } from "@/lib/datetime-display";
import type { Courier, PaginatedResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notify } from "@/notifications";

type ConnectForm = {
  api_key: string;
  secret_key: string;
};

const emptyForm: ConnectForm = {
  api_key: "",
  secret_key: "",
};

export default function CourierIntegration() {
  const locale = useLocale();
  const t = useTranslations("settings");
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ConnectForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchCouriers = useCallback(() => {
    setLoading(true);
    api
      .get<PaginatedResponse<Courier> | Courier[]>("admin/couriers/")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data.results;
        setCouriers(list ?? []);
      })
      .catch((err) => {
        console.error(err);
        notify.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCouriers();
  }, [fetchCouriers]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const payload = {
      provider: "steadfast" as const,
      api_key: form.api_key.trim(),
      secret_key: form.secret_key.trim(),
      is_active: true,
    };
    try {
      await api.post("admin/couriers/", payload);
      setShowForm(false);
      setForm({ ...emptyForm });
      fetchCouriers();
    } catch (err: unknown) {
      setError(formatAdminApiErrorFromAxios(err, t("courier.saveFailed")));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(publicId: string) {
    const ok = await notify.confirm({ title: t("courier.confirmDisconnect"), level: "destructive" });
    if (!ok) return;
    setDeletingId(publicId);
    try {
      await api.delete(`admin/couriers/${publicId}/`);
      fetchCouriers();
    } catch (err) {
      console.error(err);
      notify.error(err);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleActive(courier: Courier) {
    setTogglingId(courier.public_id);
    try {
      await api.patch(`admin/couriers/${courier.public_id}/`, {
        is_active: !courier.is_active,
      });
      fetchCouriers();
    } catch (err) {
      console.error(err);
      notify.error(err);
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 md:p-5">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="size-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">{t("courier.heading")}</h3>
        </div>
        {!showForm && couriers.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm(true)}
            className="text-xs"
          >
            <Plus className="mr-1 size-3.5" />
            {t("add")}
          </Button>
        )}
      </div>
      <p className="mb-4 text-xs text-muted-foreground">{t("courier.intro")}</p>

      {showForm && (
        <div className="mb-4 rounded-lg border border-border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{t("courier.connectTitle")}</span>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <form onSubmit={handleConnect} className="max-w-md space-y-3">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">{t("courier.apiKey")}</label>
              <Input
                type="password"
                required
                value={form.api_key}
                onChange={(e) =>
                  setForm({ ...form, api_key: e.target.value })
                }
                placeholder={t("courier.apiKeyPlaceholder")}
                className="max-w-md"
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">{t("courier.secretKey")}</label>
              <Input
                type="password"
                required
                value={form.secret_key}
                onChange={(e) =>
                  setForm({ ...form, secret_key: e.target.value })
                }
                placeholder={t("courier.secretKeyPlaceholder")}
                className="max-w-md"
                autoComplete="off"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? t("courier.connecting") : t("courier.connect")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
              >
                {t("cancel")}
              </Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex h-24 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
        </div>
      ) : couriers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <p className="text-sm text-muted-foreground">{t("courier.empty")}</p>
          {!showForm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(true)}
              className="text-xs"
            >
              <Plus className="mr-1 size-3.5" />
              {t("courier.connectCta")}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {couriers.map((c) => (
            <div
              key={c.public_id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium capitalize text-foreground">{t("courier.providerName")}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.is_active
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {c.is_active ? t("active") : t("inactive")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                  <span>
                    {t("courier.apiKeyLabel")}{" "}
                    <code className="font-mono">
                      {c.api_key_masked || "---"}
                    </code>
                  </span>
                  {c.secret_key_masked && (
                    <span>
                      {t("courier.secretLabel")}{" "}
                      <code className="font-mono">{c.secret_key_masked}</code>
                    </span>
                  )}
                  <span>
                    {t("courier.connectedOn")} {formatDashboardDate(c.created_at, locale)}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={togglingId === c.public_id}
                  onClick={() => handleToggleActive(c)}
                  className="text-xs"
                >
                  {togglingId === c.public_id
                    ? t("courier.ellipsis")
                    : c.is_active
                      ? t("courier.deactivate")
                      : t("courier.activate")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={deletingId === c.public_id}
                  onClick={() => handleDelete(c.public_id)}
                  className="border-destructive text-xs text-destructive hover:bg-destructive/10"
                >
                  {deletingId === c.public_id ? t("courier.removing") : t("courier.disconnect")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
