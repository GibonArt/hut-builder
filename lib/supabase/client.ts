"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Sezona } from "@/lib/sezona";
import {
  assertSupabaseEnv,
  authSupabaseEnv,
  dataSupabaseEnv,
} from "@/lib/supabase/env";

/** Klient pro Auth (vždy primární / NHL26 projekt). */
export function createAuthClient(): SupabaseClient {
  const env = authSupabaseEnv();
  assertSupabaseEnv(env, "Auth / NHL26");
  return createBrowserClient(env.url, env.publicKey);
}

/**
 * Datový klient pro sezónu.
 * Pro NHL27 musí mít oba projekty stejný JWT secret, jinak `setSession` z Auth neprojde RLS.
 */
export function createDataClient(sezona: Sezona): SupabaseClient {
  const env = dataSupabaseEnv(sezona);
  assertSupabaseEnv(env, `data ${sezona}`);
  return createBrowserClient(env.url, env.publicKey);
}

/** @deprecated Použij `createAuthClient` nebo `createDataClient(sezona)`. */
export function createClient(): SupabaseClient {
  return createAuthClient();
}
