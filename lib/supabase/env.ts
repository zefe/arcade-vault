export function getSupabaseEnv(): { url: string; publishableKey: string } {
  // Literal access so Next inlines NEXT_PUBLIC_* into the client bundle.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local",
    );
  }

  return { url, publishableKey };
}
