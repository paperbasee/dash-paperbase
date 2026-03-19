 "use client";

import { Facebook, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SettingsMessage = { type: "success" | "error"; text: string } | null;

export default function IntegrationsSection({
  hidden,
  facebookPixelId,
  facebookAccessToken,
  onFacebookPixelIdChange,
  onFacebookAccessTokenChange,
  integrationsSaving,
  integrationsMessage,
  onSave,
}: {
  hidden: boolean;
  facebookPixelId: string;
  facebookAccessToken: string;
  onFacebookPixelIdChange: (v: string) => void;
  onFacebookAccessTokenChange: (v: string) => void;
  integrationsSaving: boolean;
  integrationsMessage: SettingsMessage;
  onSave: () => void;
}) {
  return (
    <section
      id="panel-integrations"
      role="tabpanel"
      aria-labelledby="tab-integrations"
      hidden={hidden}
      className="rounded-xl border border-dashed border-border bg-background p-4 md:p-6"
    >
      <h2 className="text-lg font-medium text-foreground">Integrations</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Connect marketing tools. Popular for store owners in Bangladesh who boost products on Facebook.
      </p>

      <div className="w-full max-w-6xl space-y-6">
        <div className="rounded-xl border border-border bg-muted/30 p-4 md:p-5">
          <div className="flex items-center gap-2 mb-2">
            <Facebook className="size-5 text-[#1877F2]" />
            <h3 className="text-sm font-semibold text-foreground">Facebook Conversion API (Meta)</h3>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Track conversions server-side for better ad performance when Facebook ads drive your sales. Get Pixel
            ID and Access Token from Meta Business Suite → Events Manager → Data Sources.
          </p>

          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">Pixel ID</label>
              <Input
                placeholder="e.g. 123456789012345"
                value={facebookPixelId}
                onChange={(e) => onFacebookPixelIdChange(e.target.value)}
                className="max-w-md"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">Access Token</label>
              <Input
                type="password"
                placeholder="Enter your Conversions API access token"
                value={facebookAccessToken}
                onChange={(e) => onFacebookAccessTokenChange(e.target.value)}
                className="max-w-md"
                autoComplete="off"
              />
            </div>

            <Button
              type="button"
              onClick={onSave}
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
  );
}

