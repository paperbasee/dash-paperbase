"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { isSigningOut, logout as authLogout, signOut as authSignOut, SIGN_IN_CHANNEL, THIS_TAB } from "@/lib/auth";
import { clearAuthSessionCookie, hasAuthSessionCookie } from "@/lib/auth-session-cookie";
import { heldPass, holdPass, onSignedOut, renewIfStale, renewPass } from "@/lib/accounts/pass";
import type { MeForRouting } from "@/lib/subscription-access";
import {
  ensureMeProfile,
  getHydratedMeProfile,
  ME_PROFILE_PERSIST_EVENT,
  ME_PROFILE_STORAGE_KEY,
} from "@/lib/me-profile-store";

export type MeProfileStatus = "idle" | "loading" | "ready" | "error";

interface AuthState {
  isAuthenticated: boolean;
  isLoggingOut: boolean;
  /** True once this tab knows whether it is signed in (avoids SSR/client hydration mismatch). */
  authHydrated: boolean;
  /** Accounts could not be reached to know (lib/accounts/pass `unreachable`). */
  signInUnreachable: boolean;
  /** True while a network refresh of `me` is in flight (may be true while status is already `ready`). */
  meProfileFetching: boolean;
  meProfile: MeForRouting | null;
  meProfileStatus: MeProfileStatus;
  /** Raw error from the last failed ensureMeProfile call; null when status is not "error". */
  meProfileError: unknown;
  /** Back from Accounts with a pass (app/[locale]/auth/callback): this tab is signed in. */
  completeSignIn: (pass: string) => void;
  /** Leave for the sign-in page, forgetting this tab's sign-in (lib/auth logout). */
  logout: () => void;
  /** The Sign out a person presses: Accounts ends the sign-in (lib/auth signOut). */
  signOut: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

/**
 * Who is signed in, for the whole dashboard. Signing in is Accounts' (lib/accounts): this tab is
 * signed in while it holds a pass, which it asks Accounts for as it opens, when the browser looks
 * signed in (the `auth_session` hint), and renews before it runs out.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [authHydrated, setAuthHydrated] = useState(false);
  const [signInUnreachable, setSignInUnreachable] = useState(false);

  const [meProfile, setMeProfile] = useState<MeForRouting | null>(null);
  const [meProfileStatus, setMeProfileStatus] = useState<MeProfileStatus>("idle");
  const [meProfileError, setMeProfileError] = useState<unknown>(null);
  const [meProfileFetching, setMeProfileFetching] = useState(false);

  const isAuthenticatedRef = useRef(isAuthenticated);
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  /**
   * Single writer for runtime `me` + status (AuthContext is the only UI source of truth).
   */
  const setMeProfileFromStore = useCallback(
    (me: MeForRouting | null, status: MeProfileStatus) => {
      setMeProfile(me);
      setMeProfileStatus(status);
    },
    []
  );

  const logout = useCallback(() => {
    setIsLoggingOut(true);
    authLogout();
    setIsAuthenticated(false);
  }, []);

  const signOut = useCallback(() => {
    setIsLoggingOut(true);
    void authSignOut();
  }, []);

  const completeSignIn = useCallback((pass: string) => {
    holdPass(pass);
    setSignInUnreachable(false);
    setIsAuthenticated(true);
    setAuthHydrated(true);
  }, []);

  // As the tab opens: signed in if it already holds a pass (just back from Accounts), or if
  // Accounts gives one for the browser's sign-in.
  useEffect(() => {
    let cancelled = false;
    if (heldPass()) {
      setIsAuthenticated(true);
      setAuthHydrated(true);
      return;
    }
    if (!hasAuthSessionCookie()) {
      setAuthHydrated(true);
      return;
    }
    void renewPass().then((renewal) => {
      if (cancelled) return;
      if (renewal.kind === "renewed") {
        setIsAuthenticated(true);
      } else if (renewal.kind === "signed_out") {
        clearAuthSessionCookie();
      } else {
        setSignInUnreachable(true);
      }
      setAuthHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The sign-in ended -- found by a renewal, or another tab of this browser signed out: leave.
  useEffect(() => {
    const stopListening = onSignedOut(() => {
      if (!isSigningOut()) logout();
    });
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(SIGN_IN_CHANNEL);
      channel.onmessage = (event: MessageEvent<{ kind?: string; from?: string }>) => {
        const fromAnotherTab = event.data?.from !== THIS_TAB;
        if (event.data?.kind === "signed_out" && fromAnotherTab && isAuthenticatedRef.current) logout();
      };
    } catch {
      channel = null;
    }
    // A tab woken from sleep renews at once if its pass ran out meanwhile.
    const onVisible = () => {
      if (document.visibilityState === "visible") renewIfStale();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopListening();
      channel?.close();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [logout]);

  useEffect(() => {
    if (!isAuthenticated) {
      setMeProfileFromStore(null, "idle");
      setMeProfileError(null);
      setMeProfileFetching(false);
      return;
    }

    const hydrated = getHydratedMeProfile();
    if (hydrated) {
      // Keep cached me for continuity, but block dashboard render until the
      // first live auth/me verification completes to avoid dashboard flash.
      setMeProfile(hydrated);
      setMeProfileStatus("loading");
    } else {
      setMeProfileFromStore(null, "loading");
    }

    setMeProfileFetching(true);
    let cancelled = false;
    ensureMeProfile()
      .then((m) => {
        if (cancelled) return;
        setMeProfileError(null);
        setMeProfileFromStore(m, "ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setMeProfileError(err);
        setMeProfileFromStore(null, "error");
      })
      .finally(() => {
        if (!cancelled) setMeProfileFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, setMeProfileFromStore]);

  useEffect(() => {
    const onPersisted = () => {
      if (!isAuthenticatedRef.current) return;
      const next = getHydratedMeProfile();
      if (next) {
        setMeProfileFromStore(next, "ready");
      }
    };
    window.addEventListener(ME_PROFILE_PERSIST_EVENT, onPersisted);
    return () => window.removeEventListener(ME_PROFILE_PERSIST_EVENT, onPersisted);
  }, [setMeProfileFromStore]);

  // Another tab of this browser fetched or dropped the profile: this tab follows.
  const lastProfileStorageEventAt = useRef(0);
  const handleProfileStorage = useCallback(
    (e: StorageEvent) => {
      if (e.storageArea !== localStorage || e.key !== ME_PROFILE_STORAGE_KEY || !isAuthenticatedRef.current) return;
      const now = Date.now();
      if (now - lastProfileStorageEventAt.current < 400) return;
      lastProfileStorageEventAt.current = now;

      if (e.newValue == null && e.oldValue != null) {
        setMeProfileFromStore(null, "loading");
        setMeProfileFetching(true);
        ensureMeProfile()
          .then((m) => {
            setMeProfileError(null);
            setMeProfileFromStore(m, "ready");
          })
          .catch((err: unknown) => {
            setMeProfileError(err);
            setMeProfileFromStore(null, "error");
          })
          .finally(() => setMeProfileFetching(false));
        return;
      }
      if (e.newValue != null) {
        const next = getHydratedMeProfile();
        if (next) {
          setMeProfileFromStore(next, "ready");
        }
      }
    },
    [setMeProfileFromStore]
  );

  useEffect(() => {
    window.addEventListener("storage", handleProfileStorage);
    return () => window.removeEventListener("storage", handleProfileStorage);
  }, [handleProfileStorage]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoggingOut,
        authHydrated,
        signInUnreachable,
        meProfileFetching,
        meProfile,
        meProfileStatus,
        meProfileError,
        completeSignIn,
        logout,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
