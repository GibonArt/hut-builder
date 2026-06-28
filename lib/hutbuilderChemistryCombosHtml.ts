import {
  novyParametrPrazdny,
  type BonusKombinaceParametr,
  type RadekBonusKombinaceUi,
  type TypBonusuKombinace,
} from "@/lib/bonusKombinaceDb";
import { najdiMetaTypuKarty } from "@/lib/hutdbTypKaret";
import { narodnostKodZHutbuilderJmena } from "@/lib/narodnosti";
import { najdiTymPodlePresnehoNazvu } from "@/lib/tymyPodleLigy";
import type { TypKombinaceBonusu } from "@/types";

/** Wildcard slot na Chemistry Combos = libovolný typ karty (Hut Builder „wild card“). */
export const HUTBUILDER_WILDCARD_TYP_KARTY = "*";

export const HUTBUILDER_CHEMISTRY_COMBOS_URL =
  "https://nhlhutbuilder.com/chemistry-combos.php";
export const HUTBUILDER_CHEMISTRY_COMBOS_REFERER =
  "https://nhlhutbuilder.com/chemistry-combos.php";

type SelectorDruh = "team" | "nationality" | "card";

type SelectorMaps = Record<SelectorDruh, Map<string, string>>;

function noveIdRadku(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `r-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function parseSelectMap(html: string, selectId: string): Map<string, string> {
  const sel = html.match(
    new RegExp(`<select id="${selectId}"[\\s\\S]*?</select>`, "i"),
  );
  if (!sel) return new Map();
  const map = new Map<string, string>();
  const re = /<option[^>]*\svalue="([^"]+)"[^>]*>([^<]+)<\/option>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sel[0])) !== null) {
    map.set(m[1]!.trim(), m[2]!.trim());
  }
  return map;
}

function parseSelectorMaps(html: string): SelectorMaps {
  return {
    team: parseSelectMap(html, "filter-team"),
    nationality: parseSelectMap(html, "filter-nationality"),
    card: parseSelectMap(html, "filter-card"),
  };
}

function boostZRetezce(raw: string): {
  bonusTyp: TypBonusuKombinace;
  bonusHodnota: number;
} | null {
  const t = raw.trim().toUpperCase();
  const m = t.match(/\+?\s*(\d+(?:\.\d+)?)\s*(SAL|AP|OVR)\b/);
  if (!m) return null;
  const bonusHodnota = Number(m[1]);
  if (!Number.isFinite(bonusHodnota)) return null;
  const bonusTyp: TypBonusuKombinace =
    m[2] === "SAL" ? "PLAT" : m[2] === "AP" ? "BS" : "CLK";
  return { bonusTyp, bonusHodnota };
}

function selectorNaParametr(
  druh: SelectorDruh,
  selectorId: string,
  maps: SelectorMaps,
): BonusKombinaceParametr | null {
  if (selectorId === "wildcard") {
    if (druh === "card") {
      return { typ: "typ_karty", typKarty: HUTBUILDER_WILDCARD_TYP_KARTY };
    }
    return null;
  }

  const jmeno = maps[druh].get(selectorId);
  if (!jmeno) return null;

  if (druh === "card") {
    const meta = najdiMetaTypuKarty(jmeno);
    const hodnota =
      meta?.hodnotaFiltru ?? jmeno.replace(/\s+/g, " ").trim().toUpperCase();
    return { typ: "typ_karty", typKarty: hodnota };
  }
  if (druh === "team") {
    const hit = najdiTymPodlePresnehoNazvu(jmeno);
    if (!hit) return null;
    return { typ: "tym", liga: hit.liga, tym: hit.tym };
  }
  const kod = narodnostKodZHutbuilderJmena(jmeno);
  if (!kod) return null;
  return { typ: "narodnost", narodnostKod: kod };
}

function extractTableSection(html: string, tableId: string, nextTableId: string): string {
  const start = html.indexOf(`id="${tableId}"`);
  if (start < 0) return "";
  const end = html.indexOf(`id="${nextTableId}"`, start + 1);
  return html.slice(start, end > start ? end : undefined);
}

function parseRadkyVTabulce(
  section: string,
  maps: SelectorMaps,
  typKombinace: TypKombinaceBonusu,
  minSlotu: number,
): RadekBonusKombinaceUi[] {
  const out: RadekBonusKombinaceUi[] = [];
  const chunks = section.split('class="table-row chemistry_table_content"');
  const prazdny3 = novyParametrPrazdny("narodnost");

  for (const chunk of chunks.slice(1)) {
    const selectors = [
      ...chunk.matchAll(
        /combo_selector (team|nationality|card)" data-selector_id="([^"]+)"/g,
      ),
    ].map((m) => ({
      druh: m[1] as SelectorDruh,
      id: m[2]!,
    }));

    if (selectors.length < minSlotu) continue;

    const params: BonusKombinaceParametr[] = [];
    let ok = true;
    for (const s of selectors.slice(0, typKombinace === "utocna" ? 3 : 2)) {
      const p = selectorNaParametr(s.druh, s.id, maps);
      if (!p) {
        ok = false;
        break;
      }
      params.push(p);
    }
    if (!ok || params.length < minSlotu) continue;
    if (typKombinace === "utocna" && params.length < 3) continue;

    const boostM = chunk.match(/class="boost_amount">([^<]+)</);
    if (!boostM) continue;
    const boost = boostZRetezce(boostM[1]!);
    if (!boost) continue;

    out.push({
      id: noveIdRadku(),
      param1: params[0]!,
      param2: params[1]!,
      param3: typKombinace === "utocna" ? params[2]! : prazdny3,
      bonusHodnota: boost.bonusHodnota,
      bonusTyp: boost.bonusTyp,
    });
  }

  return out;
}

export type ChemistryCombosParseVysledek = {
  utocna: RadekBonusKombinaceUi[];
  obranna: RadekBonusKombinaceUi[];
  /** Počet slotů, které se nepodařilo namapovat (neznámý selector_id). */
  preskocenoRadku: number;
};

/**
 * Parsuje oficiální tabulku Chemistry Combos z HTML stránky Hut Builderu.
 * Zdroj pravdy: https://nhlhutbuilder.com/chemistry-combos.php
 */
export function radkyZChemistryCombosHtml(html: string): ChemistryCombosParseVysledek {
  const maps = parseSelectorMaps(html);
  const forwards = extractTableSection(
    html,
    "forwards_chemistry_table",
    "defense_chemistry_table",
  );
  const defense = extractTableSection(html, "defense_chemistry_table", "footer");

  const utocna = parseRadkyVTabulce(forwards, maps, "utocna", 3);
  const obranna = parseRadkyVTabulce(defense, maps, "obranna", 2);

  const fwdChunks = forwards.split('class="table-row chemistry_table_content"').length - 1;
  const defChunks = defense.split('class="table-row chemistry_table_content"').length - 1;

  return {
    utocna,
    obranna,
    preskocenoRadku: Math.max(0, fwdChunks - utocna.length) + Math.max(0, defChunks - obranna.length),
  };
}

export async function stahniChemistryCombosHtml(timeoutMs = 55_000): Promise<string> {
  const signal =
    typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(Math.max(8000, timeoutMs))
      : undefined;

  const res = await fetch(HUTBUILDER_CHEMISTRY_COMBOS_URL, {
    ...(signal ? { signal } : {}),
    headers: {
      "User-Agent":
        "HUT-App/1.0 (chemistry combos sync; same page as nhlhutbuilder.com)",
      Referer: HUTBUILDER_CHEMISTRY_COMBOS_REFERER,
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Hut Builder Chemistry Combos HTTP ${res.status}`);
  }
  return res.text();
}

export async function stahniKombinaceZChemistryCombos(
  timeoutMs = 55_000,
): Promise<ChemistryCombosParseVysledek & { stazeno_v: string }> {
  const html = await stahniChemistryCombosHtml(timeoutMs);
  const parsed = radkyZChemistryCombosHtml(html);
  if (parsed.utocna.length === 0 && parsed.obranna.length === 0) {
    throw new Error(
      "V HTML Chemistry Combos se nepodařilo najít žádné řádky (změnil se markup?).",
    );
  }
  return { ...parsed, stazeno_v: new Date().toISOString() };
}
