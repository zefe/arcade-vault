"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type User = { name: string };
export type SavedScore = { game: string; score: number; name: string; at: number };

const USER_KEY = "av_user";
const SCORES_KEY = "av_scores";

type UserContextValue = {
  user: User | null;
  login: (u: User) => void;
  logout: () => void;
  saveScore: (entry: Omit<SavedScore, "at">) => void;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  // First render is always guest; av_user is read after mount to avoid hydration mismatch.
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      // Intentional: localStorage is only readable after mount (hydration-safe).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setUser(JSON.parse(raw) as User);
    } catch {}
  }, []);

  const login = useCallback((u: User) => {
    setUser(u);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch {}
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(USER_KEY);
    } catch {}
  }, []);

  const saveScore = useCallback((entry: Omit<SavedScore, "at">) => {
    try {
      const all = JSON.parse(localStorage.getItem(SCORES_KEY) || "[]") as SavedScore[];
      all.push({ ...entry, at: Date.now() });
      localStorage.setItem(SCORES_KEY, JSON.stringify(all));
    } catch {}
  }, []);

  const value = useMemo(() => ({ user, login, logout, saveScore }), [user, login, logout, saveScore]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
}
