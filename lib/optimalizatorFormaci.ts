import type { HutCard, Liga } from "@/types";
import {
  klicLogickeKombinace,
  type BonusKombinaceParametr,
  type RadekBonusKombinaceUi,
} from "@/lib/bonusKombinaceDb";
import type { NarodnostVolba } from "@/lib/narodnosti";

/** Permutace indexů parametrů: slot i dostane `params[perm[i]]` (LK/C/PK nebo LO/PO). */
const PERMUTACE3: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

const PERMUTACE2: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 0],
];

type NarodnostKodMap = ReadonlyMap<string, string>;

function vytvorNarodnostKodMap(narodnostiVolby: readonly NarodnostVolba[]): NarodnostKodMap {
  const m = new Map<string, string>();
  for (const v of narodnostiVolby) {
    m.set(v.label.trim(), v.code.trim());
  }
  return m;
}

function kartaSplnujeParametrRychle(
  k: HutCard,
  p: BonusKombinaceParametr,
  narodnostKodMap: NarodnostKodMap,
): boolean {
  switch (p.typ) {
    case "narodnost": {
      const kod = narodnostKodMap.get(k.narodnost.trim());
      const poz = p.narodnostKod.trim();
      return Boolean(poz) && kod === poz;
    }
    case "tym":
      return (
        Boolean(p.tym.trim()) &&
        k.liga === p.liga &&
        k.tym.trim() === p.tym.trim()
      );
    case "typ_karty":
      return (
        Boolean(p.typKarty.trim()) &&
        k.typKarty.trim() === p.typKarty.trim()
      );
  }
}

function maskaTriParametru(
  k: HutCard,
  params: readonly [BonusKombinaceParametr, BonusKombinaceParametr, BonusKombinaceParametr],
  narodnostKodMap: NarodnostKodMap,
): number {
  let mask = 0;
  for (let i = 0; i < 3; i++) {
    if (kartaSplnujeParametrRychle(k, params[i]!, narodnostKodMap)) mask |= 1 << i;
  }
  return mask;
}

function maskaDvuParametru(
  k: HutCard,
  params: readonly [BonusKombinaceParametr, BonusKombinaceParametr],
  narodnostKodMap: NarodnostKodMap,
): number {
  let mask = 0;
  if (kartaSplnujeParametrRychle(k, params[0]!, narodnostKodMap)) mask |= 1;
  if (kartaSplnujeParametrRychle(k, params[1]!, narodnostKodMap)) mask |= 2;
  return mask;
}

function trojiceMaskyOk(mLK: number, mC: number, mPK: number): boolean {
  if (!mLK || !mC || !mPK) return false;
  for (const perm of PERMUTACE3) {
    if (
      (mLK & (1 << perm[0]!)) &&
      (mC & (1 << perm[1]!)) &&
      (mPK & (1 << perm[2]!))
    ) {
      return true;
    }
  }
  return false;
}

function dvojiceMaskyOk(mA: number, mB: number): boolean {
  return Boolean((mA & 1 && mB & 2) || (mA & 2 && mB & 1));
}

/**
 * Karta splní parametr kombinace (národnost / tým+liga / typ karty).
 */
export function kartaSplnujeParametr(
  k: HutCard,
  p: BonusKombinaceParametr,
  narodnostiVolby: readonly NarodnostVolba[],
): boolean {
  switch (p.typ) {
    case "narodnost": {
      const kod = narodnostiVolby.find((v) => v.label === k.narodnost.trim())?.code;
      return Boolean(p.narodnostKod.trim()) && kod === p.narodnostKod.trim();
    }
    case "tym":
      return (
        Boolean(p.tym.trim()) &&
        k.liga === p.liga &&
        k.tym.trim() === p.tym.trim()
      );
    case "typ_karty":
      return (
        Boolean(p.typKarty.trim()) &&
        k.typKarty.trim() === p.typKarty.trim()
      );
  }
}

/** Prázdný řetězec = bez limitu; jinak celé číslo 0–99. */
export function parseOvrVolitelne(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  if (!Number.isFinite(n) || n < 0 || n > 99) return null;
  return n;
}

