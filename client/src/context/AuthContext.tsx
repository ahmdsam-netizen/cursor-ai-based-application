import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { api, getToken } from "../api/client.js";

export interface User {
  id: string;
  email: string;
  name?: string;
  interests?: string[];
  favorites?: string[];
  role?: string;
  categoryViews?: Record<string, number>;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (email: string, password: string, name?: string, options?: any) => Promise<any>;
  registerOrganizer: (email: string, password: string, name?: string) => Promise<any>;
  logout: () => void;
  setInterests: (interests: string[]) => Promise<any>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { user: u } = await api.me();
      setUser(u);
    } catch {
      localStorage.removeItem("ef_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const data = await api.login({ email, password });
    localStorage.setItem("ef_token", data.token);
    setUser(data.user);
    return data;
  };

  const register = async (email: string, password: string, name?: string, options: any = {}) => {
    const data = await api.register({
      email,
      password,
      name,
      ...(options.asOrganizer ? { asOrganizer: true } : {}),
    });
    localStorage.setItem("ef_token", data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("ef_token");
    setUser(null);
  };

  const setInterests = async (interests: string[]) => {
    const { user: u } = await api.updateInterests(interests);
    setUser(u);
    return u;
  };

  const registerOrganizer = (email: string, password: string, name?: string) =>
    register(email, password, name, { asOrganizer: true });

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, registerOrganizer, logout, setInterests, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
