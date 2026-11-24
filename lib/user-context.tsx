"use client";

import { createContext, useContext, useEffect, useMemo } from "react";

export type User = { name: string };

type UserContextValue = { user: User | null; needsAlias: boolean };

const UserContext = createContext<UserContextValue | null>(null);

// Fed by the server session (app/layout.tsx): no guest flash, no hydration mismatch.
export function UserProvider({
  name,
  needsAlias,
  children,
}: {
  name: string | null;
  needsAlias: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Leftover of the old simulated login.
    try {
      localStorage.removeItem("av_user");
    } catch {}
  }, []);

  const value = useMemo(
    () => ({ user: name === null ? null : { name }, needsAlias }),
    [name, needsAlias],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
}
