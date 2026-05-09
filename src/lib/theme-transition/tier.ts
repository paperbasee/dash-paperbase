import { THEME_TRANSITION_CONFIG, type TransitionTier } from "./config";
import { canUseAdvancedCooldown, getThemeTransitionSessionState } from "./perf";

function getDeviceMemoryGb(): number | null {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return typeof nav.deviceMemory === "number" ? nav.deviceMemory : null;
}

function getHardwareConcurrency(): number | null {
  return typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : null;
}

function isLikelyMobile(): boolean {
  // Prefer capability media queries over UA sniffing.
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(pointer: coarse)").matches ||
    window.matchMedia?.("(hover: none)").matches ||
    window.matchMedia?.("(max-width: 767.98px)").matches
  );
}

function isLowEndDevice(): boolean {
  const mem = getDeviceMemoryGb();
  const cores = getHardwareConcurrency();
  const lowMem =
    typeof mem === "number" && mem > 0 && mem <= THEME_TRANSITION_CONFIG.capability.lowEndDeviceMemoryGb;
  const lowCores =
    typeof cores === "number" && cores > 0 && cores <= THEME_TRANSITION_CONFIG.capability.lowEndHardwareConcurrency;
  return lowMem || lowCores;
}

function isHighEndDesktop(): boolean {
  if (typeof window === "undefined") return false;
  const finePointer = window.matchMedia?.("(pointer: fine)").matches;
  const hover = window.matchMedia?.("(hover: hover)").matches;
  if (!finePointer || !hover) return false;
  if (isLikelyMobile()) return false;

  const mem = getDeviceMemoryGb();
  const cores = getHardwareConcurrency();
  const memOk =
    mem == null || mem >= THEME_TRANSITION_CONFIG.capability.highEndDeviceMemoryGb;
  const coresOk =
    cores == null || cores >= THEME_TRANSITION_CONFIG.capability.highEndHardwareConcurrency;
  return memOk && coresOk;
}

export function getThemeTransitionTier(): TransitionTier {
  if (typeof window === "undefined") return "instant";

  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return "instant";

  const session = getThemeTransitionSessionState();
  if (session.forcedTier) return session.forcedTier;

  // If we're unstable or constrained, stay instant.
  if (isLowEndDevice()) return "instant";

  const supportsViewTransitions = typeof document.startViewTransition === "function";
  const mobile = isLikelyMobile();

  if (mobile) {
    // Modern mobile: fade only. If no VT support, fall back to instant (CSS html transition may still soften).
    return supportsViewTransitions ? "fade" : "instant";
  }

  // Desktop/high-end: allow advanced when supported and not spammed.
  if (supportsViewTransitions && isHighEndDesktop() && canUseAdvancedCooldown()) {
    return "advanced";
  }

  // Everything else: conservative fade if VT exists, otherwise instant.
  return supportsViewTransitions ? "fade" : "instant";
}

