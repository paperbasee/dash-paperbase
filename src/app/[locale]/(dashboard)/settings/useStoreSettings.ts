"use client";

import { useState, useRef, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import api from "@/lib/api";
import { isApiHttpError } from "@/lib/api-client";
import {
  accountsFromApi,
  accountsToSave,
  SOCIAL_PLATFORMS,
  type SocialAccount,
} from "@/lib/storeSocialLinks";
import type { AccountProblem } from "./sections/IdentityAccounts";
import { defaultBranding } from "@/context/BrandingContext";
import { notify } from "@/notifications";
import { parseValidation, storeUpdateSchema } from "@/lib/validation";
import { queryClient } from "@/components/QueryProvider";
import { brandingQueryKey } from "@/lib/query-keys";

type SettingsMessage = { type: "success" | "error"; text: string } | null;

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
  const t = useTranslations("settings");
  const [storeName, setStoreName] = useState(defaultBranding.admin_name);
  const [storeType, setStoreType] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [language, setLanguage] = useState<"en" | "bn">("en");
  /** Identity's social accounts, in the merchant's order: the one place they are typed. */
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [accountProblem, setAccountProblem] = useState<AccountProblem | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [clearLogo, setClearLogo] = useState(false);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<SettingsMessage>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function syncFromBranding(branding: {
    admin_name?: string;
    store_type?: string | null;
    contact_email?: string | null;
    phone?: string | null;
    address?: string | null;
    logo_url?: string | null;
    language?: string | null;
    social_links?: unknown;
  }) {
    if (branding.admin_name) setStoreName(branding.admin_name);
    setStoreType(branding.store_type ?? "");
    setContactEmail(branding.contact_email ?? "");
    setPhone(branding.phone ?? "");
    setAddress(branding.address ?? "");
    setLanguage(branding.language === "bn" ? "bn" : "en");
    setAccounts(accountsFromApi(branding.social_links));
    setCurrentLogoUrl(resolveLogoUrl(branding.logo_url ?? null));
  }

  const previewUrl = logoFile ? URL.createObjectURL(logoFile) : currentLogoUrl;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setAccountProblem(null);

    try {
      const validation = parseValidation(storeUpdateSchema, {
        storeName,
        storeType,
        contactEmail,
        phone,
        address,
        language,
      });
      if (!validation.success) {
        const e = validation.errors;
        const text = e.storeName
          ? t("store.validationStoreName")
          : e.storeType
            ? t("store.validationStoreType")
            : e.contactEmail
              ? t("store.validationContactEmail")
              : e.phone
                ? t("store.validationPhone")
                : e.address
                  ? t("store.validationGeneric")
                  : t("store.validationGeneric");
        setMessage({ type: "error", text });
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
      formData.append("language", validation.data.language);
      // Every account, every save, as a list: the API keeps what it is sent, in this order.
      formData.append("social_links", JSON.stringify(accountsToSave(accounts)));

      if (logoFile) formData.append("logo", logoFile);
      if (clearLogo) formData.append("clear_logo", "true");

      await api.patch("admin/branding/", formData);
      await queryClient.invalidateQueries({ queryKey: brandingQueryKey });
      onSaveSuccess?.();

      setLogoFile(null);
      setClearLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";

      notify.success(t("store.saved"));
    } catch (error) {
      setMessage({ type: "error", text: saveProblem(error) });
    } finally {
      setSaving(false);
    }
  }

  /**
   * What a refused save says. An account the API could not read is marked on its own row
   * (`social_links.parse_accounts` names it); anything else is said once, under the form.
   */
  function saveProblem(error: unknown): string {
    const data = isApiHttpError(error) && error.status === 400 ? (error.data as { code?: unknown; platform?: unknown }) : null;
    const code = typeof data?.code === "string" ? data.code : "";
    const platform = SOCIAL_PLATFORMS.find((one) => one === data?.platform);
    if (platform && code === "social_account_unreadable") {
      setAccountProblem({ platform });
      return t("identity.checkAccounts");
    }
    if (code === "social_links_invalid") return t("identity.reload");
    return t("store.saveFailed");
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
    language,
    setLanguage,
    accounts,
    setAccounts,
    accountProblem,
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
