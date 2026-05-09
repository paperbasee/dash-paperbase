import { BarChart3 } from "lucide-react";

export function AnalyticsUpgradeWall() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="rounded-card border border-border bg-card p-10 max-w-md w-full space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <BarChart3 className="h-7 w-7 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Advanced Analytics</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Get deep insights into your store — page views, sessions, revenue trends, top products,
            and parcel delivery performance.
          </p>
        </div>

        <ul className="text-left space-y-2 text-sm text-muted-foreground">
          {[
            "Session tracking with bounce rate & duration",
            "Revenue & order trends with MoM and YoY",
            "Top pages and product conversion rates",
            "Parcel delivery and return rate breakdown",
            "UTM campaign attribution",
          ].map((f) => (
            <li key={f} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        <a
          href="/settings/billing"
          className="block w-full rounded-card bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground text-center transition hover:bg-primary/90"
        >
          Upgrade to Premium
        </a>

        <p className="text-xs text-muted-foreground">Available on the Premium plan — monthly or yearly.</p>
      </div>
    </div>
  );
}
