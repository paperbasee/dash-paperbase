export type TransitionTier = "advanced" | "fade" | "instant";

export const THEME_TRANSITION_CONFIG = {
  /** Observation window after toggle for perf scoring. */
  perfWindowMs: 500,
  /** Consider a "dropped" frame if it exceeds this delta. */
  droppedFrameThresholdMs: 24,
  /** If we see at least this many dropped frames, downgrade. */
  downgradeDroppedFramesAt: 8,
  /** If long tasks exceed this count, downgrade. */
  downgradeLongTasksAt: 3,
  /** Minimum time between expensive transitions (ms). */
  minAdvancedCooldownMs: 800,

  durations: {
    advancedMs: 280,
    fadeMs: 220,
  },

  easing: {
    standard: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
  },

  capability: {
    /** Treat devices at/below these as constrained. */
    lowEndDeviceMemoryGb: 2,
    lowEndHardwareConcurrency: 2,
    /** Prefer advanced only when at/above these hints. */
    highEndDeviceMemoryGb: 4,
    highEndHardwareConcurrency: 4,
  },
} as const;

