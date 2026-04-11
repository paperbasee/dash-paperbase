"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Truck } from "lucide-react";
import api from "@/lib/api";
import { formatAdminApiErrorFromAxios } from "@/lib/admin-api-error";
import { formatDashboardDate } from "@/lib/datetime-display";
import type { Courier, PaginatedResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { notify } from "@/notifications";
import { SettingsActionDialog } from "@/components/settings/SettingsActionDialog";
import { settingsInvertedButtonClassName } from "../SettingsSectionBody";

type ConnectForm = {
  api_key: string;
  secret_key: string;
};

const emptyForm: ConnectForm = {
  api_key: "",
  secret_key: "",
};

type CourierModal = null | "connect";

export default function CourierIntegration() {
  const locale = useLocale();
  const t = useTranslations("settings");
  const confirm = useConfirm();
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<CourierModal>(null);
  const [form, setForm] = useState<ConnectForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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

  function closeConnectModal() {
    setModal(null);
    setForm({ ...emptyForm });
    setError("");
    setSaving(false);
  }

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
      closeConnectModal();
      fetchCouriers();
    } catch (err: unknown) {
      setError(formatAdminApiErrorFromAxios(err, t("courier.saveFailed")));
    } finally {
      setSaving(false);
    }
  }

  function requestDisconnect(publicId: string) {
    void confirm({
      title: t("courier.modalDisconnectTitle"),
      message: t("courier.modalDisconnectDescription"),
      variant: "danger",
      confirmText: t("courier.disconnect"),
      onConfirm: async () => {
        try {
          await api.delete(`admin/couriers/${publicId}/`);
          fetchCouriers();
        } catch (err) {
          console.error(err);
          notify.error(err);
          throw err;
        }
      },
    });
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
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Truck className="size-5 text-muted-foreground" aria-hidden />
          <h3 className="text-lg font-medium text-foreground">{t("courier.heading")}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{t("courier.intro")}</p>
      </div>

      {!loading && modal !== "connect" && couriers.length > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            className={settingsInvertedButtonClassName}
            onClick={() => setModal("connect")}
          >
            {t("add")}
          </Button>
        </div>
      ) : null}

      <SettingsActionDialog
        open={modal === "connect"}
        onOpenChange={(next) => {
          if (!next) closeConnectModal();
        }}
        title={t("courier.modalConnectTitle")}
        description={t("courier.modalConnectDescription")}
      >
        <form onSubmit={handleConnect} className="space-y-3">
          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">{t("courier.apiKey")}</label>
            <Input
              type="password"
              required
              value={form.api_key}
              onChange={(e) => setForm({ ...form, api_key: e.target.value })}
              placeholder={t("courier.apiKeyPlaceholder")}
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">{t("courier.secretKey")}</label>
            <Input
              type="password"
              required
              value={form.secret_key}
              onChange={(e) => setForm({ ...form, secret_key: e.target.value })}
              placeholder={t("courier.secretKeyPlaceholder")}
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
            <Button
              type="submit"
              variant="outline"
              className={settingsInvertedButtonClassName}
              disabled={saving}
            >
              {saving ? t("courier.connecting") : t("courier.connect")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className={settingsInvertedButtonClassName}
              onClick={closeConnectModal}
            >
              {t("cancel")}
            </Button>
          </div>
        </form>
      </SettingsActionDialog>

      {loading ? (
        <div className="flex h-24 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
        </div>
      ) : couriers.length === 0 ? (
        <div className="flex flex-col gap-2 py-2">
          <p className="text-sm text-muted-foreground">{t("courier.empty")}</p>
          {modal !== "connect" ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                className={settingsInvertedButtonClassName}
                onClick={() => setModal("connect")}
              >
                {t("courier.connectCta")}
              </Button>
            </div>
          ) : null}
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
                    <code className="font-mono">{c.api_key_masked || "---"}</code>
                  </span>
                  {c.secret_key_masked ? (
                    <span>
                      {t("courier.secretLabel")}{" "}
                      <code className="font-mono">{c.secret_key_masked}</code>
                    </span>
                  ) : null}
                  <span>
                    {t("courier.connectedOn")} {formatDashboardDate(c.created_at, locale)}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  className={settingsInvertedButtonClassName}
                  disabled={togglingId === c.public_id}
                  onClick={() => handleToggleActive(c)}
                >
                  {togglingId === c.public_id
                    ? t("courier.ellipsis")
                    : c.is_active
                      ? t("courier.deactivate")
                      : t("courier.activate")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => requestDisconnect(c.public_id)}
                  className="border-destructive text-destructive hover:bg-destructive/10"
                >
                  {t("courier.disconnect")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
