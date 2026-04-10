import type { SupabaseClient } from "@supabase/supabase-js";
import type { Liga, TypKombinaceBonusu } from "@/types";
import { LIGY_V_PORADI } from "@/lib/tymyPodleLigy";

const LIGA_SET = new Set<Liga>(LIGY_V_PORADI);

export const TYPY_BONUSU_KOMBINACE = ["PLAT", "CLK", "BS"] as const;
export type TypBonusuKombinace = (typeof TYPY_BONUSU_KOMBINACE)[number];

export type BonusKombinaceParametrTyp = "narodnost" | "tym" | "typ_karty";

export type BonusKombinaceParametr =
  | { typ: "narodnost"; narodnostKod: string }
  | { typ: "tym"; liga: Liga; tym: string }
  | { typ: "typ_karty"; typKarty: string };

export type RadekBonusKombinaceUi = {
  id: string;
  param1: BonusKombinaceParametr;
  param2: BonusKombinaceParametr;
  param3: BonusKombinaceParametr;
  /** Číselná hodnota bonusu; `null` = ve formuláři prázdné pole. */
  bonusHodnota: number | null;
  bonusTyp: TypBonusuKombinace;
};

type ParametrUlozeny =
  | { typ: "narodnost"; narodnost_kod: string }
  | { typ: "tym"; liga: string; tym: string }
  | { typ: "typ_karty"; typ_karty: string };

export type RadekBonusKombinaceUlozeny = {
  p1: ParametrUlozeny;
  p2: ParametrUlozeny;
  p3: ParametrUlozeny;
  bonus_hodnota: number;
  bonus_typ: TypBonusuKombinace;
};

/** Starý tvar jednoho řádku v JSONB (před třemi nezávislými parametry). */
type RadekBonusKombinaceUlozenyLegacy = {
  narodnost_kod: string;
  liga: string;
  tym: string;
  typ_karty: string;
};

