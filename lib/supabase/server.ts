import { createServerClient } from "@supabase/ssr";
import { createClient as createJsClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Sezona } from "@/lib/sezona";
import {
  assertSupabaseEnv,
  authSupabaseEnv,
  dataSupabaseEnv,
} from "@/lib/supabase/env";

/** Auth / session cookies — vždy primární projekt. */
export async function createAuthClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const env = authSupabaseEnv();
  assertSupabaseEnv(env, "Auth / NHL26");

  return createServerClient(env.url, env.publicKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* set v Server Component mimo akci */
        }
      },
    },
  });
}

/**
 * Datový server klient pro sezónu.
 * Session bere z Auth cookies; u NHL27 předá access token do druhého projektu (sdílený JWT).
 */
export async function createDataClient(sezona: Sezona): Promise<SupabaseClient> {
  const auth = await createAuthClient();
  const {
    data: { session },
  } = await auth.auth.getSession();

  if (sezona === "nhl26") {
    return auth;
  }

  const env = dataSupabaseEnv(sezona);
  assertSupabaseEnv(env, `data ${sezona}`);

  const client = createJsClient(env.url, env.publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : undefined,
  });

  return client;
}

/** @deprecated Použij `createAuthClient` nebo `createDataClient(sezona)`. */
export async function createClient(): Promise<SupabaseClient> {
  return createAuthClient();
}
