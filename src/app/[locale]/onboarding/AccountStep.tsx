import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { StoreFormData } from "./useOnboarding";

interface AccountStepProps {
  formData: StoreFormData;
  error: string;
  fieldErrors: Partial<Record<keyof StoreFormData, string>>;
  loading: boolean;
  onFieldChange: <K extends keyof StoreFormData>(key: K, value: StoreFormData[K]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function AccountStep({
  formData,
  error,
  fieldErrors,
  loading,
  onFieldChange,
  onNext,
  onBack,
}: AccountStepProps) {
  const t = useTranslations("auth.onboarding");
  const tCommon = useTranslations("common");
  const hasDuplicateInlineError = Object.values(fieldErrors).some(
    (msg) => typeof msg === "string" && msg.length > 0 && msg === error
  );
  const showTopError = Boolean(error) && !hasDuplicateInlineError;

  return (
    <div className="space-y-4">
      {showTopError && (
        <div className="rounded-ui border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="form-field">
        <label htmlFor="owner_email" className="field-label">
          {t("ownerEmail")} <span className="text-destructive">*</span>
        </label>
        <Input
          id="owner_email"
          type="email"
          required
          readOnly
          size="lg"
          value={formData.owner_email}
          className="cursor-not-allowed opacity-70"
          aria-invalid={!!fieldErrors.owner_email}
        />
        {fieldErrors.owner_email && (
          <p className="text-xs text-destructive">{fieldErrors.owner_email}</p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="phone" className="field-label">
          {t("storePhone")}
        </label>
        <Input
          id="phone"
          type="tel"
          size="lg"
          value={formData.phone}
          onChange={(e) => onFieldChange("phone", e.target.value)}
          placeholder="01XXXXXXXXX"
          aria-invalid={!!fieldErrors.phone}
        />
        {fieldErrors.phone && <p className="text-xs text-destructive">{fieldErrors.phone}</p>}
      </div>

      <div className="form-field">
        <label htmlFor="address" className="field-label">
          {t("address")}
        </label>
        <Textarea
          id="address"
          rows={2}
          value={formData.address}
          onChange={(e) => onFieldChange("address", e.target.value)}
          className="min-h-[4.5rem] resize-none"
          placeholder="House 12, Road 5, Dhanmondi, Dhaka"
          aria-invalid={!!fieldErrors.address}
        />
        {fieldErrors.address && <p className="text-xs text-destructive">{fieldErrors.address}</p>}
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1" disabled={loading}>
          {tCommon("back")}
        </Button>
        <Button type="button" onClick={onNext} className="flex-1" disabled={loading}>
          {loading ? t("continuing") : t("continue")}
        </Button>
      </div>
    </div>
  );
}
