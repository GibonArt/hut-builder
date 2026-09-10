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
 * NHL27 = druhý klient — `isSingleton: false`, jinak by SSR vrátil cached Auth/NHL26 klienta.
 */
export function createDataClient(sezona: Sezona): SupabaseClient {
  if (sezona === "nhl26") {
    return createAuthClient();
  }

  const env = dataSupabaseEnv(sezona);
  assertSupabaseEnv(env, `data ${sezona}`);
  return createBrowserClient(env.url, env.publicKey, {
    isSingleton: false,
    auth: {
      storageKey: `hut-data-${sezona}`,
      // Session kopíruje SezonaProvider z Auth; refresh řeší Auth klient.
      autoRefreshToken: false,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

/** @deprecated Použij `createAuthClient` nebo `createDataClient(sezona)`. */
export function createClient(): SupabaseClient {
  return createAuthClient();
}
