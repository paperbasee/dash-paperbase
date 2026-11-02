"use client";

import { useId } from "react";
import { CheckCircleIcon, HourglassMediumIcon, LinkBreakIcon, type Icon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { SERVICE_STANDINGS, type ServiceGroup, type ServiceStanding } from "@/lib/integrations/services";

const STANDING_ICONS: Record<ServiceStanding, Icon> = {
  connected: CheckCircleIcon,
  not_connected: LinkBreakIcon,
  coming_soon: HourglassMediumIcon,
};

const GROUPS: readonly ServiceGroup[] = ["ads", "delivery"];

/**
 * Settings > Integrations' filter column (owner, 2026-11-02, from a design they chose): where each
 * service stands, with counts, and its kind. On show beside the cards on a computer, the one page
 * that keeps its filters out, behind the filter button on a phone. Nothing is stored: filters
 * start clear each visit.
 */
export function IntegrationFilters({
  counts,
  standing,
  onStanding,
  groups,
  onGroups,
  showGroups,
}: {
  /** Absent until the connections have loaded: a count that may be wrong is not drawn. */
  counts: Record<ServiceStanding, number> | null;
  standing: ServiceStanding | null;
  onStanding: (next: ServiceStanding | null) => void;
  /** The ticked groups; none ticked is All. */
  groups: readonly ServiceGroup[];
  onGroups: (next: ServiceGroup[]) => void;
  /** Whoever sees only one group has nothing to choose between. */
  showGroups: boolean;
}) {
  const t = useTranslations("settings.integrations");
  const tCommon = useTranslations("common");
  const overviewId = useId();
  const categoriesId = useId();

  const standingWords: Record<ServiceStanding, string> = {
    connected: t("connected"),
    not_connected: t("statusNotConnected"),
    coming_soon: t("comingSoon"),
  };
  const groupWords: Record<ServiceGroup, string> = {
    ads: t("sectionAds"),
    delivery: t("sectionDelivery"),
  };

  function toggleGroup(group: ServiceGroup) {
    const next = groups.includes(group) ? groups.filter((one) => one !== group) : [...groups, group];
    // Every group ticked is the same as All, so it reads as All.
    onGroups(next.length === GROUPS.length ? [] : next);
  }

  return (
    <>
      <div role="group" aria-labelledby={overviewId}>
        <p id={overviewId} className="mb-2 text-[13px] text-muted-foreground">
          {t("overview")}
        </p>
        {SERVICE_STANDINGS.map((key) => {
          const Glyph = STANDING_ICONS[key];
          const count = counts?.[key];
          const chosen = standing === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={chosen}
              disabled={count === 0 && !chosen}
              onClick={() => onStanding(chosen ? null : key)}
              className={cn(
                "-mx-2 flex h-10 w-[calc(100%+1rem)] items-center gap-2.5 rounded-ui px-2 text-start text-[13.5px] font-medium text-foreground outline-none transition-colors",
                "hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/20",
                "disabled:pointer-events-none disabled:text-muted-foreground disabled:opacity-70",
                chosen && "bg-muted",
              )}
            >
              <Glyph aria-hidden className={cn("size-5 shrink-0", chosen ? "text-foreground" : "text-muted-foreground")} />
              <span className="min-w-0 flex-1 truncate">{standingWords[key]}</span>
              {count === undefined ? null : (
                <span
                  className={cn(
                    "grid h-[22px] min-w-6 shrink-0 place-items-center rounded-ui border border-border bg-background px-1.5 text-xs font-medium",
                    key === "connected" && "border-green-500/35 bg-green-500/10 text-green-700 dark:text-green-400",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showGroups ? (
        <div role="group" aria-labelledby={categoriesId} className="mt-6">
          <p id={categoriesId} className="mb-1 text-[13px] text-muted-foreground">
            {t("categories")}
          </p>
          <label className="flex h-[38px] cursor-pointer items-center gap-2.5 text-[13.5px] text-foreground">
            <input
              type="checkbox"
              checked={groups.length === 0}
              onChange={() => onGroups([])}
              className="form-checkbox accent-foreground md:h-[18px] md:w-[18px] dark:[color-scheme:dark]"
            />
            {tCommon("all")}
          </label>
          {GROUPS.map((group) => (
            <label key={group} className="flex h-[38px] cursor-pointer items-center gap-2.5 text-[13.5px] text-foreground">
              <input
                type="checkbox"
                checked={groups.includes(group)}
                onChange={() => toggleGroup(group)}
                className="form-checkbox accent-foreground md:h-[18px] md:w-[18px] dark:[color-scheme:dark]"
              />
              {groupWords[group]}
            </label>
          ))}
        </div>
      ) : null}
    </>
  );
}
