import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type HealthOk = { ok: true };
type HealthFail = { ok: false; error: string };

function fail(error: string) {
  return Response.json({ ok: false, error } satisfies HealthFail, {
    status: 503,
  });
}

export async function GET() {
  let env: ReturnType<typeof getSupabaseEnv>;
  try {
    env = getSupabaseEnv();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Configuración inválida");
  }

  try {
    // Validates client + cookies; with no session it returns null without a network call.
    const supabase = await createClient();
    const { error } = await supabase.auth.getClaims();
    if (error) return fail(`Auth: ${error.message}`);

    // Real connectivity check against the project.
    const res = await fetch(`${env.url}/auth/v1/health`, {
      headers: { apikey: env.publishableKey },
      cache: "no-store",
    });
    if (!res.ok) return fail(`Supabase respondió ${res.status}`);
  } catch {
    return fail("No se pudo conectar con Supabase");
  }

  return Response.json({ ok: true } satisfies HealthOk);
}
