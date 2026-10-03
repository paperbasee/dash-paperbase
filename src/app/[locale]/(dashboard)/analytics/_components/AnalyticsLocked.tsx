"use client";

import { useMemo } from "react";

import { AnalyticsPremiumCard } from "@/components/premium/AnalyticsPremiumCard";
import { useRouter } from "@/i18n/navigation";

import type { Period } from "../_lib/period";
import { sampleOverview } from "../_lib/samples";
import { Overview } from "../_sections/Overview";

/**
 * The analytics page on a plan without analytics (owner, 2026-10-04: Premium only, Essential sees
 * none of it): the real Overview, blurred, drawn from made-up numbers (_lib/samples.ts), under the
 * Premium card. Nothing here asks the API for a report -- the shop's own numbers never reach the
 * browser, so DevTools has nothing of theirs to show, and the API refuses them besides.
 */
export function AnalyticsLocked({ period }: { period: Period }) {
  const router = useRouter();
  const report = useMemo(() => sampleOverview(period), [period]);
  // Back where they came from; opened straight from an address, home.
  const back = () => (window.history.length > 1 ? router.back() : router.push("/"));

  return (
    <div className="relative isolate">
      <div aria-hidden inert className="pointer-events-none select-none opacity-80 blur-[7px]">
        <Overview report={report} />
      </div>
      <div className="absolute inset-0 z-10 px-4">
        <div className="sticky top-20 flex justify-center pt-6 sm:pt-12">
          <AnalyticsPremiumCard onBack={back} />
        </div>
      </div>
    </div>
  );
}
