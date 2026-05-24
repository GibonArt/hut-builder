import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase klient se service role — jen pro důvěryhodné skripty na NAS / lokálně.
 * Nikdy necommituj `SUPABASE_SERVICE_ROLE_KEY` a nepoužívej v prohlížeči.
 */
export function createSupabaseServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Chybí NEXT_PUBLIC_SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY v prostředí / .env.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** UUID editora pro sloupec updated_by (volitelné; jinak null). */
export function editorUserIdZEnv(): string | null {
  const id = process.env.HUT_IMPORT_EDITOR_USER_ID?.trim();
  return id && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

/** Service role: najde admin UUID podle e-mailu (shodné s lib/bonusAdmin.ts). */
export async function editorUserIdZSupabase(
  supabase: SupabaseClient,
): Promise<string | null> {
  const zEnv = editorUserIdZEnv();
  if (zEnv) return zEnv;
  const email =
    process.env.HUT_IMPORT_EDITOR_EMAIL?.trim().toLowerCase() ||
    "gibonart@gmail.com";
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 500,
  });
  if (error) return null;
  const hit = data.users.find(
    (u) => u.email?.trim().toLowerCase() === email,
  );
  return hit?.id ?? null;
}
