import type { TypKombinaceBonusu } from "@/types";
import {
  novyParametrPrazdny,
  type BonusKombinaceParametr,
  type RadekBonusKombinaceUi,
  type TypBonusuKombinace,
} from "@/lib/bonusKombinaceDb";
import { najdiMetaTypuKarty } from "@/lib/hutdbTypKaret";
import type { DynamicTypKartyDbRow } from "@/lib/hutdbTypKaretMerge";
import { najdiTymPodlePresnehoNazvu } from "@/lib/tymyPodleLigy";

function noveIdRadku(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `r-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export {
  dynamicRadkyZComboFinderHtml,
  parseCardTypesFromHutbuilderComboFinderHtml,
} from "@/lib/hutdbTypKaretSync";

type HutbuilderBoost = { type?: string; amount?: unknown };
type HutbuilderDetail = { type?: string; name?: string };
type HutbuilderChemistry = {
  details?: HutbuilderDetail[];
  boosts?: HutbuilderBoost[];
};

export type HutbuilderImportedLine = {
  line_type?: string;
  chemistries?: HutbuilderChemistry[];
};

function boostNaTypBonusu(b: HutbuilderBoost): TypBonusuKombinace | null {
  const t = String(b.type ?? "").toUpperCase();
  if (t === "SAL") return "PLAT";
  if (t === "AP") return "BS";
  if (t === "OVR") return "CLK";
  return null;
}

function detailNaParametr(d: HutbuilderDetail): BonusKombinaceParametr | null {
  const typ = String(d.type ?? "").toLowerCase();
  if (typ === "card_type") {
    const name = String(d.name ?? "").trim();
    if (!name) return null;
    const meta = najdiMetaTypuKarty(name);
    const hodnota =
      meta?.hodnotaFiltru ?? name.replace(/\s+/g, " ").trim().toUpperCase();
    return { typ: "typ_karty", typKarty: hodnota };
  }
  if (typ === "team") {
    const name = String(d.name ?? "").trim();
    if (!name) return null;
    const hit = najdiTymPodlePresnehoNazvu(name);
    if (!hit) return null;
    return { typ: "tym", liga: hit.liga, tym: hit.tym };
  }
  return null;
}

/**
 * Z jedné hutbuilder řádkové chemie: první 3 (útok) nebo 2 (obrana / goalie) sloty synergy
 * přemapované na parametry — `card_type` i `team` (BS/AP je skoro vždy smíchané).
 * Každý boost SAL/AP/OVR → samostatný řádek.
 */
export function radkyZChemieHutbuilderLine(
  line: HutbuilderImportedLine,
  typKombinace: TypKombinaceBonusu,
): RadekBonusKombinaceUi[] {
  const need = typKombinace === "utocna" ? 3 : 2;
  const out: RadekBonusKombinaceUi[] = [];

  for (const ch of line.chemistries ?? []) {
    const details = ch.details ?? [];
    if (details.length < need) continue;
    const slice = details.slice(0, need);
    const params: BonusKombinaceParametr[] = [];
    let ok = true;
    for (const d of slice) {
      const p = detailNaParametr(d);
      if (!p) {
        ok = false;
        break;
      }
      params.push(p);
    }
    if (!ok || params.length !== need) continue;

    const prazdny3 = novyParametrPrazdny("narodnost");

    for (const b of ch.boosts ?? []) {
      const bonusTyp = boostNaTypBonusu(b);
      const amt = Number(b.amount);
      if (!bonusTyp || !Number.isFinite(amt)) continue;
      out.push({
        id: noveIdRadku(),
        param1: params[0]!,
        param2: params[1]!,
        param3: typKombinace === "utocna" ? params[2]! : prazdny3,
        bonusHodnota: amt,
        bonusTyp,
      });
    }
  }

  return out;
}

export function radkyZRadekHutbuilder(
  line: HutbuilderImportedLine,
): {
  utocna: RadekBonusKombinaceUi[];
  obranna: RadekBonusKombinaceUi[];
} {
  const lt = String(line.line_type ?? "").toLowerCase();
  if (lt === "forwards") {
    const u = radkyZChemieHutbuilderLine(line, "utocna");
    return { utocna: u, obranna: [] };
  }
  if (lt === "defense" || lt === "goalie") {
    const o = radkyZChemieHutbuilderLine(line, "obranna");
    return { utocna: [], obranna: o };
  }
  return { utocna: [], obranna: [] };
}
