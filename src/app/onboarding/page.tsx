"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import {
  OPTIONAL_APP_IDS,
  APP_CONFIG,
  type AppConfig,
} from "@/config/apps";

const STORAGE_KEY = "core_enabled_apps";

interface StoreFormData {
  name: string;
  store_type: string;
  owner_first_name: string;
  owner_last_name: string;
  owner_email: string;
  phone: string;
  contact_email: string;
  address: string;
}

interface MeResponse {
  active_store_id: string | null;
  public_id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  stores: { id: string; name: string; domain: string | null; role: string }[];
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAddMode = searchParams.get("add") === "1";
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<StoreFormData>({
    name: "",
    store_type: "",
    owner_first_name: "",
    owner_last_name: "",
    owner_email: "",
    phone: "",
    contact_email: "",
    address: "",
  });
  const [selectedApps, setSelectedApps] = useState<Set<string>>(
    () => new Set(OPTIONAL_APP_IDS)
  );

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    async function checkStore() {
      try {
        const { data } = await api.get<MeResponse>("auth/me/");
        if (data.active_store_id && !isAddMode) {
          router.replace("/");
          return;
        }
        setFormData((p) => ({
          ...p,
          owner_email: data.email || p.owner_email,
          owner_first_name: p.owner_first_name || data.first_name || "",
          owner_last_name: p.owner_last_name || data.last_name || "",
        }));
        setChecking(false);
      } catch {
        setChecking(false);
      }
    }
    checkStore();
  }, [isAuthenticated, authLoading, router, isAddMode]);

  const toggleApp = (appId: string) => {
    setSelectedApps((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      return next;
    });
  };

  async function handleStep1Submit(e: FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Store name is required.");
      return;
    }
    const st = formData.store_type.trim();
    if (st && st.split(/\s+/).length > 4) {
      setError("Store type must be at most 4 words.");
      return;
    }
    if (!formData.owner_first_name.trim()) {
      setError("First name is required.");
      return;
    }
    if (!formData.owner_last_name.trim()) {
      setError("Last name is required.");
      return;
    }
    if (!formData.owner_email.trim()) {
      setError("Owner email is required.");
      return;
    }
    setError("");
    setStep(2);
  }

  async function handleStep2Submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const modules_enabled: Record<string, boolean> = {};
      for (const id of OPTIONAL_APP_IDS) {
        modules_enabled[id] = selectedApps.has(id);
      }
      const { data: store } = await api.post("stores/", {
        name: formData.name.trim(),
        store_type: formData.store_type.trim() || undefined,
        owner_first_name: formData.owner_first_name.trim(),
        owner_last_name: formData.owner_last_name.trim(),
        owner_email: formData.owner_email.trim(),
        contact_email: formData.contact_email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        modules_enabled,
      });

      const { data: switchData } = await api.post<{
        access: string;
        refresh: string;
        active_store_id: string;
      }>("auth/switch-store/", { store_id: store.public_id });

      localStorage.setItem("access_token", switchData.access);
      localStorage.setItem("refresh_token", switchData.refresh);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([...selectedApps].filter((id) =>
          OPTIONAL_APP_IDS.includes(id as (typeof OPTIONAL_APP_IDS)[number])
        ))
      );

      router.push("/");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : null;
      setError(msg || "Failed to create store. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-8">
      <div className="w-full max-w-lg rounded-none bg-white/80 p-8 shadow-xl shadow-slate-200 ring-1 ring-slate-100 backdrop-blur">
        <div className="mb-8 space-y-2">
          <p className="text-sm font-normal uppercase tracking-[0.25em] text-slate-500">
            Gadzilla Dashboard
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {isAddMode ? "Create a new store" : "Set up your store"}
          </h1>
          <p className="text-sm text-slate-500">
            {step === 1
              ? "Step 1 of 2: Store details"
              : "Step 2 of 2: Choose apps"}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleStep1Submit} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50/80 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-slate-700"
              >
                Store name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, name: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="e.g. My Shop"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="store_type"
                className="block text-sm font-medium text-slate-700"
              >
                Store type
              </label>
              <input
                id="store_type"
                type="text"
                value={formData.store_type}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, store_type: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="e.g. Fashion, Retail, E-commerce"
                maxLength={60}
              />
              <p className="text-xs text-slate-500">Max 4 words. Optional.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="owner_first_name"
                  className="block text-sm font-medium text-slate-700"
                >
                  First name <span className="text-red-500">*</span>
                </label>
                <input
                  id="owner_first_name"
                  type="text"
                  required
                  value={formData.owner_first_name}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, owner_first_name: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  placeholder="e.g. John"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="owner_last_name"
                  className="block text-sm font-medium text-slate-700"
                >
                  Last name <span className="text-red-500">*</span>
                </label>
                <input
                  id="owner_last_name"
                  type="text"
                  required
                  value={formData.owner_last_name}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, owner_last_name: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  placeholder="e.g. Doe"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="owner_email"
                className="block text-sm font-medium text-slate-700"
              >
                Owner email <span className="text-red-500">*</span>
              </label>
              <input
                id="owner_email"
                type="email"
                required
                readOnly
                value={formData.owner_email}
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-700 cursor-not-allowed"
                placeholder="owner@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="contact_email"
                className="block text-sm font-medium text-slate-700"
              >
                Store email
              </label>
              <input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, contact_email: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="store@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-slate-700"
              >
                Store phone
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, phone: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="+1 234 567 8900"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="address"
                className="block text-sm font-medium text-slate-700"
              >
                Address
              </label>
              <textarea
                id="address"
                rows={2}
                value={formData.address}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, address: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
                placeholder="123 Main St, City, Country"
              />
            </div>
            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
            >
              Continue
            </button>
          </form>
        ) : (
          <form onSubmit={handleStep2Submit} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50/80 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <p className="text-sm text-slate-600">
              Products, Orders, and Customers are always enabled. Choose
              additional apps for your store:
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {OPTIONAL_APP_IDS.map((id) => {
                const app = APP_CONFIG[id] as AppConfig | undefined;
                if (!app) return null;
                const Icon = app.icon;
                const checked = selectedApps.has(id);
                return (
                  <label
                    key={id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                      checked
                        ? "border-indigo-300 bg-indigo-50/50"
                        : "border-slate-200 bg-slate-50/30 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleApp(id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-900">
                        {app.label}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {app.description}
                      </span>
                    </div>
                    <Icon className="size-5 shrink-0 text-slate-400" />
                  </label>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating store..." : "Create store"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
