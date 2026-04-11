import type { SupabaseClient } from "@supabase/supabase-js";
import type { HutCard, Liga, Pozice, Ruka, XFactorZaznam } from "@/types";
import { LIGY_V_PORADI } from "@/lib/tymyPodleLigy";
import { normalizujEaXFactoryZDb } from "@/lib/eaXFactors";
import { obnovIkonyXeFactoryZKatalogu } from "@/lib/xFactoryKatalog";
import { normalizujPozici } from "@/lib/hutPozice";
const RUKY: Ruka[] = ["LR", "PR"];
const LIGA_SET = new Set<Liga>(LIGY_V_PORADI);

export type CardRow = {
  card_slug: string;
  jmeno: string;
  ovr: number;
  pozice: string;
  preferovana_ruka: string;
  narodnost: string;
  tym: string;
  liga: string;
  typ_karty: string;
  plat: string | number;
  ap: number | null;
  atributy: unknown | null;
};

function parsePlat(v: string | number): number {
  if (typeof v === "number") return v;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : Number.NaN;
}

/** Čte `xFactory` z JSONB sloupce `atributy` (stejná logika jako u načtení karty z DB). */
export function xFactoryZAtributyJsonbSloupec(raw: unknown): XFactorZaznam[] | undefined {
  if (raw == null) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) return undefined;
  return normalizujEaXFactoryZDb((raw as Record<string, unknown>).xFactory);
}

function xFactoryZAtributuJsonb(raw: unknown): XFactorZaznam[] | undefined {
  return xFactoryZAtributyJsonbSloupec(raw);
}

function atributyZHutCard(card: HutCard): Record<string, unknown> | null {
  const raw = (card.xFactory ?? []).filter((x) => x.label.trim()).slice(0, 3);
  const xf = obnovIkonyXeFactoryZKatalogu(raw);
  if (!xf?.length) return null;
  return {
    xFactory: xf.map((x) => ({
      id: (x.id || x.label).trim(),
      label: x.label.trim(),
      ...(x.imageUrl ? { imageUrl: x.imageUrl } : {}),
      ...(x.typeLabel ? { typeLabel: x.typeLabel } : {}),
      ...(x.typeIconUrl ? { typeIconUrl: x.typeIconUrl } : {}),
      ...(x.xfUroven ? { xfUroven: x.xfUroven } : {}),
    })),
  };
}

export function rowToHutCard(row: CardRow): HutCard | null {
  const poziceNorm = normalizujPozici(String(row.pozice ?? ""));
  if (!poziceNorm) return null;
  if (!RUKY.includes(row.preferovana_ruka as Ruka)) return null;
  if (!LIGA_SET.has(row.liga as Liga)) return null;
  const plat = parsePlat(row.plat);
  if (Number.isNaN(plat)) return null;
  const ovr = Number(row.ovr);
  if (!Number.isFinite(ovr)) return null;
  if (!String(row.jmeno ?? "").trim()) return null;

  const card: HutCard = {
    id: row.card_slug,
    jmeno: (row.jmeno ?? "").trim(),
    ovr: Math.round(ovr),
    pozice: poziceNorm,
    preferovanaRuka: row.preferovana_ruka as Ruka,
    narodnost: row.narodnost ?? "",
    tym: row.tym ?? "",
    liga: row.liga as Liga,
    typKarty: row.typ_karty ?? "",
    plat,
  };
  if (row.ap != null && Number.isFinite(row.ap)) {
    card.ap = Math.round(row.ap);
  }
  const xf = xFactoryZAtributuJsonb(row.atributy);
  if (xf?.length) card.xFactory = obnovIkonyXeFactoryZKatalogu(xf);
  return card;
}

/** Společná data řádku (bez `user_id`) — insert i update. */
export function dataRadkuZHutCard(card: HutCard) {
  return {
    card_slug: card.id,
    jmeno: card.jmeno,
    ovr: card.ovr,
    pozice: card.pozice,
    preferovana_ruka: card.preferovanaRuka,
    narodnost: card.narodnost,
    tym: card.tym,
    liga: card.liga,
    typ_karty: card.typKarty,
    plat: card.plat,
    ap: card.ap ?? null,
    atributy: atributyZHutCard(card),
  };
}

