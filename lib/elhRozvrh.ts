/**
 * Rozvrh zápasů pro Tipsport extraligu (ELH): dvojité kolo každý s každým
 * (jednou domácí, jednou host) + rozdělení kol do fází pro postupné online hraní.
 *
 * Týmy bereme z `tymyProLigu("ELH")` — při změně soupisky v `tymyPodleLigy.ts` se přepočítá.
 */

import { tymyProLigu } from "@/lib/tymyPodleLigy";

export type ElhZapas = {
  domaci: string;
  host: string;
};

export type ElhKolo = {
  /** 1 … celkový počet kol (2×(n−1) pro n týmů). */
  cisloKola: number;
  /** 1 … počet fází. */
  faze: number;
  zapasy: ElhZapas[];
};

export type ElhRozvrhVysledek = {
  tymy: readonly string[];
  pocetTymu: number;
  /** Počet kol v každé fázi (součet = celkemKol). */
  kolaVFazi: number[];
  celkemKol: number;
  celkemZapasu: number;
  kola: ElhKolo[];
};

/**
 * Rozdělí `celkemKol` na `pocetFazi` skupin tak, aby rozdíl mezi skupinami byl nejvýše 1
 * (první fáze dostane případné „+1“ kolo).
 */
export function rozdelKolaDoFazi(celkemKol: number, pocetFazi: number): number[] {
  if (pocetFazi < 1 || !Number.isInteger(pocetFazi)) {
    throw new Error("pocetFazi musí být kladné celé číslo.");
  }
  if (celkemKol < pocetFazi) {
    throw new Error("Nelze rozdělit méně kol než fází.");
  }
  const zaklad = Math.floor(celkemKol / pocetFazi);
  const zbytek = celkemKol % pocetFazi;
  const out: number[] = [];
  for (let i = 0; i < pocetFazi; i++) {
    out.push(zaklad + (i < zbytek ? 1 : 0));
  }
  return out;
}

/** Jedna kola „kruhové“ metody: nespárované dvojice (pořadí v poli po rotaci). */
function koloCircleParu(tymyRot: string[]): [string, string][] {
  const n = tymyRot.length;
  const par: [string, string][] = [];
  for (let i = 0; i < n / 2; i++) {
    const a = tymyRot[i]!;
    const b = tymyRot[n - 1 - i]!;
    if (a !== b) par.push([a, b]);
  }
  return par;
}

/** Rotace kromě prvního týmu (klasický Berger / circle). */
function rotuj(tymyRot: string[]): void {
  const last = tymyRot.pop()!;
  tymyRot.splice(1, 0, last);
}

/**
 * První polovina sezóny: každá dvojice jednou; domácí = lexikograficky dříve podle `cs`.
 * Druhá polovina: stejné páry, prohozené domácí/host.
 */
export function generujDvojiteKolo(tymy: readonly string[]): {
  prvniPolovinaKol: ElhZapas[][];
  druhaPolovinaKol: ElhZapas[][];
} {
  const n = tymy.length;
  if (n < 2) {
    throw new Error("Potřebujeme alespoň 2 týmy.");
  }
  if (n % 2 !== 0) {
    throw new Error(
      "Sudý počet týmů je nutný pro rovnoměrné kolo bez volného losu. U lichého počtu doplň „BYE“ ručně.",
    );
  }

  const rot = [...tymy];
  const prazdneKola: [string, string][][] = [];
  for (let r = 0; r < n - 1; r++) {
    prazdneKola.push(koloCircleParu(rot));
    rotuj(rot);
  }

  const naZapas = (par: [string, string], prvniPolovina: boolean): ElhZapas => {
    const [x, y] = par;
    const [a, b] = x.localeCompare(y, "cs") < 0 ? [x, y] : [y, x];
    return prvniPolovina
      ? { domaci: a, host: b }
      : { domaci: b, host: a };
  };

  const prvniPolovinaKol = prazdneKola.map((pary) => pary.map((p) => naZapas(p, true)));
  const druhaPolovinaKol = prazdneKola.map((pary) => pary.map((p) => naZapas(p, false)));

  return { prvniPolovinaKol, druhaPolovinaKol };
}

/** Počet fází sezóny pro ELH rozvrh (26 kol u 14 týmů → typicky 6+5+5+5+5). */
export const ELH_POCET_FAZI = 5 as const;

/**
 * Kompletní rozvrh ELH: dvojité kolo + přiřazení čísla fáze podle pořadí kol.
 * Vždy právě {@link ELH_POCET_FAZI} fází pro postupné online hraní.
 */
export function generujElhRozvrh(): ElhRozvrhVysledek {
  const pocetFazi = ELH_POCET_FAZI;
  const tymy = tymyProLigu("ELH");
  const { prvniPolovinaKol, druhaPolovinaKol } = generujDvojiteKolo(tymy);
  const vsechnaKolaZapasu = [...prvniPolovinaKol, ...druhaPolovinaKol];
  const celkemKol = vsechnaKolaZapasu.length;
  const kolaVFazi = rozdelKolaDoFazi(celkemKol, pocetFazi);

  let koloIndex = 0;
  const kola: ElhKolo[] = [];
  let aktualniFaze = 1;
  let zbyvaVKFazi = kolaVFazi[0] ?? 0;

  for (const zapasy of vsechnaKolaZapasu) {
    koloIndex += 1;
    kola.push({
      cisloKola: koloIndex,
      faze: aktualniFaze,
      zapasy,
    });
    zbyvaVKFazi -= 1;
    if (zbyvaVKFazi === 0 && aktualniFaze < pocetFazi) {
      aktualniFaze += 1;
      zbyvaVKFazi = kolaVFazi[aktualniFaze - 1] ?? 0;
    }
  }

  const celkemZapasu = kola.reduce((s, k) => s + k.zapasy.length, 0);

  return {
    tymy,
    pocetTymu: tymy.length,
    kolaVFazi,
    celkemKol,
    celkemZapasu,
    kola,
  };
}

export function zapasyDoCsvRadky(kola: readonly ElhKolo[]): string[] {
  const hlavicka = "kolo,faze,domaci,host";
  const radky = [hlavicka];
  for (const k of kola) {
    for (const z of k.zapasy) {
      radky.push(`${k.cisloKola},${k.faze},"${z.domaci.replace(/"/g, '""')}","${z.host.replace(/"/g, '""')}"`);
    }
  }
  return radky;
}
