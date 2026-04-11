import { useTranslations } from "next-intl";
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
  loading: boolean;
  onNext: () => void;
  onBack: () => void;
}

export function StoreDetailsStep({
  formData,
  error,
  fieldErrors,
  onFieldChange,
  loading,
  onNext,
  onBack,
}: StoreDetailsStepProps) {
  const t = useTranslations("auth.onboarding");
  const tCommon = useTranslations("common");

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-ui border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="form-field">
        <label htmlFor="name" className="field-label">
          {t("storeName")} <span className="text-destructive">*</span>
        </label>
        <Input
          id="name"
          type="text"
          required
          size="lg"
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
          {t("storeType")}
        </label>
        <Input
          id="store_type"
          type="text"
          size="lg"
          value={formData.store_type}
          onChange={(e) => onFieldChange("store_type", e.target.value)}
          placeholder="e.g. Fashion, Retail, E-commerce"
          maxLength={60}
          aria-invalid={!!fieldErrors.store_type}
        />
        {fieldErrors.store_type && (
          <p className="text-xs text-destructive">{fieldErrors.store_type}</p>
        )}
        <p className="text-xs text-muted-foreground">{t("storeTypeHint")}</p>
      </div>

      <div className="form-field">
        <label htmlFor="contact_email" className="field-label">
          {t("storeEmail")}
        </label>
        <Input
          id="contact_email"
          type="email"
          size="lg"
          value={formData.contact_email}
          onChange={(e) => onFieldChange("contact_email", e.target.value)}
          placeholder="store@example.com"
          aria-invalid={!!fieldErrors.contact_email}
        />
        {fieldErrors.contact_email && (
          <p className="text-xs text-destructive">{fieldErrors.contact_email}</p>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1" disabled={loading}>
          {tCommon("back")}
        </Button>
        <Button type="button" className="flex-1" onClick={onNext} disabled={loading}>
          {loading ? t("continuing") : t("continue")}
        </Button>
      </div>
    </div>
  );
}
