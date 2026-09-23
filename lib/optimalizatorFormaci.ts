import type { HutCard, Liga } from "@/types";
import {
  klicLogickeKombinace,
  TYPY_BONUSU_KOMBINACE,
  type BonusKombinaceParametr,
  type RadekBonusKombinaceUi,
} from "@/lib/bonusKombinaceDb";
import {
  kanonickyFiltrTypuKarty,
  type NajdiMetaTypuKartyOpts,
} from "@/lib/hutdbTypKaret";
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
    // Přímý kód na kartě (CA) i kdyby label v Intl neseděl 1:1
    m.set(v.code.trim().toUpperCase(), v.code.trim());
  }
  return m;
}

function typKartySplnujeBonus(
  typNaKarte: string,
  typVKombinaci: string,
  typKartyMeta?: NajdiMetaTypuKartyOpts | null,
): boolean {
  const poz = typVKombinaci.trim();
  if (!poz) return false;
  if (poz === "*") return true;
  return (
    kanonickyFiltrTypuKarty(typNaKarte, typKartyMeta) ===
    kanonickyFiltrTypuKarty(poz, typKartyMeta)
  );
}

function kartaSplnujeParametrRychle(
  k: HutCard,
  p: BonusKombinaceParametr,
  narodnostKodMap: NarodnostKodMap,
  typKartyMeta?: NajdiMetaTypuKartyOpts | null,
): boolean {
  switch (p.typ) {
    case "narodnost": {
      const poz = p.narodnostKod.trim();
      if (!poz) return false;
      const naKarte = k.narodnost.trim();
      const kod = narodnostKodMap.get(naKarte) ?? narodnostKodMap.get(naKarte.toUpperCase());
      return kod === poz;
    }
    case "tym":
      return (
        Boolean(p.tym.trim()) &&
        k.liga === p.liga &&
        k.tym.trim() === p.tym.trim()
      );
    case "typ_karty":
      return typKartySplnujeBonus(k.typKarty, p.typKarty, typKartyMeta);
  }
}

function maskaTriParametru(
  k: HutCard,
  params: readonly [BonusKombinaceParametr, BonusKombinaceParametr, BonusKombinaceParametr],
  narodnostKodMap: NarodnostKodMap,
  typKartyMeta?: NajdiMetaTypuKartyOpts | null,
): number {
  let mask = 0;
  for (let i = 0; i < 3; i++) {
    if (kartaSplnujeParametrRychle(k, params[i]!, narodnostKodMap, typKartyMeta)) {
      mask |= 1 << i;
    }
  }
  return mask;
}

