"use client";

import { useState, type FormEvent } from "react";
import api from "@/lib/api";
import { useAutoExpire } from "@/hooks/useAutoExpire";

export type SettingsMessage = { type: "success" | "error"; text: string } | null;

interface UseAccountSettingsOptions {
  onSaveSuccess?: () => void;
}

export function useAccountSettings({ onSaveSuccess }: UseAccountSettingsOptions = {}) {
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<SettingsMessage>(null);

  useAutoExpire(message, setMessage);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedName = ownerName.trim();
    const trimmedEmail = ownerEmail.trim();

    if (!trimmedName) {
      setMessage({ type: "error", text: "Please enter the owner name." });
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setMessage({ type: "error", text: "Please enter a valid owner email." });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("owner_name", trimmedName.slice(0, 255));
      formData.append("owner_email", trimmedEmail.slice(0, 254));
      await api.patch("admin/branding/", formData);
      onSaveSuccess?.();
      setMessage({ type: "success", text: "Account settings saved." });
    } catch {
      setMessage({ type: "error", text: "Failed to save account settings." });
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
