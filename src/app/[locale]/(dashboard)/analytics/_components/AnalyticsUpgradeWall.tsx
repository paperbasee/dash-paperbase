import {
  ArrowRight,
  BarChart3,
  Layers,
  Link2,
  MousePointer,
  Package,
  TrendingUp,
} from "lucide-react";

export function AnalyticsUpgradeWall() {
  return (
    <div className="relative min-h-[80vh] w-full overflow-hidden rounded-card">
      {/* Blurred background — fake analytics mockup */}
      <div className="pointer-events-none absolute inset-0 select-none">
        {/* Fake metric cards row */}
        <div className="space-y-4 p-6 blur-sm opacity-40">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: "Pageviews", value: "12,400" },
              { label: "Sessions", value: "4,200" },
              { label: "Revenue", value: "৳1,24,500" },
              { label: "Orders", value: "340" },
            ].map((card) => (
              <div key={card.label} className="space-y-2 rounded-card border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-semibold text-foreground">{card.value}</p>
                <p className="text-xs text-emerald-500">↑ 18.4% vs prev period</p>
              </div>
            ))}
          </div>

          {/* Fake chart */}
          <div className="flex h-48 items-end gap-1 rounded-card border border-border bg-card p-4">
            {[
              30, 45, 28, 60, 75, 50, 90, 65, 80, 55, 70, 85, 40, 95, 60, 75, 88, 50, 65, 78, 42, 68,
              55, 80, 92, 60, 45, 70, 85, 55,
            ].map((h, i) => (
              <div key={i} className="flex-1 rounded-sm bg-primary/30" style={{ height: `${h}%` }} />
            ))}
          </div>

          {/* Fake table */}
          <div className="space-y-2 rounded-card border border-border bg-card p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-3 w-1/3 rounded bg-muted" />
                <div className="h-3 w-1/4 rounded bg-muted" />
                <div className="h-3 w-1/5 rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>

        {/* Gradient overlay on top of blur */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background/95" />
      </div>

      {/* Foreground card */}
      <div className="relative z-10 flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-lg space-y-6 rounded-card border border-border bg-card/90 p-6 shadow-xl backdrop-blur-md sm:p-8">
          {/* Premium badge */}
          <div className="flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Premium Feature
            </span>
          </div>

          {/* Heading */}
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-semibold text-foreground">Unlock Advanced Analytics</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              See exactly where your revenue comes from, which products convert best, and how customers find
              your store.
            </p>
          </div>

          {/* Feature grid — single column on narrow screens so labels don’t crush */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { icon: BarChart3, label: "Sessions & bounce rate" },
              { icon: TrendingUp, label: "Revenue trends MoM & YoY" },
              { icon: Package, label: "Parcel delivery breakdown" },
              { icon: MousePointer, label: "Top pages & conversion" },
              { icon: Link2, label: "UTM campaign attribution" },
              { icon: Layers, label: "Device & traffic sources" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex min-w-0 items-start gap-3 rounded-ui border border-border bg-muted/40 px-4 py-3 sm:items-center"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary sm:mt-0" />
                <span className="min-w-0 text-sm leading-snug text-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="space-y-3">
            <a
              href="/plans"
              className="flex w-full items-center justify-center gap-2 rounded-card bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Upgrade to Premium
              <ArrowRight className="h-4 w-4" />
            </a>
            <p className="text-center text-xs text-muted-foreground">
              Available on the Premium plan · Monthly or yearly billing
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
