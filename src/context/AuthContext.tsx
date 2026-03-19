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
  type LoginResponse,
} from "@/lib/auth";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  register: (
    email: string,
    password: string,
    password_confirm: string
  ) => Promise<LoginResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    setIsAuthenticated(!!token);
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authLogin(email, password);
    setIsAuthenticated(true);
    return result;
  }, []);

  const register = useCallback(
    async (email: string, password: string, password_confirm: string) => {
      const result = await authRegister(email, password, password_confirm);
      setIsAuthenticated(true);
      return result;
    },
    []
  );

  const logout = useCallback(() => {
    authLogout();
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, login, register, logout }}
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
