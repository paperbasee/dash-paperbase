"use client";

import { useState } from "react";

export type DeviceType = "mobile" | "tablet" | "desktop";

const DEVICE_WIDTHS: Record<DeviceType, string> = {
  mobile: "320px",
  tablet: "768px",
  desktop: "100%",
};

/** `widths` overrides the frame width per device, e.g. a wider phone for the theme editor. */
export function usePreviewDevice(
  initial: DeviceType = "desktop",
  widths: Partial<Record<DeviceType, string>> = {},
) {
  const [device, setDevice] = useState<DeviceType>(initial);
  return { device, setDevice, width: widths[device] ?? DEVICE_WIDTHS[device] };
}
