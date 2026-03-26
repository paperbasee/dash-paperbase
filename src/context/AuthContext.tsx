"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  login as authLogin,
  register as authRegister,
  logout as authLogout,
  verifyTwoFactorChallenge as authVerifyTwoFactorChallenge,
  type LoginResult,
  type LoginResponse,
  type PendingTwoFactorResponse,
  type RegisterResponse,
} from "@/lib/auth";

interface AuthState {
  isAuthenticated: boolean;
  pendingTwoFactor: PendingTwoFactorResponse | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (
    email: string,
    password: string,
    password_confirm: string
  ) => Promise<RegisterResponse | PendingTwoFactorResponse>;
  verifyTwoFactorChallenge: (
    challengeId: string,
    code: string
  ) => Promise<LoginResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pendingTwoFactor, setPendingTwoFactor] = useState<PendingTwoFactorResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    setIsAuthenticated(!!token);
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authLogin(email, password);
    if ("2fa_required" in result) {
      setPendingTwoFactor(result);
      setIsAuthenticated(false);
      return result;
    }
    setPendingTwoFactor(null);
    setIsAuthenticated(true);
    return result;
  }, []);

  const register = useCallback(
    async (email: string, password: string, password_confirm: string) => {
      const result = await authRegister(email, password, password_confirm);
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
    return result;
  }, []);

  const logout = useCallback(() => {
    authLogout();
    setPendingTwoFactor(null);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, pendingTwoFactor, isLoading, login, register, verifyTwoFactorChallenge, logout }}
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
