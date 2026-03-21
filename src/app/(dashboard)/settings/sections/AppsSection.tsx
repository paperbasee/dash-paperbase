 "use client";

import { APP_CONFIG, ESSENTIAL_APP_IDS, OPTIONAL_APP_IDS } from "@/config/apps";

export default function AppsSection({
  hidden,
  enabledApps,
}: {
  hidden: boolean;
  enabledApps: {
    isEnabled: (appId: string) => boolean;
    toggleApp: (appId: string) => void | Promise<void>;
  };
}) {
  return (
    <section
      id="panel-apps"
      role="tabpanel"
      aria-labelledby="tab-apps"
      hidden={hidden}
      className="rounded-xl border border-dashed border-border bg-background p-4 md:p-6"
    >
      <h2 className="text-lg font-medium text-foreground">Apps</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Control which data models and features are available in your store. Essential apps are always enabled.
      </p>

      <div className="space-y-6">
        <div>
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">Essential</h3>
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
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">Optional</h3>
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
                      className="form-checkbox"
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
  );
}

