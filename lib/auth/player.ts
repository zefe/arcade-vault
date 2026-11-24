import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type Session =
  | { status: "guest" }
  | { status: "needs-alias" } // session without a profiles row
  | { status: "player"; id: string; name: string };

// Once per request: layout, pages and nav share the result.
export const getSession = cache(async (): Promise<Session> => {
  const supabase = await createClient();

  try {
    // getClaims() validates the JWT; Supabase's getSession() must not be trusted on the server.
    const { data: auth, error: authError } = await supabase.auth.getClaims();
    if (authError) throw authError;
    if (!auth) return { status: "guest" };

    const id = auth.claims.sub;
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;

    return profile
      ? { status: "player", id, name: profile.name }
      : { status: "needs-alias" };
  } catch (error) {
    // A failed read is never "needs-alias": the UI stays as guest.
    console.error("No se pudo leer la sesión", error);
    return { status: "guest" };
  }
});