function maskaDvuParametru(
  k: HutCard,
  params: readonly [BonusKombinaceParametr, BonusKombinaceParametr],
  narodnostKodMap: NarodnostKodMap,
  typKartyMeta?: NajdiMetaTypuKartyOpts | null,
): number {
  let mask = 0;
  if (kartaSplnujeParametrRychle(k, params[0]!, narodnostKodMap, typKartyMeta)) mask |= 1;
  if (kartaSplnujeParametrRychle(k, params[1]!, narodnostKodMap, typKartyMeta)) mask |= 2;
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
 * Typ karty se porovnává kanonicky (TOTW ≡ TEAM OF THE WEEK, aliasy z DB).
 */
export function kartaSplnujeParametr(
  k: HutCard,
  p: BonusKombinaceParametr,
  narodnostiVolby: readonly NarodnostVolba[],
  typKartyMeta?: NajdiMetaTypuKartyOpts | null,
): boolean {
  return kartaSplnujeParametrRychle(
    k,
    p,
    vytvorNarodnostKodMap(narodnostiVolby),
    typKartyMeta,
  );
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

/**
 * Logika výběru více týmů kapitánské souhry:
 * - `alespon_jeden` (NEBO) — ve formaci alespoň jeden hráč z některého zvoleného týmu
 * - `vsechny` (A) — ve formaci musí být zastoupen každý zvolený tým
 */
export type OperatorKapitanskaSouhra = "alespon_jeden" | "vsechny";

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
 * Kapitánská souhra — podle operátoru NEBO / A.
 * Ostatní hráči ve formaci mohou být i z jiných týmů.
 */
export function formaceSplnujeTymyKapitanskaSouhra(
  hraci: readonly HutCard[],
  tymy: readonly TymFiltrKapitanskaSouhra[],
  operator: OperatorKapitanskaSouhra = "alespon_jeden",
): boolean {
  if (tymy.length === 0) return true;
  if (operator === "vsechny") {
    return tymy.every((t) =>
      hraci.some((k) => kartaJeZTymFiltruKapitanskaSouhra(k, t)),
    );
  }
  return hraci.some((k) =>
    tymy.some((t) => kartaJeZTymFiltruKapitanskaSouhra(k, t)),
  );
}

/** @deprecated Použij `formaceSplnujeTymyKapitanskaSouhra` (výchozí = alespoň jeden). */
export function formaceMaAlesponJedenVybranyTymKapitanskaSouhra(
  hraci: readonly HutCard[],
  tymy: readonly TymFiltrKapitanskaSouhra[],
): boolean {
  return formaceSplnujeTymyKapitanskaSouhra(hraci, tymy, "alespon_jeden");
}

export function filtrujUtokPodleTymuKapitanskaSouhra(
  radky: readonly UtocnaFormaceVysledek[],
  tymy: readonly TymFiltrKapitanskaSouhra[],
  operator: OperatorKapitanskaSouhra = "alespon_jeden",
): UtocnaFormaceVysledek[] {
  if (tymy.length === 0) return [...radky];
  return radky.filter((v) =>
    formaceSplnujeTymyKapitanskaSouhra([v.lk, v.c, v.pk], tymy, operator),
  );
}

export function filtrujDvojicePodleTymuKapitanskaSouhra(
  radky: readonly DvojiceVysledek[],
  tymy: readonly TymFiltrKapitanskaSouhra[],
  operator: OperatorKapitanskaSouhra = "alespon_jeden",
): DvojiceVysledek[] {
  if (tymy.length === 0) return [...radky];
  return radky.filter((v) =>
    formaceSplnujeTymyKapitanskaSouhra([v.a, v.b], tymy, operator),
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
  typKartyMeta?: NajdiMetaTypuKartyOpts | null,
): boolean {
  const params = [r.param1, r.param2, r.param3] as const;
  const slotKarty = [kLK, kC, kPK] as const;
  return PERMUTACE3.some((perm) =>
    slotKarty.every((karta, slotIdx) =>
      kartaSplnujeParametr(
        karta,
        params[perm[slotIdx]!]!,
        narodnostiVolby,
        typKartyMeta,
      ),
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
  typKartyMeta?: NajdiMetaTypuKartyOpts | null,
): boolean {
  const params = [r.param1, r.param2] as const;
  const slotKarty = [kA, kB] as const;
  return PERMUTACE2.some((perm) =>
    slotKarty.every((karta, slotIdx) =>
      kartaSplnujeParametr(
        karta,
        params[perm[slotIdx]!]!,
        narodnostiVolby,
        typKartyMeta,
      ),
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
  typKartyMeta?: NajdiMetaTypuKartyOpts | null,
): [BonusKombinaceParametr, BonusKombinaceParametr, BonusKombinaceParametr] | null {
  const params = [r.param1, r.param2, r.param3] as const;
  const slotKarty = [kLK, kC, kPK] as const;
  for (const perm of PERMUTACE3) {
    if (
      slotKarty.every((karta, slotIdx) =>
        kartaSplnujeParametr(
          karta,
          params[perm[slotIdx]!]!,
          narodnostiVolby,
          typKartyMeta,
        ),
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
  typKartyMeta?: NajdiMetaTypuKartyOpts | null,
): [BonusKombinaceParametr, BonusKombinaceParametr] | null {
  const params = [r.param1, r.param2] as const;
  const slotKarty = [kA, kB] as const;
  for (const perm of PERMUTACE2) {
    if (
      slotKarty.every((karta, slotIdx) =>
        kartaSplnujeParametr(
          karta,
          params[perm[slotIdx]!]!,
          narodnostiVolby,
          typKartyMeta,
        ),
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
  /** Aliasy typů karet (TOTW ↔ TEAM OF THE WEEK) — bez toho CLK často nic nenajde. */
  typKartyMeta?: NajdiMetaTypuKartyOpts | null;
};

export type SpoctiObranneDvojiceOpts = {
  /**
   * Když true, na slot LO lze dát hráče s pozicí LO nebo PO a na PO také LO nebo PO
   * (stejná sada „křídel“ obrany, dva různí hráči).
   */
  loPoVzajemne?: boolean;
  typKartyMeta?: NajdiMetaTypuKartyOpts | null;
};

export type SpoctiGolmanskeDvojiceOpts = {
  typKartyMeta?: NajdiMetaTypuKartyOpts | null;
};

/** Neuspořádaná trojice karet (stejná lajna bez ohledu na LK/C/PK). */
export function klicNeusporadaneTrojiceIde(
  aId: string,
  bId: string,
  cId: string,
): string {
  return [aId, bId, cId].slice().sort().join("|");
}

/** Neuspořádaná dvojice karet. */
export function klicNeusporadaneDvojiceIde(aId: string, bId: string): string {
  return [aId, bId].slice().sort().join("|");
}

/** Stejní hráči podle jména (bez ohledu na typ karty / sloty). */
export function klicNeusporadaneTrojiceJmen(
  a: Pick<HutCard, "jmeno">,
  b: Pick<HutCard, "jmeno">,
  c: Pick<HutCard, "jmeno">,
): string {
  return [a, b, c]
    .map((k) => normalizujJmenoKarty(k.jmeno))
    .sort()
    .join("|");
}

export function klicNeusporadaneDvojiceJmen(
  a: Pick<HutCard, "jmeno">,
  b: Pick<HutCard, "jmeno">,
): string {
  return [a, b]
    .map((k) => normalizujJmenoKarty(k.jmeno))
    .sort()
    .join("|");
}

/**
 * Preferuj přiřazení hráčů na „jejich“ sloty (C na C, LK na LK, …),
 * ať při konsolidaci permutací nezbude náhodné prohození křídel.
 */
export function skorePrirazeniSlotuUtok(
  kLK: HutCard,
  kC: HutCard,
  kPK: HutCard,
): number {
  let s = 0;
  if (kLK.pozice === "LK") s += 4;
  else if (kLK.pozice === "C") s += 2;
  else if (kLK.pozice === "PK") s += 1;
  if (kC.pozice === "C") s += 4;
  if (kPK.pozice === "PK") s += 4;
  else if (kPK.pozice === "C") s += 2;
  else if (kPK.pozice === "LK") s += 1;
  return s;
}

export function skorePrirazeniSlotuObrana(kLO: HutCard, kPO: HutCard): number {
  let s = 0;
  if (kLO.pozice === "LO") s += 2;
  if (kPO.pozice === "PO") s += 2;
  return s;
}

function skoreSestavyUtokProZobrazeni(v: UtocnaFormaceVysledek): number {
  return (
    skorePrirazeniSlotuUtok(v.lk, v.c, v.pk) * 1_000 +
    v.lk.ovr +
    v.c.ovr +
    v.pk.ovr
  );
}

function skoreSestavyDvojiceProZobrazeni(v: DvojiceVysledek): number {
  return skorePrirazeniSlotuObrana(v.a, v.b) * 1_000 + v.a.ovr + v.b.ovr;
}

/** Nižší = lepší pro zástupný řádek (PLAT před CLK před BS, pak vyšší hodnota). */
function prioritaKombinaceProHlavicku(r: RadekBonusKombinaceUi): number {
  const typIdx = TYPY_BONUSU_KOMBINACE.indexOf(r.bonusTyp);
  const typRad = typIdx >= 0 ? typIdx : TYPY_BONUSU_KOMBINACE.length;
  const h =
    r.bonusHodnota != null && Number.isFinite(r.bonusHodnota) ? r.bonusHodnota : 0;
  return typRad * 1_000_000 - h;
}

function jeLepsizastupnyUtok(
  kandidat: UtocnaFormaceVysledek,
  dosud: UtocnaFormaceVysledek,
): boolean {
  const prioK = prioritaKombinaceProHlavicku(kandidat.kombinace);
  const prioD = prioritaKombinaceProHlavicku(dosud.kombinace);
  if (prioK !== prioD) return prioK < prioD;
  return skoreSestavyUtokProZobrazeni(kandidat) > skoreSestavyUtokProZobrazeni(dosud);
}

function jeLepsizastupnaDvojice(
  kandidat: DvojiceVysledek,
  dosud: DvojiceVysledek,
): boolean {
  const prioK = prioritaKombinaceProHlavicku(kandidat.kombinace);
  const prioD = prioritaKombinaceProHlavicku(dosud.kombinace);
  if (prioK !== prioD) return prioK < prioD;
  return skoreSestavyDvojiceProZobrazeni(kandidat) > skoreSestavyDvojiceProZobrazeni(dosud);
}

/**
 * Jedna neuspořádaná sestava jmen hráčů = jeden řádek (bonusy se sčítají v UI).
 * Volat až po filtru typu bonusu.
 */
export function konsolidujUtokNaJednuTrojici(
  radky: readonly UtocnaFormaceVysledek[],
): UtocnaFormaceVysledek[] {
  const best = new Map<string, UtocnaFormaceVysledek>();
  for (const v of radky) {
    const k = klicNeusporadaneTrojiceJmen(v.lk, v.c, v.pk);
    const prev = best.get(k);
    if (!prev || jeLepsizastupnyUtok(v, prev)) best.set(k, v);
  }
  return [...best.values()];
}

export function konsolidujDvojiceNaJednuSestavu(
  radky: readonly DvojiceVysledek[],
): DvojiceVysledek[] {
  const best = new Map<string, DvojiceVysledek>();
  for (const v of radky) {
    const k = klicNeusporadaneDvojiceJmen(v.a, v.b);
    const prev = best.get(k);
    if (!prev || jeLepsizastupnaDvojice(v, prev)) best.set(k, v);
  }
  return [...best.values()];
}

/**
 * Útočné trojice LK + C + PK; každý ze tří symbolů kombinace připadne některé pozici (libovolné pořadí).
 * Stejná neuspořádaná trojice + stejná kombinace jen jednou (preferuje přirozené sloty).
 */
export function spoctiUtocneFormace(
  karty: readonly HutCard[],
  radkyKombinaci: readonly RadekBonusKombinaceUi[],
  narodnostiVolby: readonly NarodnostVolba[],
  opts?: SpoctiUtocneFormaceOpts | null,
): UtocnaFormaceVysledek[] {
  const kridlaVzajemna = Boolean(opts?.kridlaVzajemna);
  const typKartyMeta = opts?.typKartyMeta ?? null;
  const kridla: HutCard[] = karty.filter(
    (k) => k.pozice === "LK" || k.pozice === "PK" || k.pozice === "C",
  );
  const lk = kridlaVzajemna ? kridla : karty.filter((k) => k.pozice === "LK");
  const c = karty.filter((k) => k.pozice === "C");
  const pk = kridlaVzajemna ? kridla : karty.filter((k) => k.pozice === "PK");
  const narodnostKodMap = vytvorNarodnostKodMap(narodnostiVolby);
  const best = new Map<string, { v: UtocnaFormaceVysledek; skore: number }>();

  for (const r of radkyKombinaci) {
    const kR = klicLogickeKombinace(r);
    const params = [r.param1, r.param2, r.param3] as const;
    const lkK = lk
      .map((k) => ({
        k,
        m: maskaTriParametru(k, params, narodnostKodMap, typKartyMeta),
      }))
      .filter((x) => x.m > 0);
    const cK = c
      .map((k) => ({
        k,
        m: maskaTriParametru(k, params, narodnostKodMap, typKartyMeta),
      }))
      .filter((x) => x.m > 0);
    const pkK = pk
      .map((k) => ({
        k,
        m: maskaTriParametru(k, params, narodnostKodMap, typKartyMeta),
      }))
      .filter((x) => x.m > 0);
    for (const { k: kLK, m: mLK } of lkK) {
      for (const { k: kC, m: mC } of cK) {
        if (kC.id === kLK.id) continue;
        for (const { k: kPK, m: mPK } of pkK) {
          if (kPK.id === kLK.id || kPK.id === kC.id) continue;
          if (!trojiceMaskyOk(mLK, mC, mPK)) continue;
          const klic = `${kR}|${klicNeusporadaneTrojiceIde(kLK.id, kC.id, kPK.id)}`;
          const skore = skorePrirazeniSlotuUtok(kLK, kC, kPK);
          const prev = best.get(klic);
          if (prev && prev.skore >= skore) continue;
          best.set(klic, {
            v: { kombinace: r, lk: kLK, c: kC, pk: kPK },
            skore,
          });
        }
      }
    }
  }
  return [...best.values()].map((x) => x.v);
}

/**
 * Obranné dvojice LO + PO; oba symboly kombinace přiřaditelné k LO/PO v libovolném pořadí.
 * Stejná neuspořádaná dvojice + stejná kombinace jen jednou (preferuje LO/PO podle pozice karty).
 */
export function spoctiObranneDvojice(
  karty: readonly HutCard[],
  radkyKombinaci: readonly RadekBonusKombinaceUi[],
  narodnostiVolby: readonly NarodnostVolba[],
  opts?: SpoctiObranneDvojiceOpts | null,
): DvojiceVysledek[] {
  const loPoVzajemne = Boolean(opts?.loPoVzajemne);
  const typKartyMeta = opts?.typKartyMeta ?? null;
  const loNeboPo: HutCard[] = karty.filter((k) => k.pozice === "LO" || k.pozice === "PO");
  const lo = loPoVzajemne ? loNeboPo : karty.filter((k) => k.pozice === "LO");
  const po = loPoVzajemne ? loNeboPo : karty.filter((k) => k.pozice === "PO");
  const narodnostKodMap = vytvorNarodnostKodMap(narodnostiVolby);
  const best = new Map<string, { v: DvojiceVysledek; skore: number }>();

  for (const r of radkyKombinaci) {
    const kR = klicLogickeKombinace(r);
    const params = [r.param1, r.param2] as const;
    const loK = lo
      .map((k) => ({
        k,
        m: maskaDvuParametru(k, params, narodnostKodMap, typKartyMeta),
      }))
      .filter((x) => x.m > 0);
    const poK = po
      .map((k) => ({
        k,
        m: maskaDvuParametru(k, params, narodnostKodMap, typKartyMeta),
      }))
      .filter((x) => x.m > 0);
    for (const { k: kLO, m: mLO } of loK) {
      for (const { k: kPO, m: mPO } of poK) {
        if (kLO.id === kPO.id) continue;
        if (!dvojiceMaskyOk(mLO, mPO)) continue;
        const klic = `${kR}|${klicNeusporadaneDvojiceIde(kLO.id, kPO.id)}`;
        const skore = skorePrirazeniSlotuObrana(kLO, kPO);
        const prev = best.get(klic);
        if (prev && prev.skore >= skore) continue;
        best.set(klic, { v: { kombinace: r, a: kLO, b: kPO }, skore });
      }
    }
  }
  return [...best.values()].map((x) => x.v);
}

/**
 * Dvojice brankářů (G + G); stejná logika jako obrana (symboly v libovolném pořadí mezi G1/G2).
 * Každá neuspořádaná dvojice karet jen jednou (kanonicky nižší id jako G1).
 */
/** Normalizované jméno hráče pro porovnání (stejný hráč, jiný typ karty). */
export function normalizujJmenoKarty(jmeno: string): string {
  return jmeno.trim().toLowerCase();
}

export function utokMaUnikatniJmenaVeFormaci(v: UtocnaFormaceVysledek): boolean {
  const jmena = [v.lk, v.c, v.pk].map((k) => normalizujJmenoKarty(k.jmeno));
  return new Set(jmena).size === 3;
}

export function dvojiceMaUnikatniJmenaVeFormaci(v: DvojiceVysledek): boolean {
  return (
    normalizujJmenoKarty(v.a.jmeno) !== normalizujJmenoKarty(v.b.jmeno)
  );
}

export function filtrujUtokBezDuplicitnihoJmena(
  radky: readonly UtocnaFormaceVysledek[],
): UtocnaFormaceVysledek[] {
  return radky.filter(utokMaUnikatniJmenaVeFormaci);
}

export function filtrujDvojiceBezDuplicitnihoJmena(
  radky: readonly DvojiceVysledek[],
): DvojiceVysledek[] {
  return radky.filter(dvojiceMaUnikatniJmenaVeFormaci);
}

export function spoctiGolmanskeDvojice(
  karty: readonly HutCard[],
  radkyKombinaci: readonly RadekBonusKombinaceUi[],
  narodnostiVolby: readonly NarodnostVolba[],
  opts?: SpoctiGolmanskeDvojiceOpts | null,
): DvojiceVysledek[] {
  const typKartyMeta = opts?.typKartyMeta ?? null;
  const gs = karty.filter((k) => k.pozice === "G");
  const narodnostKodMap = vytvorNarodnostKodMap(narodnostiVolby);
  const out: DvojiceVysledek[] = [];
  const videnyRadek = new Set<string>();

  for (const r of radkyKombinaci) {
    const kR = klicLogickeKombinace(r);
    const params = [r.param1, r.param2] as const;
    const gK = gs
      .map((k) => ({
        k,
        m: maskaDvuParametru(k, params, narodnostKodMap, typKartyMeta),
      }))
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