export function hutCardToInsertRow(userId: string, card: HutCard) {
  return {
    user_id: userId,
    ...dataRadkuZHutCard(card),
  };
}

/** Uživatelsky čitelná chyba — shoda s existujícím řádkem (jakýkoli uživatel). */
export const CHYBA_DUPLICITNI_OBSAH_KARTY =
  "Karta se stejnými údaji už v databázi existuje. Duplikát nelze uložit.";

async function maDuplicitniObsah(
  supabase: SupabaseClient,
  card: HutCard,
  vyloucit?: { userId: string; cardSlug: string },
): Promise<{ error: Error | null; duplikat: boolean }> {
  const row = dataRadkuZHutCard(card);
  const { data, error } = await supabase.rpc("cards_ma_duplicitni_obsah", {
    p_jmeno: row.jmeno,
    p_ovr: row.ovr,
    p_pozice: row.pozice,
    p_preferovana_ruka: row.preferovana_ruka,
    p_narodnost: row.narodnost,
    p_tym: row.tym,
    p_liga: row.liga,
    p_typ_karty: row.typ_karty,
    p_plat: row.plat,
    p_ap: row.ap ?? null,
    p_atributy: row.atributy ?? null,
    p_vyloucit_user_id: vyloucit?.userId ?? null,
    p_vyloucit_card_slug: vyloucit?.cardSlug ?? null,
  });
  if (error) {
    return { error: new Error(error.message), duplikat: false };
  }
  return { error: null, duplikat: data === true };
}

export async function nactiKartyUzivatele(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ data: HutCard[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("cards")
    .select(
      "card_slug, jmeno, ovr, pozice, preferovana_ruka, narodnost, tym, liga, typ_karty, plat, ap, atributy",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }
  const rows = (data ?? []) as CardRow[];
  const karty = rows
    .map(rowToHutCard)
    .filter((c): c is HutCard => c !== null);
  return { data: karty, error: null };
}

export async function vlozKartu(
  supabase: SupabaseClient,
  userId: string,
  card: HutCard,
): Promise<{ error: Error | null }> {
  const dup = await maDuplicitniObsah(supabase, card);
  if (dup.error) return { error: dup.error };
  if (dup.duplikat) return { error: new Error(CHYBA_DUPLICITNI_OBSAH_KARTY) };

  const { error } = await supabase.from("cards").insert(hutCardToInsertRow(userId, card));
  if (error) {
    return { error: new Error(error.message) };
  }
  return { error: null };
}

/** Jen `atributy` (X-F) — bez přepisu ovr/jména; bezpečné pro jednorázovou migraci ikon. */
export async function aktualizujJenAtributyKarty(
  supabase: SupabaseClient,
  userId: string,
  cardSlug: string,
  card: HutCard,
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("cards")
    .update({ atributy: atributyZHutCard(card) })
    .eq("user_id", userId)
    .eq("card_slug", cardSlug);
  if (error) {
    return { error: new Error(error.message) };
  }
  return { error: null };
}

export async function aktualizujKartu(
  supabase: SupabaseClient,
  userId: string,
  puvodniSlug: string,
  card: HutCard,
): Promise<{ error: Error | null }> {
  const dup = await maDuplicitniObsah(supabase, card, {
    userId,
    cardSlug: puvodniSlug,
  });
  if (dup.error) return { error: dup.error };
  if (dup.duplikat) return { error: new Error(CHYBA_DUPLICITNI_OBSAH_KARTY) };

  const { error } = await supabase
    .from("cards")
    .update(dataRadkuZHutCard(card))
    .eq("user_id", userId)
    .eq("card_slug", puvodniSlug);
  if (error) {
    return { error: new Error(error.message) };
  }
  return { error: null };
}

export async function smazKartuPodleSlug(
  supabase: SupabaseClient,
  userId: string,
  cardSlug: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("cards")
    .delete()
    .eq("user_id", userId)
    .eq("card_slug", cardSlug);
  if (error) {
    return { error: new Error(error.message) };
  }
  return { error: null };
}
