 "use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SettingsMessage = { type: "success" | "error"; text: string } | null;

export default function StoreInfoSection({
  hidden,
  previewUrl,
  currentLogoUrl,
  clearLogo,
  fileInputRef,
  onLogoFileChange,
  onClearLogoChange,
  storeName,
  storeType,
  contactEmail,
  phone,
  address,
  onStoreNameChange,
  onStoreTypeChange,
  onContactEmailChange,
  onPhoneChange,
  onAddressChange,
  storeSaving,
  storeMessage,
  onSubmit,
}: {
  hidden: boolean;
  previewUrl: string | null;
  currentLogoUrl: string | null;
  clearLogo: boolean;
  fileInputRef: React.Ref<HTMLInputElement>;
  onLogoFileChange: Dispatch<SetStateAction<File | null>> | ((value: File | null) => void);
  onClearLogoChange: Dispatch<SetStateAction<boolean>> | ((value: boolean) => void);
  storeName: string;
  storeType: string;
  contactEmail: string;
  phone: string;
  address: string;
  onStoreNameChange: Dispatch<SetStateAction<string>>;
  onStoreTypeChange: Dispatch<SetStateAction<string>>;
  onContactEmailChange: Dispatch<SetStateAction<string>>;
  onPhoneChange: Dispatch<SetStateAction<string>>;
  onAddressChange: Dispatch<SetStateAction<string>>;
  storeSaving: boolean;
  storeMessage: SettingsMessage;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <section
      id="panel-store"
      role="tabpanel"
      aria-labelledby="tab-store"
      hidden={hidden}
      className="rounded-xl border border-dashed border-border bg-background p-4 md:p-6"
    >
      <h2 className="text-lg font-medium text-foreground">Store Info</h2>
      <p className="mb-4 text-sm text-muted-foreground">Your store identity. Powers frontend, invoices, and emails.</p>

      <form onSubmit={onSubmit} className="w-full max-w-6xl space-y-6">
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
                className="form-file-input text-sm"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  onLogoFileChange(f || null);
                  if (f) onClearLogoChange(false);
                }}
              />

              {currentLogoUrl && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={clearLogo}
                    onChange={(e) => {
                      onClearLogoChange(e.target.checked);
                      if (e.target.checked) onLogoFileChange(null);
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
            <label htmlFor="store_name" className="text-sm font-medium leading-normal text-foreground">
              Store name
            </label>
            <Input
              id="store_name"
              value={storeName}
              onChange={(e) => onStoreNameChange(e.target.value)}
              placeholder="e.g. Gadzilla"
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="store_type" className="text-sm font-medium leading-normal text-foreground">
              Store type
            </label>
            <Input
              id="store_type"
              value={storeType}
              onChange={(e) => onStoreTypeChange(e.target.value)}
              placeholder="e.g. Fashion, Retail, E-commerce"
              className="w-full"
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground">Category or type of your store. Max 4 words.</p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="store_contact_email" className="text-sm font-medium leading-normal text-foreground">
              Contact email
            </label>
            <Input
              id="store_contact_email"
              type="email"
              value={contactEmail}
              onChange={(e) => onContactEmailChange(e.target.value)}
              placeholder="contact@yourstore.com"
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="store_phone" className="text-sm font-medium leading-normal text-foreground">
              Phone number
            </label>
            <Input
              id="store_phone"
              type="tel"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="+880 1XXX-XXXXXX"
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-2 md:col-span-2">
            <label htmlFor="store_address" className="text-sm font-medium leading-normal text-foreground">
              Address
            </label>
            <Input
              id="store_address"
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
              placeholder="123 Main St, City, Country"
              className="w-full"
            />
          </div>
        </div>

        {storeMessage && (
          <p
            className={storeMessage.type === "success" ? "text-sm text-green-600" : "text-sm text-destructive"}
          >
            {storeMessage.text}
          </p>
        )}

        <Button type="submit" disabled={storeSaving}>
          {storeSaving ? "Saving…" : "Save store settings"}
        </Button>
      </form>
    </section>
  );
}

