"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, ApiError } from "./api";
import { User, UserRole } from "./types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("rideshare_token");
    if (!storedToken) {
      setLoading(false);
      return;
    }
    setToken(storedToken);
    api
      .get<{ user: User }>("/api/auth/me")
      .then(({ user }) => setUser(user))
      .catch(() => {
        localStorage.removeItem("rideshare_token");
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const { token, user } = await api.post<{ token: string; user: User }>("/api/auth/login", {
      email,
      password,
    });
    localStorage.setItem("rideshare_token", token);
    setToken(token);
    setUser(user);
  }

  async function signup(email: string, password: string, name: string, role: UserRole) {
    const { token, user } = await api.post<{ token: string; user: User }>("/api/auth/signup", {
      email,
      password,
      name,
      role,
    });
    localStorage.setItem("rideshare_token", token);
    setToken(token);
    setUser(user);
  }

  function logout() {
    localStorage.removeItem("rideshare_token");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { ApiError };
