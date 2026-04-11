"use client";

import { useMemo } from "react";
import { PLACEMENT_CONFIG, type PageType } from "./placementConfig";
import { DeviceFrame } from "./DeviceFrame";
import { HomePreview } from "./layouts/HomePreview";

const LAYOUT_COMPONENTS: Record<
  PageType,
  React.ComponentType<{ activeZones: Set<string> }>
> = {
  home: HomePreview,
};

const PAGE_LABELS: Record<PageType, string> = {
  home: "Home Page",
};

type Props = {
  placements: string[];
};

export function MiniSitePreview({ placements }: Props) {
  const { pages, activeZonesByPage } = useMemo(() => {
    const zonesByPage = new Map<PageType, Set<string>>();
    const pageOrder: PageType[] = [];

    for (const placement of placements) {
      const entry = PLACEMENT_CONFIG[placement];
      if (!entry) continue;

      let zones = zonesByPage.get(entry.page);
      if (!zones) {
        zones = new Set<string>();
        zonesByPage.set(entry.page, zones);
        pageOrder.push(entry.page);
      }
      zones.add(entry.zone);
    }

    return { pages: pageOrder, activeZonesByPage: zonesByPage };
  }, [placements]);

  if (pages.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border bg-muted/10 py-8 text-center text-sm text-muted-foreground">
        Select a placement to see the preview
      </div>
    );
  }

  return (
    <DeviceFrame>
      <div className="divide-y divide-border/50">
        {pages.map((page) => {
          const Layout = LAYOUT_COMPONENTS[page];
          const zones = activeZonesByPage.get(page) ?? new Set<string>();

          return (
            <div key={page}>
              {pages.length > 1 && (
                <div className="border-b border-border/30 bg-muted/20 px-3 py-1.5">
                  <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {PAGE_LABELS[page]}
                  </span>
                </div>
              )}
              <Layout activeZones={zones} />
            </div>
          );
        })}
      </div>
    </DeviceFrame>
  );
}
