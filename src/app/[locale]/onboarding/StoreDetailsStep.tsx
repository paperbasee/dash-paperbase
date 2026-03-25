import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { StoreFormData } from "./useOnboarding";

interface StoreDetailsStepProps {
  formData: StoreFormData;
  error: string;
  fieldErrors: Partial<Record<keyof StoreFormData, string>>;
  onFieldChange: <K extends keyof StoreFormData>(
    key: K,
    value: StoreFormData[K]
  ) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function StoreDetailsStep({
  formData,
  error,
  fieldErrors,
  onFieldChange,
  onSubmit,
}: StoreDetailsStepProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="form-field">
        <label htmlFor="name" className="field-label">
          Store name <span className="text-destructive">*</span>
        </label>
        <Input
          id="name"
          type="text"
          required
          value={formData.name}
          onChange={(e) => onFieldChange("name", e.target.value)}
          placeholder="e.g. My Shop"
          aria-invalid={!!fieldErrors.name}
        />
        {fieldErrors.name && (
          <p className="text-xs text-destructive">{fieldErrors.name}</p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="store_type" className="field-label">
          Store type
        </label>
        <Input
          id="store_type"
          type="text"
          value={formData.store_type}
          onChange={(e) => onFieldChange("store_type", e.target.value)}
          placeholder="e.g. Fashion, Retail, E-commerce"
          maxLength={60}
          aria-invalid={!!fieldErrors.store_type}
        />
        {fieldErrors.store_type && (
          <p className="text-xs text-destructive">{fieldErrors.store_type}</p>
        )}
        <p className="text-xs text-muted-foreground">Max 4 words. Optional.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="form-field">
          <label htmlFor="owner_first_name" className="field-label">
            First name <span className="text-destructive">*</span>
          </label>
          <Input
            id="owner_first_name"
            type="text"
            required
            value={formData.owner_first_name}
            onChange={(e) => onFieldChange("owner_first_name", e.target.value)}
            placeholder="e.g. John"
            aria-invalid={!!fieldErrors.owner_first_name}
          />
          {fieldErrors.owner_first_name && (
            <p className="text-xs text-destructive">{fieldErrors.owner_first_name}</p>
          )}
        </div>
        <div className="form-field">
          <label htmlFor="owner_last_name" className="field-label">
            Last name <span className="text-destructive">*</span>
          </label>
          <Input
            id="owner_last_name"
            type="text"
            required
            value={formData.owner_last_name}
            onChange={(e) => onFieldChange("owner_last_name", e.target.value)}
            placeholder="e.g. Doe"
            aria-invalid={!!fieldErrors.owner_last_name}
          />
          {fieldErrors.owner_last_name && (
            <p className="text-xs text-destructive">{fieldErrors.owner_last_name}</p>
          )}
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="owner_email" className="field-label">
          Owner email <span className="text-destructive">*</span>
        </label>
        <Input
          id="owner_email"
          type="email"
          required
          readOnly
          value={formData.owner_email}
          placeholder="owner@example.com"
          className="cursor-not-allowed opacity-70"
          aria-invalid={!!fieldErrors.owner_email}
        />
        {fieldErrors.owner_email && (
          <p className="text-xs text-destructive">{fieldErrors.owner_email}</p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="contact_email" className="field-label">
          Store email
        </label>
        <Input
          id="contact_email"
          type="email"
          value={formData.contact_email}
          onChange={(e) => onFieldChange("contact_email", e.target.value)}
          placeholder="store@example.com"
          aria-invalid={!!fieldErrors.contact_email}
        />
        {fieldErrors.contact_email && (
          <p className="text-xs text-destructive">{fieldErrors.contact_email}</p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="phone" className="field-label">
          Store phone
        </label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => onFieldChange("phone", e.target.value)}
          placeholder="+1 234 567 8900"
          aria-invalid={!!fieldErrors.phone}
        />
        {fieldErrors.phone && (
          <p className="text-xs text-destructive">{fieldErrors.phone}</p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="address" className="field-label">
          Address
        </label>
        <textarea
          id="address"
          rows={2}
          value={formData.address}
          onChange={(e) => onFieldChange("address", e.target.value)}
          className="input resize-none"
          placeholder="123 Main St, City, Country"
          aria-invalid={!!fieldErrors.address}
        />
        {fieldErrors.address && (
          <p className="text-xs text-destructive">{fieldErrors.address}</p>
        )}
      </div>

      <Button type="submit" className="mt-2 w-full">
        Continue
      </Button>
    </form>
  );
}
