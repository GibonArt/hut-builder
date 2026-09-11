"use client";

import { createBrowserClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

async function accessTokenZAuth(): Promise<string | null> {
  const auth = createAuthClient();
  const { data } = await auth.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Datový klient pro sezónu.
 * NHL26 = stejný projekt jako Auth (singleton).
 * NHL27 = čistý `createClient` (ne `@supabase/ssr`) — `createBrowserClient`
 * přepisuje auth options a `setSession` na NHL27 GoTrue session zničí.
 * JWT vždy z Auth klienta přes `accessToken`.
 */
export function createDataClient(sezona: Sezona): SupabaseClient {
  if (sezona === "nhl26") {
    return createAuthClient();
  }

  const env = dataSupabaseEnv(sezona);
  assertSupabaseEnv(env, `data ${sezona}`);
  return createClient(env.url, env.publicKey, {
    accessToken: accessTokenZAuth,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/** @deprecated Použij `createAuthClient` nebo `createDataClient(sezona)`. */
export function createClient(): SupabaseClient {
  return createAuthClient();
}
