"use client";

import { useState, useRef, useEffect } from "react";
import api from "@/lib/api";
import { useBranding, defaultBranding } from "@/context/BrandingContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function logoUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  return base ? `${base.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}` : url;
}

const NOTIFICATION_PREFS_KEY = "gadzillabd_notification_prefs";

type NotificationPrefs = {
  orders: boolean;
  carts: boolean;
  wishlist: boolean;
  contacts: boolean;
};

const defaultPrefs: NotificationPrefs = {
  orders: true,
  carts: true,
  wishlist: true,
  contacts: true,
};

export default function AccountPage() {
  const { branding, isLoading, refetch } = useBranding();
  const [adminName, setAdminName] = useState(defaultBranding.admin_name);
  const [adminSubtitle, setAdminSubtitle] = useState(defaultBranding.admin_subtitle);
  const [currencySymbol, setCurrencySymbol] = useState(defaultBranding.currency_symbol);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [clearLogo, setClearLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(defaultPrefs);

  useEffect(() => {
    if (branding) {
      setAdminName(branding.admin_name);
      setAdminSubtitle(branding.admin_subtitle);
      setCurrencySymbol(branding.currency_symbol ?? defaultBranding.currency_symbol);
    }
  }, [branding]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(NOTIFICATION_PREFS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
      setNotificationPrefs({ ...defaultPrefs, ...parsed });
    } catch {
      // ignore and keep defaults
    }
  }, []);

  function updateNotificationPref(key: keyof NotificationPrefs, value: boolean) {
    setNotificationPrefs((prev) => {
      const next = { ...prev, [key]: value };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(next));
      }
      return next;
    });
  }

  const currentLogoUrl = logoUrl(branding?.logo_url ?? null);
  const previewUrl = logoFile ? URL.createObjectURL(logoFile) : currentLogoUrl;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("admin_name", adminName || defaultBranding.admin_name);
      formData.append("admin_subtitle", adminSubtitle || defaultBranding.admin_subtitle);
      formData.append(
        "currency_symbol",
        (currencySymbol || defaultBranding.currency_symbol).trim().slice(0, 10)
      );
      if (logoFile) formData.append("logo", logoFile);
      if (clearLogo) formData.append("clear_logo", "true");

      await api.patch("/api/admin/branding/", formData);
      await refetch();
      setLogoFile(null);
      setClearLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setMessage({ type: "success", text: "Branding saved." });
    } catch {
      setMessage({ type: "error", text: "Failed to save branding." });
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-medium text-foreground">Account</h1>
      <p className="text-muted-foreground">
        Manage your account branding and notification preferences for the admin dashboard.
      </p>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
        {/* Logo */}
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Logo
          </label>
          <div className="flex flex-wrap items-center gap-4">
            {previewUrl && !clearLogo ? (
              <div className="relative size-20 overflow-hidden rounded-full border border-border bg-muted">
                <img src={previewUrl} alt="Logo preview" className="size-full object-cover" />
              </div>
            ) : (
              <div className="flex size-20 items-center justify-center rounded-full border border-dashed border-border bg-muted text-muted-foreground">
                No logo
              </div>
            )}
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="text-sm file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setLogoFile(f || null);
                  if (f) setClearLogo(false);
                }}
              />
              {currentLogoUrl && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={clearLogo}
                    onChange={(e) => {
                      setClearLogo(e.target.checked);
                      if (e.target.checked) setLogoFile(null);
                    }}
                  />
                  Remove logo
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="admin_name" className="text-sm font-medium leading-normal text-foreground">
            Admin name
          </label>
          <Input
            id="admin_name"
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            placeholder="e.g. Gadzilla"
            className="w-full max-w-md"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="admin_subtitle"
            className="text-sm font-medium leading-normal text-foreground"
          >
            Admin subtitle
          </label>
          <Input
            id="admin_subtitle"
            value={adminSubtitle}
            onChange={(e) => setAdminSubtitle(e.target.value)}
            placeholder="e.g. Admin dashboard"
            className="w-full max-w-md"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="currency_symbol"
            className="text-sm font-medium leading-normal text-foreground"
          >
            Currency symbol
          </label>
          <Input
            id="currency_symbol"
            value={currencySymbol}
            onChange={(e) => setCurrencySymbol(e.target.value)}
            placeholder="e.g. ৳, $, €"
            className="w-full max-w-[8rem]"
            maxLength={10}
          />
          <p className="text-xs text-muted-foreground">
            Used in front of all prices across the dashboard (orders, products, etc.).
          </p>
        </div>

        {message && (
          <p
            className={
              message.type === "success" ? "text-sm text-green-600" : "text-sm text-destructive"
            }
          >
            {message.text}
          </p>
        )}

        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save account settings"}
        </Button>
      </form>

      <div className="max-w-xl space-y-4 border-t border-border pt-6">
        <h2 className="text-lg font-medium text-foreground">Notification preferences</h2>
        <p className="text-sm text-muted-foreground">
          Choose which events should generate notifications in the top bar.
        </p>
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-4 text-sm">
            <span className="text-foreground">Orders</span>
            <input
              type="checkbox"
              checked={notificationPrefs.orders}
              onChange={(e) => updateNotificationPref("orders", e.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between gap-4 text-sm">
            <span className="text-foreground">Cart items</span>
            <input
              type="checkbox"
              checked={notificationPrefs.carts}
              onChange={(e) => updateNotificationPref("carts", e.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between gap-4 text-sm">
            <span className="text-foreground">Wishlist items</span>
            <input
              type="checkbox"
              checked={notificationPrefs.wishlist}
              onChange={(e) => updateNotificationPref("wishlist", e.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between gap-4 text-sm">
            <span className="text-foreground">Contact form submissions</span>
            <input
              type="checkbox"
              checked={notificationPrefs.contacts}
              onChange={(e) => updateNotificationPref("contacts", e.target.checked)}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

