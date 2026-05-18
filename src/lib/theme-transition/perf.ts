import { THEME_TRANSITION_CONFIG, type TransitionTier } from "./config";

export type ThemeTogglePerfSample = {
  tier: TransitionTier;
  windowMs: number;
  droppedFrames: number;
  longTasks: number;
  worstFrameMs: number;
};

type SessionState = {
  forcedTier?: TransitionTier;
  downgradedAt?: number;
  lastAdvancedAt?: number;
  recentSamples: ThemeTogglePerfSample[];
};

const FORCED_TIER_EXPIRY_MS = 60_000;

const SESSION_KEY = "pb_theme_transition_state_v1";

function readSessionState(): SessionState {
  if (typeof window === "undefined") return { recentSamples: [] };
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { recentSamples: [] };
    const parsed = JSON.parse(raw) as SessionState;
    const state: SessionState = {
      forcedTier: parsed.forcedTier,
      downgradedAt: typeof parsed.downgradedAt === "number" ? parsed.downgradedAt : undefined,
      lastAdvancedAt: typeof parsed.lastAdvancedAt === "number" ? parsed.lastAdvancedAt : undefined,
      recentSamples: Array.isArray(parsed.recentSamples) ? parsed.recentSamples.slice(-10) : [],
    };

    if (state.forcedTier && Date.now() - (state.downgradedAt ?? 0) > FORCED_TIER_EXPIRY_MS) {
      const cleared: SessionState = {
        ...state,
        forcedTier: undefined,
        downgradedAt: undefined,
      };
      writeSessionState(cleared);
      return cleared;
    }

    return state;
  } catch {
    return { recentSamples: [] };
  }
}

function writeSessionState(next: SessionState) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / privacy mode
  }
}

export function getThemeTransitionSessionState(): SessionState {
  return readSessionState();
}

export function markAdvancedUsed(now = Date.now()) {
  const s = readSessionState();
  writeSessionState({ ...s, lastAdvancedAt: now });
}

export function canUseAdvancedCooldown(now = Date.now()): boolean {
  const s = readSessionState();
  if (!s.lastAdvancedAt) return true;
  return now - s.lastAdvancedAt >= THEME_TRANSITION_CONFIG.minAdvancedCooldownMs;
}

export async function measureThemeTogglePerformance(
  tier: TransitionTier,
  windowMs = THEME_TRANSITION_CONFIG.perfWindowMs
): Promise<ThemeTogglePerfSample> {
  if (typeof window === "undefined") {
    return { tier, windowMs, droppedFrames: 0, longTasks: 0, worstFrameMs: 0 };
  }

  let longTasks = 0;
  let observer: PerformanceObserver | null = null;
  try {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === "longtask") longTasks += 1;
      }
    });
    observer.observe({ entryTypes: ["longtask"] as never });
  } catch {
    observer = null;
  }

  const droppedThreshold = THEME_TRANSITION_CONFIG.droppedFrameThresholdMs;
  const start = performance.now();
  let last = start;
  let droppedFrames = 0;
  let worstFrameMs = 0;

  await new Promise<void>((resolve) => {
    const tick = () => {
      const now = performance.now();
      const dt = now - last;
      if (dt > worstFrameMs) worstFrameMs = dt;
      if (dt >= droppedThreshold) droppedFrames += 1;
      last = now;
      if (now - start >= windowMs) {
        resolve();
        return;
      }
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  });

  observer?.disconnect();

  return { tier, windowMs, droppedFrames, longTasks, worstFrameMs };
}

export function recordThemeTogglePerfAndMaybeDowngrade(sample: ThemeTogglePerfSample) {
  const s = readSessionState();
  const recentSamples = [...(s.recentSamples ?? []), sample].slice(-10);

  const shouldDowngrade =
    sample.longTasks >= THEME_TRANSITION_CONFIG.downgradeLongTasksAt ||
    sample.droppedFrames >= THEME_TRANSITION_CONFIG.downgradeDroppedFramesAt;

  const next: SessionState = {
    ...s,
    recentSamples,
    forcedTier: shouldDowngrade ? "instant" : s.forcedTier,
    downgradedAt: shouldDowngrade ? Date.now() : s.downgradedAt,
  };

  writeSessionState(next);
}

