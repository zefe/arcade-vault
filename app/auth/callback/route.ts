import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { safeNext } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

type Notice = "correo" | "oauth" | "enlace";

// Relative redirects keep the Host of the request (localhost or LAN).
function noticePath(notice: Notice, next: string) {
  return `/auth?${new URLSearchParams({ aviso: notice, next })}`;
}

// Destination of the confirmation email (flow=email) and of Google/GitHub (flow=oauth).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNext(params.get("next"));
  const isEmail = params.get("flow") === "email";

  if (params.has("error") || params.has("error_code")) {
    redirect(noticePath(isEmail ? "enlace" : "oauth", next));
  }

  redirect(await exchange(params.get("code"), isEmail, next));
}

async function exchange(
  code: string | null,
  isEmail: boolean,
  next: string,
): Promise<string> {
  // Email opened in another browser: the account is confirmed, but the PKCE verifier isn't here.
  const failed = noticePath(isEmail ? "correo" : "oauth", next);
  if (!code) return failed;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("No se pudo canjear el código", error.code ?? error.name);
    return failed;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  // A failed read is never "needs-alias".
  if (profileError) {
    console.error("No se pudo leer el perfil", profileError);
    return next;
  }

  return profile ? next : `/auth/alias?${new URLSearchParams({ next })}`;
}
