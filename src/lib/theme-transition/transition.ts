import type { ThemePreference } from "@/lib/theme";
import {
  applyThemePreferenceToDom,
  persistAppliedTheme,
  persistThemePreference,
} from "@/lib/theme";
import { THEME_TRANSITION_CONFIG, type TransitionTier } from "./config";
import { runWhenIdle } from "./idle";
import { measureThemeTogglePerformance, recordThemeTogglePerfAndMaybeDowngrade, markAdvancedUsed } from "./perf";
import { getThemeTransitionTier } from "./tier";

export type ThemeTransitionOptions = {
  next: ThemePreference;
  event: { clientX: number; clientY: number };
  setThemePreferenceState: (next: ThemePreference) => void;
};

function startThemeTransitioning() {
  const root = document.documentElement;
  root.classList.add("theme-transitioning");
}

function stopThemeTransitioning() {
  const root = document.documentElement;
  root.classList.remove("theme-transitioning");
  root.removeAttribute("data-theme-ripple");
  root.removeAttribute("data-theme-fade");
  root.style.removeProperty("--ripple-x");
  root.style.removeProperty("--ripple-y");
  root.style.removeProperty("--ripple-radius");
}

function deferPersistence(pref: ThemePreference, applied: "light" | "dark") {
  runWhenIdle(() => {
    persistThemePreference(pref);
    persistAppliedTheme(applied);
  });
}

function animateRipple({
  x,
  y,
  endRadius,
  duration,
}: {
  x: number;
  y: number;
  endRadius: number;
  duration: number;
}) {
  const root = document.documentElement;
  root.animate(
    {
      clipPath: [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ],
    },
    {
      duration,
      easing: THEME_TRANSITION_CONFIG.easing.standard,
      pseudoElement: "::view-transition-new(root)",
    }
  );
}

function animateFade({ duration }: { duration: number }) {
  const root = document.documentElement;
  root.animate(
    { opacity: [0, 1] },
    {
      duration,
      easing: THEME_TRANSITION_CONFIG.easing.standard,
      pseudoElement: "::view-transition-new(root)",
    }
  );
}

export function runThemeTransition({ next, event, setThemePreferenceState }: ThemeTransitionOptions) {
  if (typeof window === "undefined") return;

  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    const applied = applyThemePreferenceToDom(next);
    setThemePreferenceState(next);
    deferPersistence(next, applied);
    return;
  }

  const tier: TransitionTier = getThemeTransitionTier();
  const { clientX: x, clientY: y } = event;

  const supportsViewTransitions = typeof document.startViewTransition === "function";
  startThemeTransitioning();

  const finalize = () => {
    stopThemeTransitioning();
  };

  const recordPerf = () => {
    void measureThemeTogglePerformance(tier).then((sample) => {
      recordThemeTogglePerfAndMaybeDowngrade(sample);
    });
  };

  if (tier === "instant" || !supportsViewTransitions) {
    const applied = applyThemePreferenceToDom(next);
    setThemePreferenceState(next);
    deferPersistence(next, applied);
    recordPerf();
    finalize();
    return;
  }

  if (tier === "fade") {
    const root = document.documentElement;
    root.setAttribute("data-theme-fade", "1");

    const transition = document.startViewTransition(() => {
      const applied = applyThemePreferenceToDom(next);
      setThemePreferenceState(next);
      deferPersistence(next, applied);
    });

    transition.ready
      .then(() => {
        animateFade({ duration: THEME_TRANSITION_CONFIG.durations.fadeMs });
      })
      .finally(() => {
        void transition.finished.finally(() => {
          recordPerf();
          finalize();
        });
      });
    return;
  }

  // tier === "advanced"
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  const root = document.documentElement;
  root.style.setProperty("--ripple-x", `${x}px`);
  root.style.setProperty("--ripple-y", `${y}px`);
  root.style.setProperty("--ripple-radius", `${endRadius}px`);
  root.setAttribute("data-theme-ripple", "1");

  const transition = document.startViewTransition(() => {
    const applied = applyThemePreferenceToDom(next);
    setThemePreferenceState(next);
    deferPersistence(next, applied);
  });

  transition.ready
    .then(() => {
      markAdvancedUsed();
      animateRipple({
        x,
        y,
        endRadius,
        duration: THEME_TRANSITION_CONFIG.durations.advancedMs,
      });
    })
    .finally(() => {
      void transition.finished.finally(() => {
        recordPerf();
        finalize();
      });
    });
}

