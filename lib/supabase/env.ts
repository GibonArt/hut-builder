import type { Sezona } from "@/lib/sezona";
import { SEZONA_VYCHOZI } from "@/lib/sezona";

export type SupabaseProjektEnv = {
  url: string;
  publicKey: string;
};

function publicKeyZEnv(
  publishable: string | undefined,
  anon: string | undefined,
): string {
  return (publishable || anon || "").trim();
}

/** Auth + NHL26 data — stávající proměnné (prohlížeč i výchozí server). */
export function authSupabaseEnv(): SupabaseProjektEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const publicKey = publicKeyZEnv(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return { url, publicKey };
}

/**
 * Datový projekt pro sezónu (veřejná URL — prohlížeč / NEXT_PUBLIC_*).
 * NHL26 = auth projekt. NHL27 = NEXT_PUBLIC_SUPABASE_NHL27_*.
 */
export function dataSupabaseEnv(sezona: Sezona): SupabaseProjektEnv {
  if (sezona === "nhl26") {
    return authSupabaseEnv();
  }
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_NHL27_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    "";
  const publicKey = publicKeyZEnv(
    process.env.NEXT_PUBLIC_SUPABASE_NHL27_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_NHL27_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return { url, publicKey };
}

/**
 * Datový projekt ze serveru (API routes, service role).
 * Preferuje interní URL (Docker → Kong), aby nepadal hairpin na veřejnou HTTPS doménu.
 *
 * NHL26: `SUPABASE_URL` (volitelné) → jinak NEXT_PUBLIC_
 * NHL27: `SUPABASE_NHL27_URL` (např. http://172.17.0.1:8002)
 */
export function dataSupabaseEnvServer(sezona: Sezona): SupabaseProjektEnv {
  if (sezona === "nhl26") {
    const url =
      process.env.SUPABASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
      "";
    const publicKey = publicKeyZEnv(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
    return { url, publicKey };
  }

  const url =
    process.env.SUPABASE_NHL27_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_NHL27_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    "";
  const publicKey = publicKeyZEnv(
    process.env.NEXT_PUBLIC_SUPABASE_NHL27_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_NHL27_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return { url, publicKey };
}

export function jeNhl27DataNakonfigurovano(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_NHL27_URL?.trim());
}

export function serviceRoleKeyProSezonu(sezona: Sezona = SEZONA_VYCHOZI): string {
  if (sezona === "nhl27") {
    return (
      process.env.SUPABASE_NHL27_SERVICE_ROLE_KEY?.trim() ||
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      ""
    );
  }
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
}

export function assertSupabaseEnv(env: SupabaseProjektEnv, kontext: string): void {
  if (!env.url || !env.publicKey) {
    throw new Error(`Chybí Supabase URL nebo veřejný klíč (${kontext}).`);
  }
}
