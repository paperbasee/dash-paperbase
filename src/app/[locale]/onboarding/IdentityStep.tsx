import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { StoreFormData } from "./useOnboarding";

interface IdentityStepProps {
  formData: StoreFormData;
  error: string;
  fieldErrors: Partial<Record<keyof StoreFormData, string>>;
  loading: boolean;
  onFieldChange: <K extends keyof StoreFormData>(key: K, value: StoreFormData[K]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function IdentityStep({
  formData,
  error,
  fieldErrors,
  loading,
  onFieldChange,
  onNext,
  onBack,
}: IdentityStepProps) {
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="form-field">
          <label htmlFor="owner_first_name" className="field-label">
            {t("firstName")} <span className="text-destructive">*</span>
          </label>
          <Input
            id="owner_first_name"
            type="text"
            required
            size="lg"
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
            {t("lastName")} <span className="text-destructive">*</span>
          </label>
          <Input
            id="owner_last_name"
            type="text"
            required
            size="lg"
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
