import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Sezona } from "@/lib/sezona";
import { SEZONA_VYCHOZI } from "@/lib/sezona";
import { authSupabaseEnv, dataSupabaseEnv, serviceRoleKeyProSezonu } from "@/lib/supabase/env";

/**
 * Supabase klient se service role — jen pro důvěryhodné skripty na NAS / lokálně.
 * Nikdy necommituj service role klíče a nepoužívej v prohlížeči.
 */
export function createSupabaseServiceClient(
  sezona: Sezona = SEZONA_VYCHOZI,
): SupabaseClient {
  const env = dataSupabaseEnv(sezona);
  const key = serviceRoleKeyProSezonu(sezona);
  if (!env.url || !key) {
    throw new Error(
      sezona === "nhl27"
        ? "Chybí NEXT_PUBLIC_SUPABASE_NHL27_URL (nebo fallback URL) nebo SUPABASE_NHL27_SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY."
        : "Chybí NEXT_PUBLIC_SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY v prostředí / .env.",
    );
  }
  return createClient(env.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Auth admin API — vždy primární projekt. */
export function createSupabaseAuthServiceClient(): SupabaseClient {
  const env = authSupabaseEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!env.url || !key) {
    throw new Error(
      "Chybí NEXT_PUBLIC_SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY pro Auth admin.",
    );
  }
  return createClient(env.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** UUID editora pro sloupec updated_by (volitelné; jinak null). */
export function editorUserIdZEnv(): string | null {
  const id = process.env.HUT_IMPORT_EDITOR_USER_ID?.trim();
  return id && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

/** Service role Auth: najde admin UUID podle e-mailu (shodné s lib/bonusAdmin.ts). */
export async function editorUserIdZSupabase(
  _dataClient?: SupabaseClient,
): Promise<string | null> {
  const zEnv = editorUserIdZEnv();
  if (zEnv) return zEnv;
  const email =
    process.env.HUT_IMPORT_EDITOR_EMAIL?.trim().toLowerCase() ||
    "gibonart@gmail.com";
  let authAdmin: SupabaseClient;
  try {
    authAdmin = createSupabaseAuthServiceClient();
  } catch {
    return null;
  }
  const { data, error } = await authAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 500,
  });
  if (error) return null;
  const hit = data.users.find(
    (u) => u.email?.trim().toLowerCase() === email,
  );
  return hit?.id ?? null;
}