function novyId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `r-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function novyParametrPrazdny(druh: BonusKombinaceParametrTyp): BonusKombinaceParametr {
  switch (druh) {
    case "narodnost":
      return { typ: "narodnost", narodnostKod: "" };
    case "tym":
      return { typ: "tym", liga: "NHL", tym: "" };
    case "typ_karty":
      return { typ: "typ_karty", typKarty: "" };
  }
}

export function novyRadekBonusu(): RadekBonusKombinaceUi {
  return {
    id: novyId(),
    param1: novyParametrPrazdny("narodnost"),
    param2: novyParametrPrazdny("tym"),
    param3: novyParametrPrazdny("typ_karty"),
    bonusHodnota: null,
    bonusTyp: "PLAT",
  };
}

/** Text za „=“ v náhledu uložené kombinace (neukládá se). */
export function formatujBonusVRadkuNahled(r: RadekBonusKombinaceUi): string {
  const h = r.bonusHodnota;
  const txtH =
    h !== null && Number.isFinite(h) ? String(h) : "—";
  switch (r.bonusTyp) {
    case "PLAT":
      return `${txtH} MIL. $ PLAT`;
    case "BS":
      return `${txtH} BS`;
    case "CLK":
      return `${txtH} CLK`;
    default: {
      const _x: never = r.bonusTyp;
      return `${txtH} ${_x}`;
    }
  }
}

export function radkaZKopii(zdroj: RadekBonusKombinaceUi): RadekBonusKombinaceUi {
  const kopiruj = (p: BonusKombinaceParametr): BonusKombinaceParametr => {
    switch (p.typ) {
      case "narodnost":
        return { typ: "narodnost", narodnostKod: p.narodnostKod };
      case "tym":
        return { typ: "tym", liga: p.liga, tym: p.tym };
      case "typ_karty":
        return { typ: "typ_karty", typKarty: p.typKarty };
    }
  };
  return {
    id: novyId(),
    param1: kopiruj(zdroj.param1),
    param2: kopiruj(zdroj.param2),
    param3: kopiruj(zdroj.param3),
    bonusHodnota: zdroj.bonusHodnota,
    bonusTyp: zdroj.bonusTyp,
  };
}

function jePlatnaLiga(s: string): s is Liga {
  return LIGA_SET.has(s as Liga);
}

function parametrZUlozeneho(raw: unknown): BonusKombinaceParametr | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const typ = o.typ;
  if (typ === "narodnost" && typeof o.narodnost_kod === "string") {
    return { typ: "narodnost", narodnostKod: o.narodnost_kod };
  }
  if (
    typ === "tym" &&
    typeof o.liga === "string" &&
    jePlatnaLiga(o.liga) &&
    typeof o.tym === "string"
  ) {
    return { typ: "tym", liga: o.liga, tym: o.tym };
  }
  if (typ === "typ_karty" && typeof o.typ_karty === "string") {
    return { typ: "typ_karty", typKarty: o.typ_karty };
  }
  return null;
}

/** Aktuální hodnoty + zpětná kompatibilita se starým JSON (SAL → PLAT, AP → BS). */
function bonusTypZeStorage(raw: unknown): TypBonusuKombinace {
  if (raw === "PLAT" || raw === "CLK" || raw === "BS") return raw;
  if (raw === "SAL") return "PLAT";
  if (raw === "AP") return "BS";
  return "PLAT";
}

function bonusZObjektu(o: Record<string, unknown>): {
  bonusHodnota: number | null;
  bonusTyp: TypBonusuKombinace;
} {
  const bonusTyp = bonusTypZeStorage(o.bonus_typ);
  const h = o.bonus_hodnota;
  if (typeof h === "number" && Number.isFinite(h)) {
    return { bonusHodnota: h, bonusTyp };
  }
  if (typeof h === "string" && h.trim() !== "") {
    const n = Number(h.trim().replace(",", "."));
    if (Number.isFinite(n)) return { bonusHodnota: n, bonusTyp };
  }
  return { bonusHodnota: null, bonusTyp };
}

function jeNovyRadek(x: unknown): boolean {
  if (x == null || typeof x !== "object" || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  const p1 = parametrZUlozeneho(o.p1);
  const p2 = parametrZUlozeneho(o.p2);
  const p3 = parametrZUlozeneho(o.p3);
  return p1 != null && p2 != null && p3 != null;
}

function jeStaryRadek(x: unknown): x is RadekBonusKombinaceUlozenyLegacy {
  if (x == null || typeof x !== "object" || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  if ("p1" in o) return false;
  if (typeof o.narodnost_kod !== "string") return false;
  if (typeof o.liga !== "string" || !jePlatnaLiga(o.liga)) return false;
  if (typeof o.tym !== "string" || typeof o.typ_karty !== "string") return false;
  return true;
}

function radekZNoveho(o: Record<string, unknown>): RadekBonusKombinaceUi | null {
  const p1 = parametrZUlozeneho(o.p1);
  const p2 = parametrZUlozeneho(o.p2);
  const p3 = parametrZUlozeneho(o.p3);
  if (!p1 || !p2 || !p3) return null;
  const { bonusHodnota, bonusTyp } = bonusZObjektu(o);
  const hodnota =
    bonusHodnota !== null ? bonusHodnota : 0;
  return {
    id: novyId(),
    param1: p1,
    param2: p2,
    param3: p3,
    bonusHodnota: hodnota,
    bonusTyp,
  };
}

function radekZeStareho(item: RadekBonusKombinaceUlozenyLegacy): RadekBonusKombinaceUi {
  return {
    id: novyId(),
    param1: { typ: "narodnost", narodnostKod: item.narodnost_kod },
    param2: { typ: "tym", liga: item.liga as Liga, tym: item.tym },
    param3: { typ: "typ_karty", typKarty: item.typ_karty },
    bonusHodnota: 0,
    bonusTyp: "PLAT",
  };
}

export function radkyZJsonb(raw: unknown): RadekBonusKombinaceUi[] {
  if (!Array.isArray(raw)) return [];
  const out: RadekBonusKombinaceUi[] = [];
  for (const item of raw) {
    if (item != null && typeof item === "object" && !Array.isArray(item)) {
      const o = item as Record<string, unknown>;
      if (jeNovyRadek(item)) {
        const r = radekZNoveho(o);
        if (r) out.push(r);
      } else if (jeStaryRadek(item)) {
        out.push(radekZeStareho(item as RadekBonusKombinaceUlozenyLegacy));
      }
    }
  }
  return out;
}

function parametrDoUlozeneho(p: BonusKombinaceParametr): ParametrUlozeny {
  switch (p.typ) {
    case "narodnost":
      return { typ: "narodnost", narodnost_kod: p.narodnostKod };
    case "tym":
      return { typ: "tym", liga: p.liga, tym: p.tym };
    case "typ_karty":
      return { typ: "typ_karty", typ_karty: p.typKarty };
  }
}

export function radkyDoJsonb(
  radky: readonly RadekBonusKombinaceUi[],
): RadekBonusKombinaceUlozeny[] {
  return radky.map((r) => ({
    p1: parametrDoUlozeneho(r.param1),
    p2: parametrDoUlozeneho(r.param2),
    p3: parametrDoUlozeneho(r.param3),
    bonus_hodnota:
      r.bonusHodnota !== null && Number.isFinite(r.bonusHodnota)
        ? r.bonusHodnota
        : 0,
    bonus_typ: r.bonusTyp,
  }));
}

export function jeKompletniParametr(p: BonusKombinaceParametr): boolean {
  switch (p.typ) {
    case "narodnost":
      return Boolean(p.narodnostKod.trim());
    case "tym":
      return Boolean(p.tym.trim());
    case "typ_karty":
      return Boolean(p.typKarty.trim());
  }
}

/**
 * Útočná: tři vyplněné parametry + bonus.
 * Obranná: dva parametry + bonus (třetí se v UI nezadává; v JSON může být prázdný).
 */
export function jeKompletniRadek(
  r: RadekBonusKombinaceUi,
  typKombinace: TypKombinaceBonusu = "utocna",
): boolean {
  const bonusOk =
    r.bonusHodnota !== null && Number.isFinite(r.bonusHodnota);
  const p1 = jeKompletniParametr(r.param1);
  const p2 = jeKompletniParametr(r.param2);
  if (typKombinace === "obranna") {
    return p1 && p2 && bonusOk;
  }
  return p1 && p2 && jeKompletniParametr(r.param3) && bonusOk;
}

function jenPlneKombinace(
  radky: RadekBonusKombinaceUi[],
  typ: TypKombinaceBonusu,
): RadekBonusKombinaceUi[] {
  return radky.filter((row) => jeKompletniRadek(row, typ));
}

type RowDb = {
  typ_kombinace: string;
  radky: unknown;
};

/** Tabulka `bonus_kombinace_global` — sdílené řádky pro všechny uživatele (RLS). */
const TABELA_BONUS_KOMBINACE_GLOBAL = "bonus_kombinace_global";

/**
 * Načte útočné a obranné kombinace ze sdílené tabulky Supabase.
 * Každý přihlášený uživatel může číst (policy SELECT pro authenticated).
 */
export async function nactiBonusKombinaceSdilene(
  supabase: SupabaseClient,
): Promise<{
  utocna: RadekBonusKombinaceUi[];
  obranna: RadekBonusKombinaceUi[];
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from(TABELA_BONUS_KOMBINACE_GLOBAL)
    .select("typ_kombinace, radky");

  if (error) {
    return {
      utocna: [],
      obranna: [],
      error: new Error(error.message),
    };
  }

  let utocna: RadekBonusKombinaceUi[] = [];
  let obranna: RadekBonusKombinaceUi[] = [];

  for (const row of (data ?? []) as RowDb[]) {
    const parsed = radkyZJsonb(row.radky);
    if (row.typ_kombinace === "utocna") utocna = parsed;
    if (row.typ_kombinace === "obranna") obranna = parsed;
  }

  return {
    utocna: jenPlneKombinace(utocna, "utocna"),
    obranna: jenPlneKombinace(obranna, "obranna"),
    error: null,
  };
}

/**
 * Uloží jeden typ kombinace do sdílené tabulky. Smí jen účty splňující
 * `je_bonus_kombinace_editor()` v Supabase (shodné s `jeBonusAdmin` v aplikaci).
 */
export async function ulozBonusKombinaciSdilenou(
  supabase: SupabaseClient,
  editorUserId: string,
  typ: TypKombinaceBonusu,
  radky: readonly RadekBonusKombinaceUi[],
): Promise<{ error: Error | null }> {
  const serializovane = radkyDoJsonb(radky);
  const { error } = await supabase.from(TABELA_BONUS_KOMBINACE_GLOBAL).upsert(
    {
      typ_kombinace: typ,
      radky: serializovane,
      updated_by: editorUserId,
    },
    { onConflict: "typ_kombinace" },
  );

  if (error) {
    return { error: new Error(error.message) };
  }
  return { error: null };
}

/**
 * Nahradí v surovém JSONB poli `bonus_typ`: SAL → PLAT, AP → BS (beze změny struktury řádků).
 */
export function migrujRawRadkyJsonb(raw: unknown): { radky: unknown; zmeneno: boolean } {
  if (!Array.isArray(raw)) return { radky: raw, zmeneno: false };
  let zmeneno = false;
  const radky = raw.map((item) => {
    if (item == null || typeof item !== "object" || Array.isArray(item)) return item;
    const o = item as Record<string, unknown>;
    const t = o.bonus_typ;
    if (t === "SAL") {
      zmeneno = true;
      return { ...o, bonus_typ: "PLAT" };
    }
    if (t === "AP") {
      zmeneno = true;
      return { ...o, bonus_typ: "BS" };
    }
    return item;
  });
  return { radky, zmeneno };
}

/**
 * Jednorázová oprava uložených dat v `bonus_kombinace_global` (volá editor při načtení stránky).
 * Po úspěchu mají všechny řádky v DB už PLAT/BS — není potřeba ručně přepisovat kombinace.
 */
export async function migrujLegacyBonusTypyVSdileneTabulce(
  supabase: SupabaseClient,
  editorUserId: string,
): Promise<{ error: Error | null; provedeno: boolean }> {
  const { data, error } = await supabase
    .from(TABELA_BONUS_KOMBINACE_GLOBAL)
    .select("typ_kombinace, radky");

  if (error) {
    return { error: new Error(error.message), provedeno: false };
  }

  let provedeno = false;
  for (const row of (data ?? []) as { typ_kombinace: string; radky: unknown }[]) {
    const { radky, zmeneno } = migrujRawRadkyJsonb(row.radky);
    if (!zmeneno) continue;
    provedeno = true;
    const { error: upErr } = await supabase
      .from(TABELA_BONUS_KOMBINACE_GLOBAL)
      .update({ radky, updated_by: editorUserId })
      .eq("typ_kombinace", row.typ_kombinace);
    if (upErr) {
      return { error: new Error(upErr.message), provedeno };
    }
  }

  return { error: null, provedeno };
}
