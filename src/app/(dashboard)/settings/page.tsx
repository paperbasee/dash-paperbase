"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Undo2,
  User,
  Store,
  Plug,
  Network,
  Bell,
  Shield,
  CreditCard,
  Database,
  ChevronDown,
  Layers,
  LayoutGrid,
  Cloud,
  Copy,
  Pencil,
  Trash2,
  Zap,
  Plus,
  Facebook,
  Save,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import api from "@/lib/api";
import { useBranding, defaultBranding } from "@/context/BrandingContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useEnabledApps } from "@/hooks/useEnabledApps";
import { APP_CONFIG, ESSENTIAL_APP_IDS, OPTIONAL_APP_IDS } from "@/config/apps";
import { DynamicFieldsPanel } from "@/components/DynamicFieldsPanel";

type SettingsSection =
  | "account"
  | "store"
  | "eav"
  | "apps"
  | "integrations"
  | "networking"
  | "notifications"
  | "security"
  | "billing"
  | "data";

const SECTIONS: { id: SettingsSection; label: string; icon: LucideIcon }[] = [
  { id: "store", label: "Store Info", icon: Store },
  { id: "eav", label: "Dynamic Fields", icon: Layers },
  { id: "apps", label: "Apps", icon: LayoutGrid },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "networking", label: "Networking", icon: Network },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "account", label: "Account", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "data", label: "Data & Export", icon: Database },
];

function logoUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  return base ? `${base.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}` : url;
}

const NOTIFICATION_PREFS_KEY = "gadzillabd_notification_prefs";
const FACEBOOK_CAPI_KEY = "gadzillabd_facebook_capi";

type NotificationPrefs = {
  orders: boolean;
  carts: boolean;
  wishlist: boolean;
  contacts: boolean;
  emailMeOnOrderReceived: boolean;
  emailCustomerOnOrderConfirmed: boolean;
};

const defaultPrefs: NotificationPrefs = {
  orders: true,
  carts: true,
  wishlist: true,
  contacts: true,
  emailMeOnOrderReceived: true,
  emailCustomerOnOrderConfirmed: true,
};

function SectionNav({
  activeSection,
  onSelect,
  onNavigate,
  className,
  variant = "vertical",
}: {
  activeSection: SettingsSection;
  onSelect: (id: SettingsSection) => void;
  onNavigate?: () => void;
  className?: string;
  variant?: "vertical" | "horizontal";
}) {
  return (
    <nav
      className={cn(
        variant === "vertical" ? "flex flex-col gap-0.5" : "flex flex-row gap-2 flex-nowrap",
        className
      )}
      role="tablist"
      aria-label="Settings sections"
    >
      {SECTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={activeSection === id}
          aria-controls={`panel-${id}`}
          id={`tab-${id}`}
          onClick={() => {
            onSelect(id);
            onNavigate?.();
          }}
          className={cn(
            "flex items-center gap-2 text-sm font-medium transition-colors shrink-0",
            variant === "vertical" && "rounded-lg px-3 py-2.5 text-left",
            variant === "horizontal" && "rounded-none border px-4 py-2.5 text-center text-sm whitespace-nowrap",
            variant === "vertical" &&
              (activeSection === id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"),
            variant === "horizontal" &&
              (activeSection === id
                ? "border-border bg-foreground text-background"
                : "border-border bg-transparent text-muted-foreground hover:text-foreground")
          )}
        >
          <Icon className="size-4 shrink-0" />
          {label}
        </button>
      ))}
    </nav>
  );
}

