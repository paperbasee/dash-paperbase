export type PageType = "home";

export type PlacementEntry = {
  placement: string;
  page: PageType;
  zone: string;
  label: string;
};

export const PLACEMENT_CONFIG: Record<string, PlacementEntry> = {
  home_top: {
    placement: "home_top",
    page: "home",
    zone: "top",
    label: "Home Top — Navbar / Hero area",
  },
  home_bottom: {
    placement: "home_bottom",
    page: "home",
    zone: "bottom",
    label: "Home Bottom — Footer area",
  },
};

export const PLACEMENT_OPTIONS: Array<{ value: string; label: string }> =
  Object.values(PLACEMENT_CONFIG).map((entry) => ({
    value: entry.placement,
    label: entry.label.split("—")[0].trim(),
  }));
