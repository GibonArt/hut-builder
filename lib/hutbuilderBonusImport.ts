import type { TypKombinaceBonusu } from "@/types";
import {
  novyParametrPrazdny,
  type RadekBonusKombinaceUi,
  type TypBonusuKombinace,
} from "@/lib/bonusKombinaceDb";
import { najdiMetaTypuKarty } from "@/lib/hutdbTypKaret";
import type { DynamicTypKartyDbRow } from "@/lib/hutdbTypKaretMerge";

function noveIdRadku(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `r-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** HTML z `combo-finder.php` — volby typů karet v builderu. */
export function parseCardTypesFromHutbuilderComboFinderHtml(html: string): {
  logo: string;
  displayName: string;
}[] {
  const byLogo = new Map<string, string>();
  const pairs: [RegExp, "logoFirst" | "nameFirst"][] = [
    [/data-card-type-logo="([^"]+\.(?:png|webp))"[^>]*data-card-type-name="([^"]+)"/gi, "logoFirst"],
    [/data-card-type-name="([^"]+)"[^>]*data-card-type-logo="([^"]+\.(?:png|webp))"/gi, "nameFirst"],
  ];
  for (const [re, order] of pairs) {
    let m: RegExpExecArray | null;
    const r = new RegExp(re.source, re.flags);
    while ((m = r.exec(html)) !== null) {
      const logo = order === "logoFirst" ? m[1] : m[2];
      const name = order === "logoFirst" ? m[2] : m[1];
      const nm = name.trim();
      if (logo && nm) byLogo.set(logo, nm);
    }
  }
  return [...byLogo.entries()].map(([logo, displayName]) => ({ logo, displayName }));
}

export function dynamicRadkyZComboFinderHtml(html: string): DynamicTypKartyDbRow[] {
  const parsed = parseCardTypesFromHutbuilderComboFinderHtml(html);
  const out: DynamicTypKartyDbRow[] = [];
  const seen = new Set<string>();
  for (const { logo, displayName } of parsed) {
    const meta = najdiMetaTypuKarty(displayName);
    const hodnota =
      meta?.hodnotaFiltru ??
      displayName.replace(/\s+/g, " ").trim().toUpperCase();
    const k = hodnota.toUpperCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({
      hodnota_filtru: k,
      jmeno_cs: meta?.jmenoCs ?? displayName.trim(),
      combo_soubor: logo.trim(),
    });
  }
  return out;
}

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

/**
 * Z jedné hutbuilder řádkové chemie: jen synergy kde jsou pouze `card_type` detaily
 * (počet = 3 útok / 2 obrana). Každý boost SAL/AP/OVR → samostatný řádek.
 */
export function radkyZChemieHutbuilderLine(
  line: HutbuilderImportedLine,
  typKombinace: TypKombinaceBonusu,
): RadekBonusKombinaceUi[] {
  const need = typKombinace === "utocna" ? 3 : 2;
  const out: RadekBonusKombinaceUi[] = [];

  for (const ch of line.chemistries ?? []) {
    const cardDetails = (ch.details ?? []).filter((d) => d.type === "card_type");
    if (cardDetails.length < need) continue;
    const slice = cardDetails.slice(0, need);
    const params = slice.map((d) => {
      const name = String(d.name ?? "").trim();
      const meta = najdiMetaTypuKarty(name);
      const hodnota =
        meta?.hodnotaFiltru ??
        name.replace(/\s+/g, " ").trim().toUpperCase();
      return { typ: "typ_karty" as const, typKarty: hodnota };
    });
    const prazdny3 = novyParametrPrazdny("narodnost");

    for (const b of ch.boosts ?? []) {
      const bonusTyp = boostNaTypBonusu(b);
      const amt = Number(b.amount);
      if (!bonusTyp || !Number.isFinite(amt)) continue;
      out.push({
        id: noveIdRadku(),
        param1: params[0],
        param2: params[1],
        param3: typKombinace === "utocna" ? params[2] : prazdny3,
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
  if (lt === "defense") {
    const o = radkyZChemieHutbuilderLine(line, "obranna");
    return { utocna: [], obranna: o };
  }
  return { utocna: [], obranna: [] };
}
