"use client";

import { useState, useRef, type FormEvent } from "react";
import api from "@/lib/api";
import { defaultBranding } from "@/context/BrandingContext";
import { useAutoExpire } from "@/hooks/useAutoExpire";
import type { SettingsMessage } from "./useAccountSettings";
import { parseValidation, storeUpdateSchema } from "@/lib/validation";

function resolveLogoUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  return base
    ? `${base.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}`
    : url;
}

interface UseStoreSettingsOptions {
  onSaveSuccess?: () => void;
}

export function useStoreSettings({ onSaveSuccess }: UseStoreSettingsOptions = {}) {
  const [storeName, setStoreName] = useState(defaultBranding.admin_name);
  const [storeType, setStoreType] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [clearLogo, setClearLogo] = useState(false);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<SettingsMessage>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useAutoExpire(message, setMessage);

  function syncFromBranding(branding: {
    admin_name?: string;
    store_type?: string | null;
    contact_email?: string | null;
    phone?: string | null;
    address?: string | null;
    logo_url?: string | null;
  }) {
    if (branding.admin_name) setStoreName(branding.admin_name);
    setStoreType(branding.store_type ?? "");
    setContactEmail(branding.contact_email ?? "");
    setPhone(branding.phone ?? "");
    setAddress(branding.address ?? "");
    setCurrentLogoUrl(resolveLogoUrl(branding.logo_url ?? null));
  }

  const previewUrl = logoFile ? URL.createObjectURL(logoFile) : currentLogoUrl;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const validation = parseValidation(storeUpdateSchema, {
        storeName,
        storeType,
        contactEmail,
        phone,
        address,
      });
      if (!validation.success) {
        setMessage({
          type: "error",
          text:
            validation.errors.storeName ??
            validation.errors.storeType ??
            validation.errors.contactEmail ??
            validation.errors.phone ??
            validation.errors.address ??
            "Please correct the highlighted fields.",
        });
        return;
      }

      const formData = new FormData();
      formData.append(
        "admin_name",
        validation.data.storeName || defaultBranding.admin_name
      );
      formData.append("store_type", validation.data.storeType);
      formData.append("contact_email", validation.data.contactEmail);
      formData.append("phone", validation.data.phone.slice(0, 50));
      formData.append("address", validation.data.address);

      if (logoFile) formData.append("logo", logoFile);
      if (clearLogo) formData.append("clear_logo", "true");

      await api.patch("admin/branding/", formData);
      onSaveSuccess?.();

      setLogoFile(null);
      setClearLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";

      setMessage({ type: "success", text: "Store settings saved." });
    } catch {
      setMessage({ type: "error", text: "Failed to save store settings." });
    } finally {
      setSaving(false);
    }
  }

  return {
    storeName,
    setStoreName,
    storeType,
    setStoreType,
    contactEmail,
    setContactEmail,
    phone,
    setPhone,
    address,
    setAddress,
    logoFile,
    setLogoFile,
    clearLogo,
    setClearLogo,
    currentLogoUrl,
    previewUrl,
    fileInputRef,
    saving,
    message,
    syncFromBranding,
    handleSubmit,
  };
}
