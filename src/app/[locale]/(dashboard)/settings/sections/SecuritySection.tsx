"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { SettingsActionDialog } from "@/components/settings/SettingsActionDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { useRateLimitCooldown, extractRateLimitInfo } from "@/hooks/useRateLimitCooldown";
import { notify } from "@/notifications";
import { cn } from "@/lib/utils";
import {
  SettingsSectionBody,
  settingsInvertedButtonClassName,
  settingsSectionSurfaceClassName,
} from "../SettingsSectionBody";

type SecurityModal = "password" | "enable" | "disable" | "recovery" | null;

export default function SecuritySection({ hidden }: { hidden: boolean }) {
  const t = useTranslations("settings");
  const [openModal, setOpenModal] = useState<SecurityModal>(null);
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
  const [statusLoadError, setStatusLoadError] = useState("");
  const [enableModalMessage, setEnableModalMessage] = useState("");
  const [disableModalMessage, setDisableModalMessage] = useState("");
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

  function clearPasswordModal() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setLogoutAllDevices(false);
    setPasswordMessage("");
    setPasswordLoading(false);
  }

  function clearEnableModal() {
    setQrCode("");
    setSecret("");
    setSetupCode("");
    setEnableModalMessage("");
    setLoading(false);
  }

  function clearDisableModal() {
    setDisablePassword("");
    setDisableCode("");
    setDisableModalMessage("");
    setLoading(false);
  }

  function clearRecoveryModal() {
    setRecoveryCode("");
    setRecoveryMessage("");
    setRecoveryRequestLoading(false);
    setRecoveryVerifyLoading(false);
  }

  async function loadStatus() {
    try {
      const { data } = await api.get<{ is_enabled: boolean }>("auth/2fa/status/");
      setIsEnabled(!!data.is_enabled);
      setStatusLoadError("");
    } catch {
      setStatusLoadError(t("security.loadStatusFailed"));
    }
  }

  async function startSetup() {
    setLoading(true);
    setEnableModalMessage("");
    try {
      const { data } = await api.get<{ qr_code: string; secret: string }>("auth/2fa/setup/");
      setQrCode(data.qr_code);
      setSecret(data.secret);
      setEnableModalMessage(t("security.setupScanHint"));
    } catch {
      setEnableModalMessage(t("security.setupStartFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function verifySetup() {
    setLoading(true);
    setEnableModalMessage("");
    try {
      await api.post("auth/2fa/verify/", { code: setupCode });
      setIsEnabled(true);
      setQrCode("");
      setSecret("");
      setSetupCode("");
      setOpenModal(null);
      notify.success(t("security.enabledSuccess"));
    } catch {
      setEnableModalMessage(t("security.invalidOtp"));
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
      setOpenModal(null);
      notify.success(data.detail ?? t("security.toastDisabledDetail"));
    } catch {
      setRecoveryMessage(t("security.recoveryInvalid"));
    } finally {
      setRecoveryVerifyLoading(false);
    }
  }

  async function disable2FA() {
    setLoading(true);
    setDisableModalMessage("");
    try {
      await api.post("auth/2fa/disable/", {
        password: disablePassword,
        code: disableCode,
      });
      setIsEnabled(false);
      setDisablePassword("");
      setDisableCode("");
      setOpenModal(null);
      notify.success(t("security.toastDisabledEmail"));
    } catch {
      setDisableModalMessage(t("security.disableFailed"));
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
      clearPasswordModal();
      setOpenModal(null);
      notify.success(data.detail ?? t("security.passwordChanged"));
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
          <div className="text-sm">
            <span className="text-muted-foreground">{t("security.twoFactorLabel")}: </span>
            <span className={isEnabled ? "text-emerald-500" : "text-muted-foreground"}>
              {isEnabled ? t("security.twoFactorOn") : t("security.twoFactorOff")}
            </span>
          </div>
          {statusLoadError ? (
            <p className="text-sm text-destructive" role="alert">
              {statusLoadError}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              variant="outline"
              className={settingsInvertedButtonClassName}
              onClick={() => setOpenModal("password")}
            >
              {t("security.changePassword")}
            </Button>
            {!isEnabled ? (
              <Button
                type="button"
                variant="outline"
                className={settingsInvertedButtonClassName}
                onClick={() => setOpenModal("enable")}
              >
                {t("security.enable2fa")}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className={settingsInvertedButtonClassName}
                  onClick={() => setOpenModal("disable")}
                >
                  {t("security.disable2fa")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={settingsInvertedButtonClassName}
                  onClick={() => setOpenModal("recovery")}
                >
                  {t("security.recoveryHeading")}
                </Button>
              </>
            )}
          </div>
        </div>
      </SettingsSectionBody>

      <SettingsActionDialog
        open={openModal === "password"}
        onOpenChange={(next) => {
          if (!next) {
            setOpenModal(null);
            clearPasswordModal();
          }
        }}
        title={t("security.modalChangePasswordTitle")}
        description={t("security.modalChangePasswordDescription")}
      >
        <div className="space-y-3">
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
          {passwordMessage ? (
            <p className="text-sm text-muted-foreground" role="status">
              {passwordMessage}
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className={cn("w-full sm:w-auto", settingsInvertedButtonClassName)}
            onClick={changePassword}
            disabled={passwordLoading}
          >
            {passwordLoading ? t("security.updating") : t("security.updatePassword")}
          </Button>
        </div>
      </SettingsActionDialog>

      <SettingsActionDialog
        open={openModal === "enable"}
        onOpenChange={(next) => {
          if (!next) {
            setOpenModal(null);
            clearEnableModal();
          }
        }}
        title={t("security.modalEnable2faTitle")}
        description={t("security.modalEnable2faDescription")}
      >
        <div className="space-y-4">
          {!qrCode ? (
            <>
              <p className="text-sm text-muted-foreground">{t("security.modalEnable2faStartHint")}</p>
              <Button
                type="button"
                variant="outline"
                className={settingsInvertedButtonClassName}
                onClick={startSetup}
                disabled={loading}
              >
                {t("security.enable2fa")}
              </Button>
            </>
          ) : (
            <>
              <img
                src={qrCode}
                alt={t("security.qrAlt")}
                className="mx-auto h-44 w-44 border border-border"
              />
              {secret ? (
                <p className="break-all text-xs text-muted-foreground">
                  {t("security.secretOnce")} {secret}
                </p>
              ) : null}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  className="min-w-0 flex-1"
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value)}
                  placeholder={t("security.otpPlaceholder")}
                  autoComplete="one-time-code"
                />
                <Button
                  type="button"
                  variant="outline"
                  className={cn("shrink-0", settingsInvertedButtonClassName)}
                  onClick={verifySetup}
                  disabled={loading}
                >
                  {t("security.verify")}
                </Button>
              </div>
            </>
          )}
          {enableModalMessage ? (
            <p className="text-sm text-muted-foreground" role="status">
              {enableModalMessage}
            </p>
          ) : null}
        </div>
      </SettingsActionDialog>

      <SettingsActionDialog
        open={openModal === "disable"}
        onOpenChange={(next) => {
          if (!next) {
            setOpenModal(null);
            clearDisableModal();
          }
        }}
        title={t("security.modalDisable2faTitle")}
        description={t("security.disableHint")}
      >
        <div className="space-y-3">
          <Input
            type="password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            placeholder={t("security.currentPassword")}
            autoComplete="current-password"
          />
          <Input
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value)}
            placeholder={t("security.currentOtp")}
            autoComplete="one-time-code"
          />
          {disableModalMessage ? (
            <p className="text-sm text-destructive" role="alert">
              {disableModalMessage}
            </p>
          ) : null}
          <Button type="button" variant="destructive" onClick={disable2FA} disabled={loading}>
            {t("security.disable2fa")}
          </Button>
        </div>
      </SettingsActionDialog>

      <SettingsActionDialog
        open={openModal === "recovery"}
        onOpenChange={(next) => {
          if (!next) {
            setOpenModal(null);
            clearRecoveryModal();
          }
        }}
        title={t("security.modalRecoveryTitle")}
        description={t("security.modalRecoveryDescription")}
      >
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className={cn("w-full sm:w-auto", settingsInvertedButtonClassName)}
            onClick={requestRecoveryCode}
            disabled={recoveryRequestLoading || recoveryVerifyLoading || recoveryCooldown.isLimited}
          >
            {recoveryCooldown.isLimited
              ? t("security.retryIn", { seconds: recoveryCooldown.remaining })
              : recoveryRequestLoading
                ? t("security.sending")
                : t("security.sendRecovery")}
          </Button>
          <Input
            value={recoveryCode}
            onChange={(e) => setRecoveryCode(e.target.value)}
            placeholder={t("security.recoveryPlaceholder")}
            autoComplete="one-time-code"
          />
          <Button
            type="button"
            variant="outline"
            className={cn("w-full sm:w-auto", settingsInvertedButtonClassName)}
            onClick={verifyRecoveryAndDisable}
            disabled={recoveryVerifyLoading || !recoveryCode.trim()}
          >
            {recoveryVerifyLoading ? t("security.verifying") : t("security.verifyDisable")}
          </Button>
          {recoveryMessage ? (
            <p className="text-sm text-muted-foreground" role="status">
              {recoveryMessage}
            </p>
          ) : null}
        </div>
      </SettingsActionDialog>
    </section>
  );
}
