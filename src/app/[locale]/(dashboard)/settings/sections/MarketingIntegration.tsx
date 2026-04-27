"use client";

import MarketingProviderCard from "./MarketingProviderCard";
import OtherMarketingIntegrations from "./OtherMarketingIntegrations";

/**
 * Facebook CAPI and TikTok Events API each get a dedicated card (independent load/error),
 * then any other marketing providers (e.g. Google Analytics) list below.
 */
export default function MarketingIntegration() {
  return (
    <div className="space-y-8">
      <MarketingProviderCard provider="facebook" />
      <MarketingProviderCard provider="tiktok" />
      <OtherMarketingIntegrations />
    </div>
  );
}
