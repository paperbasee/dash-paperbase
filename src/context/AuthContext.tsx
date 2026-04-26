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
  login as authLogin,
  register as authRegister,
  logout as authLogout,
  verifyTwoFactorChallenge as authVerifyTwoFactorChallenge,
  requestTwoFactorChallengeRecoveryCode as authRequestTwoFactorChallengeRecoveryCode,
  verifyTwoFactorChallengeRecovery as authVerifyTwoFactorChallengeRecovery,
  type LoginResult,
  type LoginResponse,
  type PendingTwoFactorResponse,
  type RegisterResponse,
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
  pendingTwoFactor: PendingTwoFactorResponse | null;
  isLoading: boolean;
  /** True after first client mount (avoids SSR/client hydration mismatch for auth-derived UI). */
  authHydrated: boolean;
  /** True while a network refresh of `me` is in flight (may be true while status is already `ready`). */
  meProfileFetching: boolean;
  meProfile: MeForRouting | null;
  meProfileStatus: MeProfileStatus;
  /** Raw error from the last failed ensureMeProfile call; null when status is not "error". */
  meProfileError: unknown;
  refreshMeProfile: () => Promise<void>;
  login: (email: string, password: string, cf_turnstile_response?: string) => Promise<LoginResult>;
  register: (
    email: string,
    password: string,
    password_confirm: string,
    cf_turnstile_response?: string
  ) => Promise<RegisterResponse | PendingTwoFactorResponse>;
  verifyTwoFactorChallenge: (
    challengeId: string,
    code: string
  ) => Promise<LoginResponse>;
  requestTwoFactorChallengeRecoveryCode: (
    challengeId: string,
    email: string
  ) => Promise<{ detail: string; sent: boolean }>;
  verifyTwoFactorChallengeRecovery: (
    challengeId: string,
    code: string
  ) => Promise<LoginResponse>;
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
  const [pendingTwoFactor, setPendingTwoFactor] = useState<PendingTwoFactorResponse | null>(null);
  const [isLoading] = useState(false);
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
        setPendingTwoFactor(null);
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

  const login = useCallback(async (email: string, password: string, cf_turnstile_response?: string) => {
    const result = await authLogin(email, password, cf_turnstile_response);
    if ("2fa_required" in result) {
      setPendingTwoFactor(result);
      setIsAuthenticated(false);
      return result;
    }
    setPendingTwoFactor(null);
    setIsAuthenticated(true);
    clearPendingVerificationEmail();
    return result;
  }, []);

  const register = useCallback(
    async (email: string, password: string, password_confirm: string, cf_turnstile_response?: string) => {
      const result = await authRegister(email, password, password_confirm, cf_turnstile_response);
      if ("2fa_required" in result) {
        setPendingTwoFactor(result);
        setIsAuthenticated(false);
        return result;
      }
      setPendingTwoFactor(null);
      setIsAuthenticated(false);
      return result;
    },
    []
  );

  const verifyTwoFactorChallenge = useCallback(async (
    challengeId: string,
    code: string
  ) => {
    const result = await authVerifyTwoFactorChallenge(challengeId, code);
    setPendingTwoFactor(null);
    setIsAuthenticated(true);
    clearPendingVerificationEmail();
    return result;
  }, []);

  const requestTwoFactorChallengeRecoveryCode = useCallback(async (challengeId: string, email: string) => {
    return authRequestTwoFactorChallengeRecoveryCode(challengeId, email);
  }, []);

  const verifyTwoFactorChallengeRecovery = useCallback(async (
    challengeId: string,
    code: string
  ) => {
    const result = await authVerifyTwoFactorChallengeRecovery(challengeId, code);
    setPendingTwoFactor(null);
    setIsAuthenticated(true);
    clearPendingVerificationEmail();
    return result;
  }, []);

  const logout = useCallback(() => {
    authLogout();
    setPendingTwoFactor(null);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        pendingTwoFactor,
        isLoading,
        authHydrated,
        meProfileFetching,
        meProfile,
        meProfileStatus,
        meProfileError,
        refreshMeProfile,
        login,
        register,
        verifyTwoFactorChallenge,
        requestTwoFactorChallengeRecoveryCode,
        verifyTwoFactorChallengeRecovery,
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
