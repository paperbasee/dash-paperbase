"use client";

import CourierIntegration from "./CourierIntegration";
import MarketingIntegration from "./MarketingIntegration";

export default function IntegrationsSection({
  hidden,
}: {
  hidden: boolean;
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
        Connect marketing and delivery tools to your store. More integrations
        are added over time.
      </p>

      <div className="w-full max-w-6xl space-y-6">
        <MarketingIntegration />
        <CourierIntegration />
      </div>
    </section>
  );
}
