"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import api from "@/lib/api";
import { useAutoExpire } from "@/hooks/useAutoExpire";
import { accountSettingsSchema, parseValidation } from "@/lib/validation";
import { mutate } from "swr";
import { BRANDING_PROFILE_SWR_KEY } from "@/hooks/useBrandingProfileSWR";

export type SettingsMessage = { type: "success" | "error"; text: string } | null;

interface UseAccountSettingsOptions {
  onSaveSuccess?: () => void;
}

export function useAccountSettings({ onSaveSuccess }: UseAccountSettingsOptions = {}) {
  const t = useTranslations("settings");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<SettingsMessage>(null);

  useAutoExpire(message, setMessage);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validation = parseValidation(accountSettingsSchema, {
      ownerName,
    });
    if (!validation.success) {
      setMessage({
        type: "error",
        text: validation.errors.ownerName
          ? t("account.validationOwnerName")
          : t("account.validationGeneric"),
      });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("owner_name", validation.data.ownerName.slice(0, 255));
      await api.patch("admin/branding/", formData);
      await mutate(BRANDING_PROFILE_SWR_KEY);
      onSaveSuccess?.();
      setMessage({ type: "success", text: t("account.saved") });
    } catch {
      setMessage({ type: "error", text: t("account.saveFailed") });
    } finally {
      setSaving(false);
    }
  }

  return {
    ownerName,
    setOwnerName,
    ownerEmail,
    setOwnerEmail,
    saving,
    message,
    handleSubmit,
  };
}
