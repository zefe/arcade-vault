import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

// Browser client. Import only from Client Components.
export function createClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, publishableKey);
}
