import type { Liga, Pozice, Ruka, XFactorZaznam } from "@/types";
import { LIGY_V_PORADI, tymyProLigu } from "@/lib/tymyPodleLigy";

/** Nápověda: EA tabulka + agregace z `cards` (RPC). */
export type EaNhl26Hrac = {
  key: string;
  source: "ea" | "card";
  /** EA player id; u řádku z karet komunity 0 */
  id: number;
  jmeno: string;
  tym: string;
  /** Z EA pro doplnění pozice; u `card` prázdné — použij `hutPozice`. */
  positionShort: string;
  rank: number;
  hutPozice?: Pozice;
  hutLiga?: Liga;
  /** Jen u návrhu z agregace karet (`source` card). U řádků z EA se nevyplňuje — EA ruku neuvádí. */
  hutPreferovanaRuka?: Ruka;
  /** Jen u `source` ea — z `ea_hraci_napoveda.x_factors`. */
  eaXFactory?: XFactorZaznam[];
};

/** Normalizace pro porovnání týmových názvů (EA × diakritika v appce). */
export function normalizujTymRetezec(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Silnější normalizace pro shodu EA „domovský tým“ ↔ výběr v appce
 * (tečky u St. Louis, lomítka, diakritika Montréal/Montreal, …).
 */
export function normalizujTymProShodu(s: string): string {
  return normalizujTymRetezec(s)
    .replace(/\//g, " ")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Mapování zkratky pozice z EA tabulky na pozice ve formuláři. */
export const EA_POZICE_NA_HUT: Partial<Record<string, Pozice>> = {
  CEN: "C",
  LW: "LK",
  RW: "PK",
  LD: "LO",
  RD: "PO",
  G: "G",
};

/** Výjimky: přesný řetězec z EA → liga + název týmu přesně jako v `tymyPodleLigy`. */
const EA_DOMOVSKY_TYM_PREKLAD: ReadonlyArray<{
  ea: string;
  liga: Liga;
  tym: string;
}> = [
  /* EA občas jiná diakritika / přejmenování — doplň podle potřeby */
];

/** Najde ligu a přesný název týmu v aplikaci podle domovského týmu z EA ratings. */
export function najdiLiguATymPodleEa(eaTeam: string): { liga: Liga; tym: string } | null {
  const raw = eaTeam?.trim() ?? "";
  if (!raw) return null;

  for (const row of EA_DOMOVSKY_TYM_PREKLAD) {
    if (normalizujTymProShodu(row.ea) === normalizujTymProShodu(raw)) {
      return { liga: row.liga, tym: row.tym };
    }
  }

  const nEa = normalizujTymProShodu(raw);
  if (!nEa) return null;

  for (const liga of LIGY_V_PORADI) {
    for (const tym of tymyProLigu(liga)) {
      if (normalizujTymProShodu(tym) === nEa) return { liga, tym };
    }
  }

  return null;
}