/** Prázdný řetězec = bez limitu; jinak nezáporné celé číslo (počet výskytů). */
export function parsePocetVolitelne(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Počet hráčů ve formaci s OVR ≥ práh (např. turnajový strop 95). */
export function pocetHracuNaNeboNadOvr(
  hraci: readonly HutCard[],
  pragOvr: number,
): number {
  let n = 0;
  for (const k of hraci) {
    if (k.ovr >= pragOvr) n += 1;
  }
  return n;
}

export function formaceSplnujeMaxVyskytuOvr(
  hraci: readonly HutCard[],
  pragOvr: number,
  maxVeFormaci: number,
): boolean {
  return pocetHracuNaNeboNadOvr(hraci, pragOvr) <= maxVeFormaci;
}

export function filtrujUtokPodleMaxVyskytuOvr(
  radky: readonly UtocnaFormaceVysledek[],
  pragOvr: number | null,
  maxVeFormaci: number | null,
): UtocnaFormaceVysledek[] {
  if (pragOvr === null || maxVeFormaci === null) return [...radky];
  return radky.filter((v) =>
    formaceSplnujeMaxVyskytuOvr([v.lk, v.c, v.pk], pragOvr, maxVeFormaci),
  );
}

export function filtrujDvojicePodleMaxVyskytuOvr(
  radky: readonly DvojiceVysledek[],
  pragOvr: number | null,
  maxVeFormaci: number | null,
): DvojiceVysledek[] {
  if (pragOvr === null || maxVeFormaci === null) return [...radky];
  return radky.filter((v) =>
    formaceSplnujeMaxVyskytuOvr([v.a, v.b], pragOvr, maxVeFormaci),
  );
}

export type LimityVyskytuOvrTurnaj = {
  pragOvr: number;
  maxVeFormaciUtok: number | null;
  maxVeFormaciObrana: number | null;
  maxCelkemUtok: number | null;
  maxCelkemObrana: number | null;
};

export function spocetVyskytuOvrUtokSoupiska(
  radky: readonly UtocnaFormaceVysledek[],
  pragOvr: number,
): number {
  let n = 0;
  for (const v of radky) {
    n += pocetHracuNaNeboNadOvr([v.lk, v.c, v.pk], pragOvr);
  }
  return n;
}

export function spocetVyskytuOvrDvojiceSoupiska(
  radky: readonly DvojiceVysledek[],
  pragOvr: number,
): number {
  let n = 0;
  for (const v of radky) {
    n += pocetHracuNaNeboNadOvr([v.a, v.b], pragOvr);
  }
  return n;
}

export function filtrujKartyPodleOvr(
  karty: readonly HutCard[],
  minOvr: number | null,
  maxOvr: number | null,
): HutCard[] {
  return karty.filter((k) => {
    if (minOvr !== null && k.ovr < minOvr) return false;
    if (maxOvr !== null && k.ovr > maxOvr) return false;
    return true;
  });
}

export type UtocnaFormaceVysledek = {
  kombinace: RadekBonusKombinaceUi;
  lk: HutCard;
  c: HutCard;
  pk: HutCard;
};

export type DvojiceVysledek = {
  kombinace: RadekBonusKombinaceUi;
  a: HutCard;
  b: HutCard;
};

/** Tým z požadavku kapitánské souhry (liga + přesný název týmu). */
export type TymFiltrKapitanskaSouhra = {
  liga: Liga;
  tym: string;
};

export function klicTymFiltruKapitanskaSouhra(t: TymFiltrKapitanskaSouhra): string {
  return `${t.liga}|${t.tym.trim().toLowerCase()}`;
}

export function kartaJeZTymFiltruKapitanskaSouhra(
  k: HutCard,
  t: TymFiltrKapitanskaSouhra,
): boolean {
  return k.liga === t.liga && k.tym.trim() === t.tym.trim();
}

/**
 * Ve formaci je alespoň jeden hráč z některého zvoleného týmu.
 * Formace bez těchto týmů se neukáže; ostatní hráči ve formaci mohou být i z jiných týmů.
 */
export function formaceMaAlesponJedenVybranyTymKapitanskaSouhra(
  hraci: readonly HutCard[],
  tymy: readonly TymFiltrKapitanskaSouhra[],
): boolean {
  if (tymy.length === 0) return true;
  return hraci.some((k) =>
    tymy.some((t) => kartaJeZTymFiltruKapitanskaSouhra(k, t)),
  );
}

export function filtrujUtokPodleTymuKapitanskaSouhra(
  radky: readonly UtocnaFormaceVysledek[],
  tymy: readonly TymFiltrKapitanskaSouhra[],
): UtocnaFormaceVysledek[] {
  if (tymy.length === 0) return [...radky];
  return radky.filter((v) =>
    formaceMaAlesponJedenVybranyTymKapitanskaSouhra([v.lk, v.c, v.pk], tymy),
  );
}

export function filtrujDvojicePodleTymuKapitanskaSouhra(
  radky: readonly DvojiceVysledek[],
  tymy: readonly TymFiltrKapitanskaSouhra[],
): DvojiceVysledek[] {
  if (tymy.length === 0) return [...radky];
  return radky.filter((v) =>
    formaceMaAlesponJedenVybranyTymKapitanskaSouhra([v.a, v.b], tymy),
  );
}

/**
 * Platná trojice: existuje přiřazení tří symbolů kombinace ke třem pozicím (LK, C, PK)
 * v libovolném pořadí — LK nemusí odpovídat „param1“ z uloženého řádku.
 */
export function trojiceSplnujeKombinaciUtok(
  kLK: HutCard,
  kC: HutCard,
  kPK: HutCard,
  r: RadekBonusKombinaceUi,
  narodnostiVolby: readonly NarodnostVolba[],
): boolean {
  const params = [r.param1, r.param2, r.param3] as const;
  const slotKarty = [kLK, kC, kPK] as const;
  return PERMUTACE3.some((perm) =>
    slotKarty.every((karta, slotIdx) =>
      kartaSplnujeParametr(karta, params[perm[slotIdx]!]!, narodnostiVolby),
    ),
  );
}

/**
 * Platná dvojice: oba symboly kombinace pokryjí dvě pozice v libovolném pořadí.
 */
export function dvojiceSplnujeDvaParametry(
  kA: HutCard,
  kB: HutCard,
  r: RadekBonusKombinaceUi,
  narodnostiVolby: readonly NarodnostVolba[],
): boolean {
  const params = [r.param1, r.param2] as const;
  const slotKarty = [kA, kB] as const;
  return PERMUTACE2.some((perm) =>
    slotKarty.every((karta, slotIdx) =>
      kartaSplnujeParametr(karta, params[perm[slotIdx]!]!, narodnostiVolby),
    ),
  );
}

/**
 * První platné přiřazení symbolů ke slotům LK, C, PK (pro zobrazení u výsledku).
 */
export function prirazeniSymboluUtok(
  kLK: HutCard,
  kC: HutCard,
  kPK: HutCard,
  r: RadekBonusKombinaceUi,
  narodnostiVolby: readonly NarodnostVolba[],
): [BonusKombinaceParametr, BonusKombinaceParametr, BonusKombinaceParametr] | null {
  const params = [r.param1, r.param2, r.param3] as const;
  const slotKarty = [kLK, kC, kPK] as const;
  for (const perm of PERMUTACE3) {
    if (
      slotKarty.every((karta, slotIdx) =>
        kartaSplnujeParametr(karta, params[perm[slotIdx]!]!, narodnostiVolby),
      )
    ) {
      return [params[perm[0]!]!, params[perm[1]!]!, params[perm[2]!]!];
    }
  }
  return null;
}

/**
 * První platné přiřazení ke dvěma slotům (LO/PO nebo G/G).
 */
export function prirazeniSymboluDvojice(
  kA: HutCard,
  kB: HutCard,
  r: RadekBonusKombinaceUi,
  narodnostiVolby: readonly NarodnostVolba[],
): [BonusKombinaceParametr, BonusKombinaceParametr] | null {
  const params = [r.param1, r.param2] as const;
  const slotKarty = [kA, kB] as const;
  for (const perm of PERMUTACE2) {
    if (
      slotKarty.every((karta, slotIdx) =>
        kartaSplnujeParametr(karta, params[perm[slotIdx]!]!, narodnostiVolby),
      )
    ) {
      return [params[perm[0]!]!, params[perm[1]!]!];
    }
  }
  return null;
}

export type SpoctiUtocneFormaceOpts = {
  /**
   * Když true, na slot „levé křídlo“ lze dát hráče s pozicí LK, PK nebo C a na „pravé křídlo“ také
   * (stejná sada, tři různí hráči). Centr zůstává jen C.
   */
  kridlaVzajemna?: boolean;
};

export type SpoctiObranneDvojiceOpts = {
  /**
   * Když true, na slot LO lze dát hráče s pozicí LO nebo PO a na PO také LO nebo PO
   * (stejná sada „křídel“ obrany, dva různí hráči).
   */
  loPoVzajemne?: boolean;
};

/**
 * Útočné trojice LK + C + PK; každý ze tří symbolů kombinace připadne některé pozici (libovolné pořadí).
 */
export function spoctiUtocneFormace(
  karty: readonly HutCard[],
  radkyKombinaci: readonly RadekBonusKombinaceUi[],
  narodnostiVolby: readonly NarodnostVolba[],
  opts?: SpoctiUtocneFormaceOpts | null,
): UtocnaFormaceVysledek[] {
  const kridlaVzajemna = Boolean(opts?.kridlaVzajemna);
  const kridla: HutCard[] = karty.filter(
    (k) => k.pozice === "LK" || k.pozice === "PK" || k.pozice === "C",
  );
  const lk = kridlaVzajemna ? kridla : karty.filter((k) => k.pozice === "LK");
  const c = karty.filter((k) => k.pozice === "C");
  const pk = kridlaVzajemna ? kridla : karty.filter((k) => k.pozice === "PK");
  const narodnostKodMap = vytvorNarodnostKodMap(narodnostiVolby);
  const out: UtocnaFormaceVysledek[] = [];
  const videnyRadek = new Set<string>();

  for (const r of radkyKombinaci) {
    const kR = klicLogickeKombinace(r);
    const params = [r.param1, r.param2, r.param3] as const;
    const lkK = lk
      .map((k) => ({ k, m: maskaTriParametru(k, params, narodnostKodMap) }))
      .filter((x) => x.m > 0);
    const cK = c
      .map((k) => ({ k, m: maskaTriParametru(k, params, narodnostKodMap) }))
      .filter((x) => x.m > 0);
    const pkK = pk
      .map((k) => ({ k, m: maskaTriParametru(k, params, narodnostKodMap) }))
      .filter((x) => x.m > 0);
    for (const { k: kLK, m: mLK } of lkK) {
      for (const { k: kC, m: mC } of cK) {
        if (kC.id === kLK.id) continue;
        for (const { k: kPK, m: mPK } of pkK) {
          if (kPK.id === kLK.id || kPK.id === kC.id) continue;
          if (!trojiceMaskyOk(mLK, mC, mPK)) continue;
          const klic = `${kR}|${kLK.id}|${kC.id}|${kPK.id}`;
          if (videnyRadek.has(klic)) continue;
          videnyRadek.add(klic);
          out.push({ kombinace: r, lk: kLK, c: kC, pk: kPK });
        }
      }
    }
  }
  return out;
}

/**
 * Obranné dvojice LO + PO; oba symboly kombinace přiřaditelné k LO/PO v libovolném pořadí.
 */
export function spoctiObranneDvojice(
  karty: readonly HutCard[],
  radkyKombinaci: readonly RadekBonusKombinaceUi[],
  narodnostiVolby: readonly NarodnostVolba[],
  opts?: SpoctiObranneDvojiceOpts | null,
): DvojiceVysledek[] {
  const loPoVzajemne = Boolean(opts?.loPoVzajemne);
  const loNeboPo: HutCard[] = karty.filter((k) => k.pozice === "LO" || k.pozice === "PO");
  const lo = loPoVzajemne ? loNeboPo : karty.filter((k) => k.pozice === "LO");
  const po = loPoVzajemne ? loNeboPo : karty.filter((k) => k.pozice === "PO");
  const narodnostKodMap = vytvorNarodnostKodMap(narodnostiVolby);
  const out: DvojiceVysledek[] = [];
  const videnyRadek = new Set<string>();

  for (const r of radkyKombinaci) {
    const kR = klicLogickeKombinace(r);
    const params = [r.param1, r.param2] as const;
    const loK = lo
      .map((k) => ({ k, m: maskaDvuParametru(k, params, narodnostKodMap) }))
      .filter((x) => x.m > 0);
    const poK = po
      .map((k) => ({ k, m: maskaDvuParametru(k, params, narodnostKodMap) }))
      .filter((x) => x.m > 0);
    for (const { k: kLO, m: mLO } of loK) {
      for (const { k: kPO, m: mPO } of poK) {
        if (kLO.id === kPO.id) continue;
        if (!dvojiceMaskyOk(mLO, mPO)) continue;
        const klic = `${kR}|${kLO.id}|${kPO.id}`;
        if (videnyRadek.has(klic)) continue;
        videnyRadek.add(klic);
        out.push({ kombinace: r, a: kLO, b: kPO });
      }
    }
  }
  return out;
}

/**
 * Dvojice brankářů (G + G); stejná logika jako obrana (symboly v libovolném pořadí mezi G1/G2).
 * Každá neuspořádaná dvojice karet jen jednou (kanonicky nižší id jako G1).
 */
export function spoctiGolmanskeDvojice(
  karty: readonly HutCard[],
  radkyKombinaci: readonly RadekBonusKombinaceUi[],
  narodnostiVolby: readonly NarodnostVolba[],
): DvojiceVysledek[] {
  const gs = karty.filter((k) => k.pozice === "G");
  const narodnostKodMap = vytvorNarodnostKodMap(narodnostiVolby);
  const out: DvojiceVysledek[] = [];
  const videnyRadek = new Set<string>();

  for (const r of radkyKombinaci) {
    const kR = klicLogickeKombinace(r);
    const params = [r.param1, r.param2] as const;
    const gK = gs
      .map((k) => ({ k, m: maskaDvuParametru(k, params, narodnostKodMap) }))
      .filter((x) => x.m > 0);
    for (let i = 0; i < gK.length; i++) {
      const { k: g1, m: m1 } = gK[i]!;
      for (let j = i + 1; j < gK.length; j++) {
        const { k: g2, m: m2 } = gK[j]!;
        if (!dvojiceMaskyOk(m1, m2)) continue;
        const klic = `${kR}|${g1.id}|${g2.id}`;
        if (videnyRadek.has(klic)) continue;
        videnyRadek.add(klic);
        out.push({ kombinace: r, a: g1, b: g2 });
      }
    }
  }
  return out;
}
