"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { useRateLimitCooldown, extractRateLimitInfo } from "@/hooks/useRateLimitCooldown";
import { notify } from "@/notifications";
import { SettingsSectionBody, settingsSectionSurfaceClassName } from "../SettingsSectionBody";

export default function SecuritySection({ hidden }: { hidden: boolean }) {
  const t = useTranslations("settings");
  const [isEnabled, setIsEnabled] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryRequestLoading, setRecoveryRequestLoading] = useState(false);
  const [recoveryVerifyLoading, setRecoveryVerifyLoading] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [message, setMessage] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [logoutAllDevices, setLogoutAllDevices] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const recoveryCooldown = useRateLimitCooldown();

  useEffect(() => {
    if (hidden) return;
    void loadStatus();
  }, [hidden]);

  async function loadStatus() {
    try {
      const { data } = await api.get<{ is_enabled: boolean }>("auth/2fa/status/");
      setIsEnabled(!!data.is_enabled);
    } catch {
      setMessage(t("security.loadStatusFailed"));
    }
  }

  async function startSetup() {
    setLoading(true);
    setMessage("");
    try {
      const { data } = await api.get<{ qr_code: string; secret: string }>("auth/2fa/setup/");
      setQrCode(data.qr_code);
      setSecret(data.secret);
      setMessage(t("security.setupScanHint"));
    } catch {
      setMessage(t("security.setupStartFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function verifySetup() {
    setLoading(true);
    setMessage("");
    try {
      await api.post("auth/2fa/verify/", { code: setupCode });
      setIsEnabled(true);
      setQrCode("");
      setSecret("");
      setSetupCode("");
      setMessage(t("security.enabledSuccess"));
    } catch {
      setMessage(t("security.invalidOtp"));
    } finally {
      setLoading(false);
    }
  }

  async function requestRecoveryCode() {
    setRecoveryRequestLoading(true);
    setRecoveryMessage("");
    try {
      await api.post("auth/2fa/recovery/request/");
      setRecoveryMessage(t("security.recoverySent"));
    } catch (err: unknown) {
      const info = extractRateLimitInfo(err);
      if (info) {
        recoveryCooldown.startCooldown(info.retryAfter);
        setRecoveryMessage("");
      } else {
        setRecoveryMessage(t("security.recoverySendFailed"));
      }
    } finally {
      setRecoveryRequestLoading(false);
    }
  }

  async function verifyRecoveryAndDisable() {
    setRecoveryVerifyLoading(true);
    setRecoveryMessage("");
    try {
      const { data } = await api.post<{
        is_enabled: boolean;
        detail?: string;
      }>("auth/2fa/recovery/verify/", { code: recoveryCode });
      setIsEnabled(!!data.is_enabled);
      setRecoveryCode("");
      setDisablePassword("");
      setDisableCode("");
      setRecoveryMessage("");
      notify.success(data.detail ?? t("security.toastDisabledDetail"));
    } catch {
      setRecoveryMessage(t("security.recoveryInvalid"));
    } finally {
      setRecoveryVerifyLoading(false);
    }
  }

  async function disable2FA() {
    setLoading(true);
    setMessage("");
    try {
      await api.post("auth/2fa/disable/", {
        password: disablePassword,
        code: disableCode,
      });
      setIsEnabled(false);
      setDisablePassword("");
      setDisableCode("");
      setMessage("");
      notify.success(t("security.toastDisabledEmail"));
    } catch {
      setMessage(t("security.disableFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function changePassword() {
    setPasswordMessage("");
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordMessage(t("security.passwordAllRequired"));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordMessage(t("security.passwordMismatch"));
      return;
    }

    setPasswordLoading(true);
    try {
      const { data } = await api.post<{
        detail?: string;
        access?: string;
        refresh?: string;
      }>("auth/password/change/", {
        old_password: currentPassword,
        new_password: newPassword,
        new_password_confirm: confirmNewPassword,
        logout_all_devices: logoutAllDevices,
      });
      if (logoutAllDevices && data.access && data.refresh) {
        localStorage.setItem("access_token", data.access);
        localStorage.setItem("refresh_token", data.refresh);
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setLogoutAllDevices(false);
      setPasswordMessage(data.detail ?? t("security.passwordChanged"));
    } catch {
      setPasswordMessage(t("security.passwordChangeFailed"));
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <section
      id="panel-security"
      role="tabpanel"
      aria-labelledby="tab-security"
      hidden={hidden}
      className={settingsSectionSurfaceClassName}
    >
      <SettingsSectionBody gap="compact">
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-foreground">{t("security.heading")}</h2>
          <p className="text-sm text-muted-foreground">{t("security.subtitle")}</p>
        </div>

        <div className="space-y-4">
        <div className="space-y-3 rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium text-foreground">{t("security.changePassword")}</h3>
          <p className="text-sm text-muted-foreground">{t("security.changePasswordHint")}</p>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder={t("security.currentPassword")}
            autoComplete="current-password"
          />
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t("security.newPassword")}
            autoComplete="new-password"
          />
          <Input
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            placeholder={t("security.confirmNewPassword")}
            autoComplete="new-password"
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={logoutAllDevices}
              onChange={(e) => setLogoutAllDevices(e.target.checked)}
              className="form-checkbox"
            />
            <span>{t("security.logoutAllDevices")}</span>
          </label>
          <Button type="button" onClick={changePassword} disabled={passwordLoading}>
            {passwordLoading ? t("security.updating") : t("security.updatePassword")}
          </Button>
          {passwordMessage ? (
            <p className="text-sm text-muted-foreground">{passwordMessage}</p>
          ) : null}
        </div>
        <div className="text-sm">
          {t("security.statusLabel")}{" "}
          <span className={isEnabled ? "text-emerald-500" : "text-muted-foreground"}>
            {isEnabled ? t("security.twoFaEnabled") : t("security.twoFaDisabled")}
          </span>
        </div>

        {!isEnabled ? (
          <div className="space-y-3 rounded-lg border border-border p-4">
            <Button type="button" onClick={startSetup} disabled={loading}>
              {t("security.enable2fa")}
            </Button>
            {qrCode ? <img src={qrCode} alt={t("security.qrAlt")} className="h-44 w-44 border border-border" /> : null}
            {secret ? (
              <p className="text-xs text-muted-foreground">
                {t("security.secretOnce")} {secret}
              </p>
            ) : null}
            {qrCode ? (
              <div className="flex gap-2">
                <Input
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value)}
                  placeholder={t("security.otpPlaceholder")}
                />
                <Button type="button" onClick={verifySetup} disabled={loading}>
                  {t("security.verify")}
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3 rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">{t("security.disableHint")}</p>
              <Input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder={t("security.currentPassword")}
              />
              <Input
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                placeholder={t("security.currentOtp")}
              />
              <Button type="button" variant="destructive" onClick={disable2FA} disabled={loading}>
                {t("security.disable2fa")}
              </Button>
            </div>

            <div className="space-y-3 rounded-lg border border-border p-4">
              <h3 className="text-sm font-medium text-foreground">{t("security.recoveryHeading")}</h3>
              <p className="text-sm text-muted-foreground">{t("security.recoveryBody")}</p>
              <Button
                type="button"
                variant="outline"
                onClick={requestRecoveryCode}
                disabled={recoveryRequestLoading || recoveryVerifyLoading || recoveryCooldown.isLimited}
              >
                {recoveryCooldown.isLimited
                  ? t("security.retryIn", { seconds: recoveryCooldown.remaining })
                  : recoveryRequestLoading
                    ? t("security.sending")
                    : t("security.sendRecovery")}
              </Button>
              <div className="space-y-2">
                <Input
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  placeholder={t("security.recoveryPlaceholder")}
                  autoComplete="one-time-code"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={verifyRecoveryAndDisable}
                  disabled={recoveryVerifyLoading || !recoveryCode.trim()}
                >
                  {recoveryVerifyLoading ? t("security.verifying") : t("security.verifyDisable")}
                </Button>
              </div>
              {recoveryMessage ? (
                <p className="text-sm text-muted-foreground">{recoveryMessage}</p>
              ) : null}
            </div>
          </div>
        )}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </div>
      </SettingsSectionBody>
    </section>
  );
}