function DesktopSectionNav({
  activeSection,
  onSelect,
}: {
  activeSection: SettingsSection;
  onSelect: (id: SettingsSection) => void;
}) {
  return (
    <div className="overflow-x-auto scrollbar-hide scroll-smooth">
      <SectionNav
        activeSection={activeSection}
        onSelect={onSelect}
        variant="horizontal"
      />
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SettingsSection>("store");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const { branding, isLoading, refetch } = useBranding();
  const enabledApps = useEnabledApps();
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [storeName, setStoreName] = useState(defaultBranding.admin_name);
  const [storeType, setStoreType] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [clearLogo, setClearLogo] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [storeSaving, setStoreSaving] = useState(false);
  const [accountMessage, setAccountMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [storeMessage, setStoreMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [dynamicFieldsMessage, setDynamicFieldsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [integrationsMessage, setIntegrationsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [facebookPixelId, setFacebookPixelId] = useState("");
  const [facebookAccessToken, setFacebookAccessToken] = useState("");
  const [integrationsSaving, setIntegrationsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(defaultPrefs);

  useEffect(() => {
    if (branding) {
      setStoreName(branding.admin_name);
      setStoreType(branding.store_type ?? "");
      setContactEmail(branding.contact_email ?? "");
      setPhone(branding.phone ?? "");
      setAddress(branding.address ?? "");
      setOwnerName(branding.owner_name ?? "");
      setOwnerEmail(branding.owner_email ?? "");
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(FACEBOOK_CAPI_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { pixelId?: string; accessToken?: string };
      if (parsed.pixelId) setFacebookPixelId(parsed.pixelId);
      if (parsed.accessToken) setFacebookAccessToken(parsed.accessToken);
    } catch {
      // ignore and keep defaults
    }
  }, []);

  // Auto-dismiss success messages after 2 seconds
  useEffect(() => {
    if (accountMessage?.type === "success") {
      const t = setTimeout(() => setAccountMessage(null), 2000);
      return () => clearTimeout(t);
    }
  }, [accountMessage]);
  useEffect(() => {
    if (storeMessage?.type === "success") {
      const t = setTimeout(() => setStoreMessage(null), 2000);
      return () => clearTimeout(t);
    }
  }, [storeMessage]);
  useEffect(() => {
    if (dynamicFieldsMessage?.type === "success") {
      const t = setTimeout(() => setDynamicFieldsMessage(null), 2000);
      return () => clearTimeout(t);
    }
  }, [dynamicFieldsMessage]);
  useEffect(() => {
    if (integrationsMessage?.type === "success") {
      const t = setTimeout(() => setIntegrationsMessage(null), 2000);
      return () => clearTimeout(t);
    }
  }, [integrationsMessage]);

  function handleFacebookCapiSave() {
    setIntegrationsSaving(true);
    setIntegrationsMessage(null);
    try {
      const config = {
        pixelId: facebookPixelId.trim(),
        accessToken: facebookAccessToken.trim(),
      };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(FACEBOOK_CAPI_KEY, JSON.stringify(config));
      }
      setIntegrationsMessage({ type: "success", text: "Facebook Conversion API settings saved." });
    } catch {
      setIntegrationsMessage({ type: "error", text: "Failed to save." });
    } finally {
      setIntegrationsSaving(false);
    }
  }

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

  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = ownerName.trim();
    const trimmedEmail = ownerEmail.trim();
    if (!trimmedName) {
      setAccountMessage({ type: "error", text: "Please enter the owner name." });
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setAccountMessage({ type: "error", text: "Please enter a valid owner email." });
      return;
    }
    setAccountSaving(true);
    setAccountMessage(null);
    try {
      const formData = new FormData();
      formData.append("owner_name", trimmedName.slice(0, 255));
      formData.append("owner_email", trimmedEmail.slice(0, 254));
      await api.patch("admin/branding/", formData);
      await refetch();
      setAccountMessage({ type: "success", text: "Account settings saved." });
    } catch {
      setAccountMessage({ type: "error", text: "Failed to save account settings." });
    } finally {
      setAccountSaving(false);
    }
  }

  async function handleStoreSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStoreSaving(true);
    setStoreMessage(null);
    try {
      const formData = new FormData();
      formData.append("admin_name", storeName || defaultBranding.admin_name);
      const st = storeType.trim();
      if (st.split(/\s+/).length > 4) {
        setStoreMessage({ type: "error", text: "Store type must be at most 4 words." });
        setStoreSaving(false);
        return;
      }
      formData.append("store_type", st);
      formData.append("contact_email", contactEmail.trim());
      formData.append("phone", phone.trim().slice(0, 50));
      formData.append("address", address.trim());
      if (logoFile) formData.append("logo", logoFile);
      if (clearLogo) formData.append("clear_logo", "true");

      await api.patch("admin/branding/", formData);
      await refetch();
      setLogoFile(null);
      setClearLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setStoreMessage({ type: "success", text: "Store settings saved." });
    } catch {
      setStoreMessage({ type: "error", text: "Failed to save store settings." });
    } finally {
      setStoreSaving(false);
    }
  }

  const activeSectionMeta = SECTIONS.find((s) => s.id === activeSection);
  const activeLabel = activeSectionMeta?.label ?? "Settings";
  const ActiveIcon = activeSectionMeta?.icon;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted/80 px-1 py-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Go back"
              onClick={() => router.back()}
              className="shrink-0"
            >
              <Undo2 className="size-4" />
            </Button>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your control center for store owners. Manage your store identity, products, orders,
              integrations, and more.
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-6">
        {/* Mobile: in-place expandable section picker */}
        <div className="lg:hidden">
          <Collapsible open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between gap-2">
                <span className="flex items-center gap-2">
                  {ActiveIcon && <ActiveIcon className="size-4" />}
                  {activeLabel}
                </span>
                <ChevronDown
                  className={cn("size-4 shrink-0 transition-transform", mobileNavOpen && "rotate-180")}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 rounded-xl border border-dashed border-border bg-muted/30 p-3">
                <SectionNav
                  activeSection={activeSection}
                  onSelect={(id) => {
                    setActiveSection(id);
                    setMobileNavOpen(false);
                  }}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Desktop: horizontal nav at top */}
        <div className="hidden lg:block" aria-label="Settings navigation">
          <DesktopSectionNav activeSection={activeSection} onSelect={setActiveSection} />
        </div>

        {/* Content area */}
        <main className="min-w-0 flex-1">
          {/* Account section */}
          <section
            id="panel-account"
            role="tabpanel"
            aria-labelledby="tab-account"
            hidden={activeSection !== "account"}
            className="rounded-xl border border-dashed border-border bg-background p-4 md:p-6"
          >
            {isLoading ? (
              <div className="flex h-48 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              <form onSubmit={handleAccountSubmit} className="w-full max-w-6xl space-y-6">
                <h2 className="text-lg font-medium text-foreground">Account</h2>
                <p className="text-sm text-muted-foreground">
                  Owner information for this store.
                </p>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="owner_name"
                      className="text-sm font-medium leading-normal text-foreground"
                    >
                      Owner name
                    </label>
                    <Input
                      id="owner_name"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="owner_email"
                      className="text-sm font-medium leading-normal text-foreground"
                    >
                      Owner email
                    </label>
                    <Input
                      id="owner_email"
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="e.g. owner@yourstore.com"
                      className="w-full"
                    />
                  </div>
                </div>

                {accountMessage && (
                  <p
                    className={
                      accountMessage.type === "success"
                        ? "text-sm text-green-600"
                        : "text-sm text-destructive"
                    }
                  >
                    {accountMessage.text}
                  </p>
                )}

                <Button type="submit" disabled={accountSaving}>
                  {accountSaving ? "Saving…" : "Save account settings"}
                </Button>
              </form>
            )}
          </section>

          {/* Store Info section */}
          <section
            id="panel-store"
            role="tabpanel"
            aria-labelledby="tab-store"
            hidden={activeSection !== "store"}
            className="rounded-xl border border-dashed border-border bg-background p-4 md:p-6"
          >
            <h2 className="text-lg font-medium text-foreground">Store Info</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Your store identity. Powers frontend, invoices, and emails.
            </p>
            <form onSubmit={handleStoreSubmit} className="w-full max-w-6xl space-y-6">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="store_name"
                    className="text-sm font-medium leading-normal text-foreground"
                  >
                    Store name
                  </label>
                  <Input
                    id="store_name"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Gadzilla"
                    className="w-full"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="store_type"
                    className="text-sm font-medium leading-normal text-foreground"
                  >
                    Store type
                  </label>
                  <Input
                    id="store_type"
                    value={storeType}
                    onChange={(e) => setStoreType(e.target.value)}
                    placeholder="e.g. Fashion, Retail, E-commerce"
                    className="w-full"
                    maxLength={60}
                  />
                  <p className="text-xs text-muted-foreground">
                    Category or type of your store. Max 4 words.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="store_contact_email"
                    className="text-sm font-medium leading-normal text-foreground"
                  >
                    Contact email
                  </label>
                  <Input
                    id="store_contact_email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="contact@yourstore.com"
                    className="w-full"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="store_phone"
                    className="text-sm font-medium leading-normal text-foreground"
                  >
                    Phone number
                  </label>
                  <Input
                    id="store_phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880 1XXX-XXXXXX"
                    className="w-full"
                  />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label
                    htmlFor="store_address"
                    className="text-sm font-medium leading-normal text-foreground"
                  >
                    Address
                  </label>
                  <Input
                    id="store_address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main St, City, Country"
                    className="w-full"
                  />
                </div>
              </div>

              {storeMessage && (
                <p
                  className={
                    storeMessage.type === "success"
                      ? "text-sm text-green-600"
                      : "text-sm text-destructive"
                  }
                >
                  {storeMessage.text}
                </p>
              )}

              <Button type="submit" disabled={storeSaving}>
                {storeSaving ? "Saving…" : "Save store settings"}
              </Button>
            </form>
          </section>

          {/* Dynamic Fields section */}
          <section
            id="panel-eav"
            role="tabpanel"
            aria-labelledby="tab-eav"
            hidden={activeSection !== "eav"}
            className="rounded-xl border border-dashed border-border bg-background p-4 md:p-6"
          >
            <h2 className="text-lg font-medium text-foreground">Dynamic Fields</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Define custom extra fields for products, customers, and orders. These
              fields appear in create/edit forms. Values are stored locally for now;
              backend integration coming later.
            </p>
            <DynamicFieldsPanel
              message={dynamicFieldsMessage}
              onMessage={setDynamicFieldsMessage}
            />
          </section>

          {/* Apps section */}
          <section
            id="panel-apps"
            role="tabpanel"
            aria-labelledby="tab-apps"
            hidden={activeSection !== "apps"}
            className="rounded-xl border border-dashed border-border bg-background p-4 md:p-6"
          >
            <h2 className="text-lg font-medium text-foreground">Apps</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Control which data models and features are available in your store. Essential apps
              are always enabled.
            </p>
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Essential
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {ESSENTIAL_APP_IDS.map((id) => {
                    const app = APP_CONFIG[id];
                    const Icon = app.icon;
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3"
                      >
                        <Icon className="size-5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground">{app.label}</p>
                          <p className="text-xs text-muted-foreground">{app.description}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                          Always on
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Optional
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {OPTIONAL_APP_IDS.map((id) => {
                    const app = APP_CONFIG[id];
                    const Icon = app.icon;
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3"
                      >
                        <Icon className="size-5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground">{app.label}</p>
                          <p className="text-xs text-muted-foreground">{app.description}</p>
                        </div>
                        <label className="flex shrink-0 cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={enabledApps.isEnabled(id)}
                            onChange={() => enabledApps.toggleApp(id)}
                            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-muted-foreground">
                            {enabledApps.isEnabled(id) ? "Enabled" : "Disabled"}
                          </span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Integrations section */}
          <section
            id="panel-integrations"
            role="tabpanel"
            aria-labelledby="tab-integrations"
            hidden={activeSection !== "integrations"}
            className="rounded-xl border border-dashed border-border bg-background p-4 md:p-6"
          >
            <h2 className="text-lg font-medium text-foreground">Integrations</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Connect marketing tools. Popular for store owners in Bangladesh who boost products on Facebook.
            </p>
            <div className="w-full max-w-6xl space-y-6">
              {/* Facebook Conversion API */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 md:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Facebook className="size-5 text-[#1877F2]" />
                  <h3 className="text-sm font-semibold text-foreground">Facebook Conversion API (Meta)</h3>
                </div>
                <p className="mb-4 text-xs text-muted-foreground">
                  Track conversions server-side for better ad performance when Facebook ads drive your sales. Get Pixel ID and Access Token from Meta Business Suite → Events Manager → Data Sources.
                </p>
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-foreground">Pixel ID</label>
                    <Input
                      placeholder="e.g. 123456789012345"
                      value={facebookPixelId}
                      onChange={(e) => setFacebookPixelId(e.target.value)}
                      className="max-w-md"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-foreground">Access Token</label>
                    <Input
                      type="password"
                      placeholder="Enter your Conversions API access token"
                      value={facebookAccessToken}
                      onChange={(e) => setFacebookAccessToken(e.target.value)}
                      className="max-w-md"
                      autoComplete="off"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleFacebookCapiSave}
                    disabled={integrationsSaving}
                    className="gap-2"
                  >
                    <Save className="size-4" />
                    {integrationsSaving ? "Saving…" : "Save"}
                  </Button>
                </div>
                {integrationsMessage && (
                  <p
                    className={cn(
                      "mt-3 text-sm",
                      integrationsMessage.type === "success"
                        ? "text-green-600 dark:text-green-500"
                        : "text-destructive"
                    )}
                  >
                    {integrationsMessage.text}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Networking section */}
          <section
            id="panel-networking"
            role="tabpanel"
            aria-labelledby="tab-networking"
            hidden={activeSection !== "networking"}
            className="rounded-xl border border-dashed border-border bg-background p-4 md:p-6"
          >
            <h2 className="text-lg font-semibold text-foreground">Public Networking</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Access your application over HTTP with the following domains
            </p>
            <div className="w-full max-w-6xl space-y-4 pb-8 sm:pb-0">
              {/* Domain card(s) */}
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <Cloud className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">
                      {process.env.NEXT_PUBLIC_API_URL
                        ? process.env.NEXT_PUBLIC_API_URL.replace(/^https?:\/\//, "").split("/")[0] || "api.yourstore.com"
                        : "api.yourstore.com"}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-muted-foreground">
                      <span>→ Port 8080</span>
                      <span>·</span>
                      <button type="button" className="text-primary hover:underline">
                        Cloudflare proxy detected
                      </button>
                      <span>·</span>
                      <button type="button" className="text-primary hover:underline">
                        View Documentation
                      </button>
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto sm:gap-2">
                  <Button variant="ghost" size="icon" aria-label="Copy domain" className="size-8">
                    <Copy className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Edit domain" className="size-8">
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Delete domain" className="size-8">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2">
                <Button variant="outline" size="sm" className="w-full justify-center border-primary text-primary hover:bg-primary/10 sm:w-auto">
                  <Zap className="mr-2 size-4" />
                  Generate Domain
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-center border-primary text-primary hover:bg-primary/10 sm:w-auto">
                  <Plus className="mr-2 size-4" />
                  Custom Domain
                </Button>
              </div>
            </div>
          </section>

          {/* Notifications section */}
          <section
            id="panel-notifications"
            role="tabpanel"
            aria-labelledby="tab-notifications"
            hidden={activeSection !== "notifications"}
            className="rounded-xl border border-dashed border-border bg-background p-4 md:p-6"
          >
            <div className="w-full max-w-6xl space-y-6">
              <div>
                <h2 className="text-lg font-medium text-foreground">Notification preferences</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose which events should generate notifications in the top bar.
                </p>
              </div>
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
              <div className="border-t border-border pt-4">
                <label className="text-sm font-medium text-foreground">Email notifications</label>
                <p className="mb-3 text-xs text-muted-foreground">
                  Control when emails are sent for order events.
                </p>
                <div className="space-y-3">
                  <label className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-foreground">Email me when an order is received</span>
                    <input
                      type="checkbox"
                      checked={notificationPrefs.emailMeOnOrderReceived}
                      onChange={(e) => updateNotificationPref("emailMeOnOrderReceived", e.target.checked)}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-foreground">Email customer when an order is confirmed</span>
                    <input
                      type="checkbox"
                      checked={notificationPrefs.emailCustomerOnOrderConfirmed}
                      onChange={(e) => updateNotificationPref("emailCustomerOnOrderConfirmed", e.target.checked)}
                    />
                  </label>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <label className="text-sm font-medium text-foreground">Delivery preference</label>
                <p className="mb-2 text-xs text-muted-foreground">
                  Choose how to receive notifications (coming soon).
                </p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input type="radio" name="delivery" disabled />
                    Email
                  </label>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input type="radio" name="delivery" disabled />
                    In-app
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Security section */}
          <section
            id="panel-security"
            role="tabpanel"
            aria-labelledby="tab-security"
            hidden={activeSection !== "security"}
            className="rounded-xl border border-dashed border-border bg-background p-4 md:p-6"
          >
            <h2 className="text-lg font-medium text-foreground">Security</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Change password, manage 2FA, active sessions, and login activity.
            </p>
            <div className="w-full max-w-6xl space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Change Password</label>
                <Input type="password" placeholder="••••••••" disabled />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" disabled className="rounded" />
                <label className="text-sm text-muted-foreground">Two-factor authentication (2FA)</label>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Active Sessions</label>
                <Input placeholder="View and manage sessions" disabled />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Login Activity</label>
                <Input placeholder="View login history" disabled />
              </div>
            </div>
          </section>

          {/* Billing section */}
          <section
            id="panel-billing"
            role="tabpanel"
            aria-labelledby="tab-billing"
            hidden={activeSection !== "billing"}
            className="rounded-xl border border-dashed border-border bg-background p-4 md:p-6"
          >
            <h2 className="text-lg font-medium text-foreground">Billing & Plan</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Current plan, upgrade/downgrade, usage (API, storage), and payment history.
            </p>
            <div className="w-full max-w-6xl space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Current Plan</label>
                <Input placeholder="View your plan" disabled />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Usage</label>
                <Input placeholder="API calls, storage, etc." disabled />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Payment History</label>
                <Input placeholder="View invoices and payments" disabled />
              </div>
            </div>
          </section>

          {/* Data & Export section */}
          <section
            id="panel-data"
            role="tabpanel"
            aria-labelledby="tab-data"
            hidden={activeSection !== "data"}
            className="rounded-xl border border-dashed border-border bg-background p-4 md:p-6"
          >
            <h2 className="text-lg font-medium text-foreground">Data & Export</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Export products, orders, backup your data, or delete your store.
            </p>
            <div className="w-full max-w-6xl space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Export Products</label>
                <Input placeholder="CSV / JSON" disabled />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Export Orders</label>
                <Input placeholder="Download order data" disabled />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Backup Download</label>
                <Input placeholder="Full store backup" disabled />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-destructive">Delete Store</label>
                <Input placeholder="Permanently delete store and all data" disabled />
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
