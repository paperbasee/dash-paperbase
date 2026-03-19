import { Button } from "@/components/ui/button";
import { OPTIONAL_APP_IDS, APP_CONFIG, type AppConfig } from "@/config/apps";

interface AppSelectionStepProps {
  selectedApps: Set<string>;
  loading: boolean;
  error: string;
  onToggleApp: (appId: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}

export function AppSelectionStep({
  selectedApps,
  loading,
  error,
  onToggleApp,
  onSubmit,
  onBack,
}: AppSelectionStepProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && (
        <div className="rounded-none border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Products, Orders, and Customers are always enabled. Choose additional
        apps for your store:
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
              className={[
                "flex cursor-pointer items-start gap-3 rounded-none border p-3 transition",
                checked
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-muted/20 hover:border-border/80 hover:bg-muted/40",
              ].join(" ")}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggleApp(id)}
                className="mt-1 h-4 w-4 rounded-none border-border"
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

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1 rounded-none"
        >
          Back
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-none"
        >
          {loading ? "Creating store..." : "Create store"}
        </Button>
      </div>
    </form>
  );
}
