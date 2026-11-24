import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

// Refreshes the session. It never redirects nor authorizes: every route is playable as guest.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  try {
    const { url, publishableKey } = getSupabaseEnv();

    const supabase = createServerClient<Database>(url, publishableKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // Request: the Server Components of this same render see the new tokens.
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          // Response: the browser stores them, and no cache keeps them.
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    });

    // Must run before returning the response: it validates the JWT and refreshes it if expired.
    await supabase.auth.getClaims();
  } catch (error) {
    // A Supabase failure must not take the site down.
    console.error("No se pudo refrescar la sesión", error);
  }

  return response;
}
