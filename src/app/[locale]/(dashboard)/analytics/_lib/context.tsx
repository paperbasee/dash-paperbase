"use client";

import { createContext, useContext } from "react";

import type { Format } from "./format";
import type { Compare } from "./period";
import type { SectionKey } from "./types";

/** What every section needs from the page: how to write numbers, what it compares with, and how to move to another section. */
export type AnalyticsView = {
  format: Format;
  compare: Compare;
  goTo: (section: SectionKey) => void;
};

const AnalyticsContext = createContext<AnalyticsView | null>(null);

export const AnalyticsProvider = AnalyticsContext.Provider;

export function useAnalyticsView(): AnalyticsView {
  const view = useContext(AnalyticsContext);
  if (!view) throw new Error("useAnalyticsView must be used inside the analytics page");
  return view;
}
