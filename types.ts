/**
 * NHL HUT – sdílené typy a výpočet bonusů pro formace (lajny).
 * Čistý TypeScript; žádné závislosti na UI (vhodné k importu z komponent s Tailwindem).
 */

// --- 1. Základní typy ---------------------------------------------------------------------------

export type Pozice = "LK" | "C" | "PK" | "LO" | "PO" | "G";

export type Ruka = "LR" | "PR";

/** Úroveň ikony X-Faktoru (HUTDB Bronze/Silver/Gold; HUT Builder specialist/all-star/elite). */
export type XFactorUroven = "gold" | "silver" | "bronze";

/** X-Faktor / Superstar ability (EA ratings); uživatel může upravit název, ikony jsou volitelné. */
export type XFactorZaznam = {
  id: string;
  label: string;
  imageUrl?: string;
  typeLabel?: string;
  typeIconUrl?: string;
  /** Volitelně uložená úroveň (barva) — doplňuje se z EA `type.label` nebo výběrem. */
  xfUroven?: XFactorUroven;
};

/** Soutěže týmů na kartách — loga v `tymLogaManifest.json` (`npm run loga`, viz `scripts/stahni-tym-loga.mjs`; NHLAA navíc `npm run loga-nhlaa`; INT/WINT/SVK = vlajky / Wikimedia dle skriptu). */
export type Liga =
  | "NHL"
  | "NHLAA"
  | "PWHL"
  | "Liiga"
  | "SHL"
  | "HA"
  | "NL"
  | "DEL"
  | "ICEHL"
  | "ELH"
  | "SVK"
  | "INT"
  | "WINT"
  | "AHL"
  | "ECHL"
  | "QMJHL"
  | "OHL"
  | "WHL";

// --- 2. Karta ----------------------------------------------------------------------------------

export interface HutCard {
  id: string;
  /** Celé jméno hráče (křestní + příjmení v jednom poli). */
  jmeno: string;
  ovr: number;
  pozice: Pozice;
  preferovanaRuka: Ruka;
  narodnost: string;
  tym: string;
  liga: Liga;
  typKarty: string;
  /** Roční plat v plných jednotkách (jako ve hře); v UI se zadává v milionech. */
  plat: number;
  /**
   * Ability Points karty (spotřeba na lajně). Pokud ve hře mapujete AP jinak, vyplňte.
   * Bez uvedení se při součtu základního AP bere 0.
   */
  ap?: number;
  /** Až 3 X-Faktory; ukládá se do `cards.atributy` (jsonb). */
  xFactory?: XFactorZaznam[];
}

/** Zobrazení jména na kartě. */
export function celeJmenoHrace(k: HutCard): string {
  return k.jmeno.trim();
}

// --- 3. Pravidla bonusů ------------------------------------------------------------------------

/** Jedna dílčí podmínka – musí být splněna v rámci celé formace (součet přes všechny hráče). */
export type PodminkaBonusu =
  | { typ: "symbol"; symbol: string; minimalnePocet: number }
  | { typ: "tym"; tym: string; minimalnePocet: number }
  | { typ: "liga"; liga: Liga; minimalnePocet: number };

export type TypBonusu = "Lajna" | "Tym";

/** Směr kombinace pro nastavení / budoucí pravidla bonusů (např. útočná vs. obranná lajna). */
export type TypKombinaceBonusu = "utocna" | "obranna";

export interface OdmenaBonusu {
  bonusAP: number;
  bonusOVR: number;
  typBonusu: TypBonusu;
}

export interface BonusRule {
  /** Jednoznačný identifikátor pravidla (pro UI / logování). */
  id: string;
  /** Všechny podmínky musí být splněny současně, aby bylo pravidlo aktivní. */
  podminky: PodminkaBonusu[];
  odmena: OdmenaBonusu;
}

// --- 4. Výstup výpočtu -------------------------------------------------------------------------

