"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Undo2, BarChart3 } from "lucide-react";
import { useFeatures } from "@/hooks/useFeatures";

export default function AnalyticsPage() {
  const router = useRouter();
  const tNav = useTranslations("nav");
  const tPages = useTranslations("pages");
  const { hasFeature, loading } = useFeatures();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const hasAdvancedAnalytics = hasFeature("advanced_analytics");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-muted/80 px-1 py-1 hidden md:block">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={tPages("goBack")}
            className="flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <Undo2 className="h-4 w-4" />
          </button>
        </div>
        <div>
          <h1 className="text-2xl font-medium leading-relaxed text-foreground">
            {tNav("analytics")}
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground md:hidden">
            {tPages("analyticsSubtitle")}
          </p>
        </div>
      </div>

      <p className="hidden text-sm leading-relaxed text-muted-foreground md:block">
        {tPages("analyticsSubtitle")}
      </p>

      {!hasAdvancedAnalytics ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm leading-relaxed text-destructive">
          {tPages("analyticsUpgradeHint")}
        </div>
      ) : null}

      <div className="relative">
        <div
          className={[
            "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-20 text-center",
            !hasAdvancedAnalytics ? "blur-[1px]" : "",
          ].join(" ")}
        >
          <div
            className={[
              "mb-4 rounded-full p-4",
              "bg-primary/10",
            ].join(" ")}
          >
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-medium text-foreground">Coming Soon</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Advanced analytics features are currently under development. Check
            back soon for detailed insights, custom reports, and more.
          </p>
        </div>
      </div>
    </div>
  );
}
