import type { SupabaseClient } from "@supabase/supabase-js";
import type { DynamicTypKartyDbRow } from "@/lib/hutdbTypKaretMerge";

const TABULKA = "hut_typy_karet_dynamic";

export const HUT_TYPY_KARET_EXTEND_SQL = "hut_typy_karet_dynamic_extend.sql";

export function jeChybaChybejicihoSloupceSchema(zprava: string): boolean {
  return /schema cache|could not find the '[^']+' column/i.test(zprava);
}

function jeChybaChybejiciRpc(zprava: string): boolean {
  return /could not find the function|42883|schema cache.*function/i.test(zprava);
}

function zakladniUpsertRadky(
  rows: readonly DynamicTypKartyDbRow[],
  syncedAt: string,
): { hodnota_filtru: string; jmeno_cs: string; combo_soubor: string; synced_at: string }[] {
  return rows.map((r) => ({
    hodnota_filtru: r.hodnota_filtru,
    jmeno_cs: r.jmeno_cs,
    combo_soubor: r.combo_soubor,
    synced_at: syncedAt,
  }));
}

function rozsireneUpsertRadky(
  rows: readonly DynamicTypKartyDbRow[],
  syncedAt: string,
): (DynamicTypKartyDbRow & { synced_at: string })[] {
  return rows.map((r) => ({
    hodnota_filtru: r.hodnota_filtru,
    jmeno_cs: r.jmeno_cs,
    combo_soubor: r.combo_soubor,
    popis_cs: r.popis_cs ?? null,
    aliases: r.aliases ?? [],
    synced_at: syncedAt,
  }));
}

function payloadProRpc(
  rows: readonly DynamicTypKartyDbRow[],
  syncedAt: string,
): Record<string, unknown>[] {
  return rows.map((r) => ({
    hodnota_filtru: r.hodnota_filtru,
    jmeno_cs: r.jmeno_cs,
    combo_soubor: r.combo_soubor,
    popis_cs: r.popis_cs ?? null,
    aliases: r.aliases ?? [],
    synced_at: syncedAt,
  }));
}

async function upsertPresTabulku(
  supabase: SupabaseClient,
  rows: readonly DynamicTypKartyDbRow[],
  syncedAt: string,
): Promise<{ error: string | null; schema_varovani: string | null }> {
  const opts = { onConflict: "hodnota_filtru" as const };
  const plny = await supabase.from(TABULKA).upsert(rozsireneUpsertRadky(rows, syncedAt), opts);
  if (!plny.error) {
    return { error: null, schema_varovani: null };
  }
  if (!jeChybaChybejicihoSloupceSchema(plny.error.message)) {
    return { error: plny.error.message, schema_varovani: null };
  }

  const zaklad = await supabase.from(TABULKA).upsert(zakladniUpsertRadky(rows, syncedAt), opts);
  if (zaklad.error) {
    return { error: zaklad.error.message, schema_varovani: null };
  }
  return { error: null, schema_varovani: null };
}

/** Upsert do Supabase; preferuje RPC (obejde schema cache PostgREST). */
export async function upsertDynamickeTypyKaret(
  supabase: SupabaseClient,
  rows: readonly DynamicTypKartyDbRow[],
  syncedAt: string,
): Promise<{ error: string | null; schema_varovani: string | null }> {
  const rpc = await supabase.rpc("sync_hut_typy_karet_dynamic", {
    p_rows: payloadProRpc(rows, syncedAt),
  });
  if (!rpc.error) {
    return { error: null, schema_varovani: null };
  }

  const rpcMsg = rpc.error.message;
  if (/Pristup zamitnut/i.test(rpcMsg)) {
    return { error: rpcMsg, schema_varovani: null };
  }

  // Jakákoli jiná chyba RPC → přímý upsert (chybějící funkce, schema cache, špatný jsonb, …).
  return upsertPresTabulku(supabase, rows, syncedAt);
}

const SELECT_ROZSIRENY = "hodnota_filtru,jmeno_cs,combo_soubor,popis_cs,aliases";
const SELECT_STREDNI = "hodnota_filtru,jmeno_cs,combo_soubor,popis_cs";
const SELECT_ZAKLADNI = "hodnota_filtru,jmeno_cs,combo_soubor";

function radkyZRawSelectu(data: unknown): DynamicTypKartyDbRow[] {
  if (!Array.isArray(data)) return [];
  const out: DynamicTypKartyDbRow[] = [];
  for (const raw of data) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const hodnota_filtru = String(r.hodnota_filtru ?? "").trim();
    const jmeno_cs = String(r.jmeno_cs ?? "").trim();
    const combo_soubor = String(r.combo_soubor ?? "").trim();
    if (!hodnota_filtru || !jmeno_cs || !combo_soubor) continue;
    const row: DynamicTypKartyDbRow = { hodnota_filtru, jmeno_cs, combo_soubor };
    if (r.popis_cs != null && String(r.popis_cs).trim()) {
      row.popis_cs = String(r.popis_cs).trim();
    }
    if (Array.isArray(r.aliases)) {
      row.aliases = r.aliases.map((a) => String(a ?? "").trim()).filter(Boolean);
    }
    out.push(row);
  }
  return out;
}

async function nactiPresSelect(
  supabase: SupabaseClient,
): Promise<{ data: DynamicTypKartyDbRow[]; error: string | null }> {
  for (const select of [SELECT_ROZSIRENY, SELECT_STREDNI, SELECT_ZAKLADNI]) {
    const { data, error } = await supabase.from(TABULKA).select(select);
    if (!error) {
      return { data: radkyZRawSelectu(data), error: null };
    }
    if (!jeChybaChybejicihoSloupceSchema(error.message)) {
      return { data: [], error: error.message };
    }
  }
  return { data: [], error: "Nepodařilo se načíst dynamické typy karet." };
}

/** Načte dynamické typy; preferuje RPC, při chybě nebo prázdné odpovědi padá na SELECT. */
export async function nactiDynamickeTypyKaret(
  supabase: SupabaseClient,
): Promise<{ data: DynamicTypKartyDbRow[]; error: string | null }> {
  const rpc = await supabase.rpc("list_hut_typy_karet_dynamic");
  if (!rpc.error) {
    const zRpc = radkyZRawSelectu(rpc.data);
    if (zRpc.length > 0) {
      return { data: zRpc, error: null };
    }
  }

  const zeSelectu = await nactiPresSelect(supabase);
  if (zeSelectu.data.length > 0 || zeSelectu.error) {
    return zeSelectu;
  }

  if (rpc.error && !jeChybaChybejiciRpc(rpc.error.message)) {
    return { data: [], error: rpc.error.message };
  }

  return zeSelectu;
}
