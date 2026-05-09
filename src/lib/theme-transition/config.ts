export type TransitionTier = "advanced" | "fade" | "instant";

export const THEME_TRANSITION_CONFIG = {
  /** Observation window after toggle for perf scoring. */
  perfWindowMs: 500,
  /** Consider a "dropped" frame if it exceeds this delta. */
  droppedFrameThresholdMs: 24,
  /** If we see at least this many dropped frames, downgrade. */
  downgradeDroppedFramesAt: 4,
  /** If long tasks exceed this count, downgrade. */
  downgradeLongTasksAt: 1,
  /** Minimum time between expensive transitions (ms). */
  minAdvancedCooldownMs: 1200,

  durations: {
    advancedMs: 400,
    fadeMs: 180,
  },

  easing: {
    standard: "cubic-bezier(0.4, 0, 0.2, 1)",
  },

  capability: {
    /** Treat devices at/below these as constrained. */
    lowEndDeviceMemoryGb: 4,
    lowEndHardwareConcurrency: 4,
    /** Prefer advanced only when at/above these hints. */
    highEndDeviceMemoryGb: 8,
    highEndHardwareConcurrency: 8,
  },
} as const;

