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
import {
  signup as authSignup,
  passkeyLogin as authPasskeyLogin,
  enrollPasskey as authEnrollPasskey,
  requestMagicLink as authRequestMagicLink,
  verifyMagicLink as authVerifyMagicLink,
  logout as authLogout,
  type AuthTokens,
  type SignupResponse,
  type MagicLinkPurpose,
  type MagicLinkVerifyResult,
  type PasskeyInfo,
} from "@/lib/auth";
import { clearPendingVerificationEmail } from "@/lib/verification-state";
import type { MeForRouting } from "@/lib/subscription-access";
import {
  ensureMeProfile,
  getHydratedMeProfile,
  ME_PROFILE_PERSIST_EVENT,
  ME_PROFILE_STORAGE_KEY,
} from "@/lib/me-profile-store";
import { refreshAccessTokenOrThrow } from "@/lib/api";

export type MeProfileStatus = "idle" | "loading" | "ready" | "error";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingOut: boolean;
  /** True after first client mount (avoids SSR/client hydration mismatch for auth-derived UI). */
  authHydrated: boolean;
  /** True while a network refresh of `me` is in flight (may be true while status is already `ready`). */
  meProfileFetching: boolean;
  meProfile: MeForRouting | null;
  meProfileStatus: MeProfileStatus;
  /** Raw error from the last failed ensureMeProfile call; null when status is not "error". */
  meProfileError: unknown;
  refreshMeProfile: () => Promise<void>;
  /** Passwordless sign-in with a passkey (discoverable when no email given). */
  signInWithPasskey: (email?: string) => Promise<AuthTokens>;
  signup: (
    email: string,
    firstName: string,
    lastName: string,
    cf_turnstile_response?: string
  ) => Promise<SignupResponse>;
  /** Create a passkey; bootstrap flows pass a ticket and get logged in. */
  enrollPasskey: (opts: {
    enrollmentTicket?: string;
    name?: string;
  }) => Promise<{ tokens?: AuthTokens; credential: PasskeyInfo }>;
  requestMagicLink: (
    email: string,
    purpose: MagicLinkPurpose
  ) => Promise<{ message: string }>;
  verifyMagicLink: (token: string) => Promise<MagicLinkVerifyResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return true;
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    if (typeof payload.exp !== "number") return true;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [authHydrated, setAuthHydrated] = useState(false);

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

  useEffect(() => {
    let cancelled = false;

    const bootstrapAuth = async () => {
      const accessToken = localStorage.getItem("access_token");
      const refreshToken = localStorage.getItem("refresh_token");

      if (accessToken && !isTokenExpired(accessToken)) {
        if (!cancelled) {
          setIsAuthenticated(true);
          setAuthHydrated(true);
        }
        return;
      }

      if (!refreshToken) {
        if (!cancelled) {
          setIsAuthenticated(false);
          setAuthHydrated(true);
        }
        return;
      }

      try {
        await refreshAccessTokenOrThrow();
        if (!cancelled) {
          setIsAuthenticated(true);
        }
      } catch {
        if (!cancelled) {
          setIsAuthenticated(false);
        }
      } finally {
        if (!cancelled) {
          setAuthHydrated(true);
        }
      }
    };

    void bootstrapAuth();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const lastRemoteLogoutAt = useRef(0);
  const lastProfileStorageEventAt = useRef(0);
  const handleRemoteSessionChange = useCallback(
    (e: StorageEvent) => {
      if (e.storageArea !== localStorage) return;

      const tokenRemoved =
        (e.key === "access_token" || e.key === "refresh_token") &&
        e.oldValue != null &&
        e.newValue == null;
      if (tokenRemoved) {
        const now = Date.now();
        if (now - lastRemoteLogoutAt.current < 400) return;
        lastRemoteLogoutAt.current = now;
        setIsAuthenticated(false);
        setMeProfileFromStore(null, "idle");
        setMeProfileFetching(false);
        const path = window.location.pathname;
        if (!path.includes("/login")) {
          window.location.replace("/login");
        }
        return;
      }

      if (e.key === ME_PROFILE_STORAGE_KEY && isAuthenticatedRef.current) {
        const now = Date.now();
        if (now - lastProfileStorageEventAt.current < 400) return;
        lastProfileStorageEventAt.current = now;

        if (e.newValue == null && e.oldValue != null) {
          setMeProfileFromStore(null, "loading");
          setMeProfileFetching(true);
          ensureMeProfile({ forceNetwork: true })
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
      }
    },
    [setMeProfileFromStore]
  );

  useEffect(() => {
    window.addEventListener("storage", handleRemoteSessionChange);
    return () => window.removeEventListener("storage", handleRemoteSessionChange);
  }, [handleRemoteSessionChange]);

  const refreshMeProfile = useCallback(async () => {
    if (!isAuthenticated) return;
    setMeProfileFetching(true);
    try {
      const m = await ensureMeProfile({ forceNetwork: true });
      setMeProfileError(null);
      setMeProfileFromStore(m, "ready");
    } catch (err: unknown) {
      setMeProfileError(err);
      setMeProfileFromStore(null, "error");
    } finally {
      setMeProfileFetching(false);
    }
  }, [isAuthenticated, setMeProfileFromStore]);

  const signInWithPasskey = useCallback(async (email?: string) => {
    const tokens = await authPasskeyLogin(email);
    setIsAuthenticated(true);
    clearPendingVerificationEmail();
    return tokens;
  }, []);

  const signup = useCallback(
    async (email: string, firstName: string, lastName: string, cf?: string) => {
      return authSignup(email, firstName, lastName, cf);
    },
    []
  );

  const enrollPasskey = useCallback(
    async (opts: { enrollmentTicket?: string; name?: string }) => {
      const result = await authEnrollPasskey(opts);
      if (result.tokens) {
        setIsAuthenticated(true);
        clearPendingVerificationEmail();
      }
      return result;
    },
    []
  );

  const requestMagicLink = useCallback(
    async (email: string, purpose: MagicLinkPurpose) => {
      return authRequestMagicLink(email, purpose);
    },
    []
  );

  const verifyMagicLink = useCallback(async (token: string) => {
    const result = await authVerifyMagicLink(token);
    if (result.action === "signed_in") {
      setIsAuthenticated(true);
      clearPendingVerificationEmail();
    }
    return result;
  }, []);

  const logout = useCallback(() => {
    setIsLoggingOut(true);
    authLogout();
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        isLoggingOut,
        authHydrated,
        meProfileFetching,
        meProfile,
        meProfileStatus,
        meProfileError,
        refreshMeProfile,
        signInWithPasskey,
        signup,
        enrollPasskey,
        requestMagicLink,
        verifyMagicLink,
        logout,
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
