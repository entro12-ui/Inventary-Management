import * as React from "react";

import { apiRequest } from "@/api/client";
import { clearToken, getToken, setToken } from "@/auth/authStorage";
import type { TokenResponse, User } from "@/auth/types";

type AuthContextValue = {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    fullName: string,
    opts: { businessName: string; phone?: string; branches?: { name: string; location?: string }[] }
  ) => Promise<void>;
  activateAccount: (email: string, otp: string, newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = React.useState<string | null>(() => getToken());
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let canceled = false;
    async function bootstrap() {
      const stored = getToken();
      if (!stored) {
        if (!canceled) {
          setTokenState(null);
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const me = await apiRequest<User>("/api/auth/me", { token: stored });
        if (!canceled) {
          setTokenState(stored);
          setUser(me);
        }
      } catch {
        clearToken();
        if (!canceled) {
          setTokenState(null);
          setUser(null);
        }
      } finally {
        if (!canceled) setIsLoading(false);
      }
    }

    bootstrap();
    return () => {
      canceled = true;
    };
  }, []);

  async function login(email: string, password: string) {
    const data = await apiRequest<TokenResponse>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setToken(data.access_token);
    setTokenState(data.access_token);
    setUser(data.user);
  }

  async function register(
    email: string,
    fullName: string,
    opts: { businessName: string; phone?: string; branches?: { name: string; location?: string }[] }
  ) {
    const body: Record<string, unknown> = { email, full_name: fullName, business_name: opts.businessName.trim() };
    if (opts.phone?.trim()) body.phone = opts.phone.trim();
    if (opts.branches?.length) body.branches = opts.branches;
    await apiRequest<{ message: string }>("/api/auth/register", {
      method: "POST",
      body,
    });
  }

  async function activateAccount(email: string, otp: string, newPassword: string) {
    const data = await apiRequest<TokenResponse>("/api/auth/activate-account", {
      method: "POST",
      body: { email, otp, new_password: newPassword },
    });
    setToken(data.access_token);
    setTokenState(data.access_token);
    setUser(data.user);
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    await apiRequest<{ message: string }>("/api/auth/change-password", {
      method: "POST",
      body: { current_password: currentPassword, new_password: newPassword },
      token: token ?? undefined,
    });
  }

  function logout() {
    clearToken();
    setTokenState(null);
    setUser(null);
  }

  const value: AuthContextValue = {
    token,
    user,
    isLoading,
    login,
    register,
    activateAccount,
    changePassword,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
