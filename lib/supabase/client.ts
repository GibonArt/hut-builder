"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Sezona } from "@/lib/sezona";
import {
  assertSupabaseEnv,
  authSupabaseEnv,
  dataSupabaseEnv,
} from "@/lib/supabase/env";

/** Klient pro Auth (vždy primární / NHL26 projekt). Singleton OK. */
export function createAuthClient(): SupabaseClient {
  const env = authSupabaseEnv();
  assertSupabaseEnv(env, "Auth / NHL26");
  return createBrowserClient(env.url, env.publicKey);
}

/**
 * Datový klient pro sezónu.
 * NHL26 = stejný projekt jako Auth (singleton).
 * NHL27 = druhý PostgREST — JWT bere z Auth klienta (`accessToken`),
 * ne přes `setSession` na NHL27 GoTrue (tam uživatel neexistuje → anon → RLS).
 */
export function createDataClient(sezona: Sezona): SupabaseClient {
  if (sezona === "nhl26") {
    return createAuthClient();
  }

  const env = dataSupabaseEnv(sezona);
  assertSupabaseEnv(env, `data ${sezona}`);
  return createBrowserClient(env.url, env.publicKey, {
    isSingleton: false,
    accessToken: async () => {
      const auth = createAuthClient();
      const { data } = await auth.auth.getSession();
      return data.session?.access_token ?? null;
    },
    auth: {
      // Session drží jen Auth klient; data klient jen přeposílá access token.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: `hut-data-${sezona}`,
    },
  });
}

/** @deprecated Použij `createAuthClient` nebo `createDataClient(sezona)`. */
export function createClient(): SupabaseClient {
  return createAuthClient();
}
