import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { OPTIONAL_APP_IDS, APP_CONFIG, type AppConfig } from "@/config/apps";
import { useEnterNavigation } from "@/hooks/useEnterNavigation";
import type { StoreFormData } from "./useOnboarding";

interface AppSelectionStepProps {
  formData: StoreFormData;
  selectedApps: Set<string>;
  loading: boolean;
  error: string;
  onToggleApp: (appId: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}

export function AppSelectionStep({
  formData,
  selectedApps,
  loading,
  error,
  onToggleApp,
  onSubmit,
  onBack,
}: AppSelectionStepProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const t = useTranslations("auth.onboarding");
  const tCommon = useTranslations("common");
  const { handleKeyDown } = useEnterNavigation(() => formRef.current?.requestSubmit());

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="rounded-ui border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <p className="text-sm text-muted-foreground">{t("appsIntro")}</p>

      <div className="rounded-card border border-border/60 bg-muted/20 p-3 text-sm">
        <p className="mb-2 font-medium text-foreground">{t("reviewHeading")}</p>
        <div className="space-y-1 text-muted-foreground">
          <p>
            <span className="text-foreground">{t("storeName")}:</span> {formData.name}
          </p>
          <p>
            <span className="text-foreground">{t("ownerName")}:</span> {formData.owner_first_name}{" "}
            {formData.owner_last_name}
          </p>
          <p>
            <span className="text-foreground">{t("ownerEmail")}:</span> {formData.owner_email}
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {OPTIONAL_APP_IDS.map((id) => {
          const app = APP_CONFIG[id] as AppConfig | undefined;
          if (!app) return null;
          const Icon = app.icon;
          const checked = selectedApps.has(id);
          return (
            <label
              key={id}
              className={[
                "flex cursor-pointer items-start gap-3 rounded-ui p-2.5 transition",
                checked
                  ? "bg-primary/5 ring-1 ring-primary/30"
                  : "bg-muted/20 hover:bg-muted/40 ring-1 ring-border/30",
              ].join(" ")}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggleApp(id)}
                onKeyDown={handleKeyDown}
                className="form-checkbox mt-1"
              />
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">
                  {app.label}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {app.description}
                </span>
              </div>
              <Icon className="size-5 shrink-0 text-muted-foreground" />
            </label>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1"
        >
          {tCommon("back")}
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1"
        >
          {loading ? t("creatingStore") : t("confirmAndCreate")}
        </Button>
      </div>
    </form>
  );
}