export interface VysledekBonusuFormace {
  aktivovanaPravidla: BonusRule[];
  /** Základní AP z karet (`ap` na kartě, jinak 0) + součet `bonusAP` z aktivních pravidel. */
  celkovyAP: number;
  /** Součet `bonusOVR` z aktivních pravidel (pro zobrazení / další výpočty). */
  celkovyBonusOVR: number;
  /** Součet platů hráčů ve formaci. */
  celkovyPlat: number;
}

// --- Pomocné funkce ----------------------------------------------------------------------------

/** `HutCard` už neukládá chemistry symboly (nahrazuje je typ karty). Mapa zůstává prázdná. */
function spocitejSymbolyVeFormaci(_hraci: HutCard[]): Map<string, number> {
  return new Map();
}

function spocitejTymyVeFormaci(hraci: HutCard[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const h of hraci) {
    map.set(h.tym, (map.get(h.tym) ?? 0) + 1);
  }
  return map;
}

function spocitejLigyVeFormaci(hraci: HutCard[]): Map<Liga, number> {
  const map = new Map<Liga, number>();
  for (const h of hraci) {
    map.set(h.liga, (map.get(h.liga) ?? 0) + 1);
  }
  return map;
}

function jePodminkaSplnena(
  p: PodminkaBonusu,
  symboly: Map<string, number>,
  tymy: Map<string, number>,
  ligy: Map<Liga, number>,
): boolean {
  switch (p.typ) {
    case "symbol":
      return (symboly.get(p.symbol) ?? 0) >= p.minimalnePocet;
    case "tym":
      return (tymy.get(p.tym) ?? 0) >= p.minimalnePocet;
    case "liga":
      return (ligy.get(p.liga) ?? 0) >= p.minimalnePocet;
    default: {
      const _exhaustive: never = p;
      return _exhaustive;
    }
  }
}

function jePravidloAktivni(
  pravidlo: BonusRule,
  symboly: Map<string, number>,
  tymy: Map<string, number>,
  ligy: Map<Liga, number>,
): boolean {
  return pravidlo.podminky.every((podminka) =>
    jePodminkaSplnena(podminka, symboly, tymy, ligy),
  );
}

/**
 * Vypočte bonusy pro formaci (2 nebo 3 hráči).
 *
 * Pravidlo je aktivní jen tehdy, pokud jsou **všechny** jeho dílčí podmínky splněny
 * v rámci dané formace (počty týmů / lig; symbolové podmínky mají prázdný zdroj dat).
 */
export function vypoctiBonusyProFormaci(
  hraci: HutCard[],
  vsechnaPravidla: BonusRule[],
): VysledekBonusuFormace {
  if (hraci.length !== 2 && hraci.length !== 3) {
    throw new Error(
      `Formace musí mít 2 nebo 3 hráče, aktuálně: ${hraci.length}`,
    );
  }

  const symboly = spocitejSymbolyVeFormaci(hraci);
  const tymy = spocitejTymyVeFormaci(hraci);
  const ligy = spocitejLigyVeFormaci(hraci);

  const aktivovanaPravidla = vsechnaPravidla.filter((r) =>
    jePravidloAktivni(r, symboly, tymy, ligy),
  );

  const zakladniApZKaret = hraci.reduce((s, h) => s + (h.ap ?? 0), 0);
  const soucetBonusuAP = aktivovanaPravidla.reduce(
    (s, r) => s + r.odmena.bonusAP,
    0,
  );
  const celkovyBonusOVR = aktivovanaPravidla.reduce(
    (s, r) => s + r.odmena.bonusOVR,
    0,
  );
  const celkovyPlat = hraci.reduce((s, h) => s + h.plat, 0);

  return {
    aktivovanaPravidla,
    celkovyAP: zakladniApZKaret + soucetBonusuAP,
    celkovyBonusOVR,
    celkovyPlat,
  };
}
