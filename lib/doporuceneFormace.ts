import type { HutCard } from "@/types";
import {
  klicLogickeKombinace,
  jeKompletniRadek,
  TYPY_BONUSU_KOMBINACE,
  type BonusKombinaceParametr,
  type RadekBonusKombinaceUi,
  type TypBonusuKombinace,
} from "@/lib/bonusKombinaceDb";
import type { NajdiMetaTypuKartyOpts } from "@/lib/hutdbTypKaret";
import type { NarodnostVolba } from "@/lib/narodnosti";
import {
  kartaSplnujeParametrRychle,
  normalizujJmenoKarty,
  skorePrirazeniSlotuObrana,
  skorePrirazeniSlotuUtok,
  vytvorNarodnostKodMap,
} from "@/lib/optimalizatorFormaci";

/** Horní mez skupin ve výsledku — silnější složený bonus vytlačí slabší. */
const MAX_SKUPIN = 250;

export type DruhDoporuceneFormace = "utok" | "obrana" | "golmani";

export type BonusDoporuceni = {
  typ: TypBonusuKombinace;
  hodnota: number;
  klic: string;
  kombinace: RadekBonusKombinaceUi;
};

/** Jedna karta k sehnání = všechny tyto symboly najednou (AND). */
export type ProfilKartyKSehnani = {
  pozadavky: BonusKombinaceParametr[];
  klic: string;
};

export type MoznostSehnat = {
  karty: ProfilKartyKSehnani[];
};

export type SkupinaDoporuceni = {
  klic: string;
  druh: DruhDoporuceneFormace;
  pocetChybi: 1 | 2;
  vlastnene: HutCard[];
  moznosti: MoznostSehnat[];
  bonusy: BonusDoporuceni[];
  pocetBonusu: number;
  pocetTypu: number;
  clk: number;
  bs: number;
  plat: number;
};

export type HledaniDoporucenychVstup = {
  vlastnene: readonly HutCard[];
  utocne: readonly RadekBonusKombinaceUi[];
  obranne: readonly RadekBonusKombinaceUi[];
  narodnosti: readonly NarodnostVolba[];
  typKartyMeta?: NajdiMetaTypuKartyOpts | null;
  /** 1 = jen jedna chybějící karta, 2 = i dvě (útok). */
  maxChybejicich: 1 | 2;
};

export type HledaniDoporucenychHooks = {
  signal?: AbortSignal;
  onProgress?: (pct: number, text: string) => void;
};

type ComboRef = {
  index: number;
  radek: RadekBonusKombinaceUi;
  klic: string;
  paramIds: number[];
};

type Pool = {
  karty: HutCard[];
  jmena: string[];
  ovr: number[];
  bity: Uint32Array[];
};

type SkupinaBuild = SkupinaDoporuceni & { ovrVlastnene: number };

function klicParametru(p: BonusKombinaceParametr): string {
  switch (p.typ) {
    case "narodnost":
      return `n:${p.narodnostKod.trim()}`;
    case "tym":
      return `t:${p.liga}:${p.tym.trim()}`;
    case "typ_karty": {
      const t = p.typKarty.trim();
      return t === "*" ? "k:*" : `k:${t}`;
    }
  }
}

function jeWildcardTyp(p: BonusKombinaceParametr): boolean {
  return p.typ === "typ_karty" && p.typKarty.trim() === "*";
}

/** Spojí požadavky na jednu kartu; `null` = konflikt (např. dvě různé národnosti). */
export function sloucitPozadavky(
  params: readonly BonusKombinaceParametr[],
): BonusKombinaceParametr[] | null {
  const podleTypu = new Map<BonusKombinaceParametr["typ"], BonusKombinaceParametr>();
  for (const p of params) {
    if (jeWildcardTyp(p)) continue;
    const prev = podleTypu.get(p.typ);
    if (!prev) {
      podleTypu.set(p.typ, p);
      continue;
    }
    if (klicParametru(prev) !== klicParametru(p)) return null;
  }
  const out = [...podleTypu.values()];
  if (out.length === 0) {
    // Jen wildcards — karta může být libovolná
    return [{ typ: "typ_karty", typKarty: "*" }];
  }
  return out.sort((a, b) => klicParametru(a).localeCompare(klicParametru(b)));
}

function profilZParametru(params: readonly BonusKombinaceParametr[]): ProfilKartyKSehnani | null {
  const sloucen = sloucitPozadavky(params);
  if (!sloucen) return null;
  return {
    pozadavky: sloucen,
    klic: sloucen.map(klicParametru).join("+"),
  };
}

function klicMoznosti(karty: readonly ProfilKartyKSehnani[]): string {
  return karty
    .map((k) => k.klic)
    .slice()
    .sort()
    .join("||");
}

function souctyZBonusu(bonusy: readonly BonusDoporuceni[]): {
  clk: number;
  bs: number;
  plat: number;
  pocetTypu: number;
} {
  let clk = 0;
  let bs = 0;
  let plat = 0;
  const typy = new Set<TypBonusuKombinace>();
  for (const b of bonusy) {
    typy.add(b.typ);
    if (b.typ === "CLK") clk += b.hodnota;
    else if (b.typ === "BS") bs += b.hodnota;
    else plat += b.hodnota;
  }
  return { clk, bs, plat, pocetTypu: typy.size };
}

function porovnejSkupiny(a: SkupinaBuild, b: SkupinaBuild): number {
  if (a.pocetBonusu !== b.pocetBonusu) return b.pocetBonusu - a.pocetBonusu;
  if (a.pocetTypu !== b.pocetTypu) return b.pocetTypu - a.pocetTypu;
  if (a.clk !== b.clk) return b.clk - a.clk;
  if (a.bs !== b.bs) return b.bs - a.bs;
  if (a.plat !== b.plat) return b.plat - a.plat;
  if (a.pocetChybi !== b.pocetChybi) return a.pocetChybi - b.pocetChybi;
  return b.ovrVlastnene - a.ovrVlastnene;
}

function sleep(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function hasBit(bits: Uint32Array, i: number): boolean {
  return (bits[i >>> 5]! & (1 << (i & 31))) !== 0;
}

function setBit(bits: Uint32Array, i: number): void {
  bits[i >>> 5]! |= 1 << (i & 31);
}

class SberSkupin {
  private readonly map = new Map<string, SkupinaBuild>();

  constructor(
    private readonly druh: DruhDoporuceneFormace,
    private readonly combos: readonly ComboRef[],
  ) {}

  pridej(
    vlastnene: readonly HutCard[],
    moznost: MoznostSehnat,
    comboIdxs: readonly number[],
  ): void {
    if (comboIdxs.length < 2 || moznost.karty.length < 1) return;
    const bonusy: BonusDoporuceni[] = comboIdxs.map((i) => {
      const c = this.combos[i]!;
      return {
        typ: c.radek.bonusTyp,
        hodnota: c.radek.bonusHodnota ?? 0,
        klic: c.klic,
        kombinace: c.radek,
      };
    });
    bonusy.sort(
      (a, b) =>
        TYPY_BONUSU_KOMBINACE.indexOf(a.typ) - TYPY_BONUSU_KOMBINACE.indexOf(b.typ) ||
        b.hodnota - a.hodnota,
    );
    const { clk, bs, plat, pocetTypu } = souctyZBonusu(bonusy);
    const ownedIds = vlastnene
      .map((k) => k.id)
      .slice()
      .sort();
    const bonusKlic = bonusy
      .map((b) => b.klic)
      .slice()
      .sort()
      .join("~");
    const klic = `${this.druh}|${ownedIds.join(",")}|${bonusKlic}`;
    const ovrVlastnene = vlastnene.reduce((s, k) => s + k.ovr, 0);
    const prev = this.map.get(klic);
    if (prev) {
      const sig = klicMoznosti(moznost.karty);
      if (!prev.moznosti.some((m) => klicMoznosti(m.karty) === sig)) {
        prev.moznosti.push(moznost);
      }
      return;
    }
    const build: SkupinaBuild = {
      klic,
      druh: this.druh,
      pocetChybi: (moznost.karty.length === 1 ? 1 : 2) as 1 | 2,
      vlastnene: [...vlastnene],
      moznosti: [moznost],
      bonusy,
      pocetBonusu: bonusy.length,
      pocetTypu,
      clk,
      bs,
      plat,
      ovrVlastnene,
    };
    if (this.map.size < MAX_SKUPIN) {
      this.map.set(klic, build);
      return;
    }
    let worstKey: string | null = null;
    let worst: SkupinaBuild | null = null;
    for (const [k, v] of this.map) {
      if (!worst || porovnejSkupiny(v, worst) > 0) {
        worst = v;
        worstKey = k;
      }
    }
    if (worst && worstKey && porovnejSkupiny(build, worst) < 0) {
      this.map.delete(worstKey);
      this.map.set(klic, build);
    }
  }

  hotovo(): SkupinaDoporuceni[] {
    return [...this.map.values()].sort(porovnejSkupiny).map((skupina) => ({
      klic: skupina.klic,
      druh: skupina.druh,
      pocetChybi: skupina.pocetChybi,
      vlastnene: skupina.vlastnene,
      moznosti: skupina.moznosti,
      bonusy: skupina.bonusy,
      pocetBonusu: skupina.pocetBonusu,
      pocetTypu: skupina.pocetTypu,
      clk: skupina.clk,
      bs: skupina.bs,
      plat: skupina.plat,
    }));
  }
}

function pripravKomba(
  radky: readonly RadekBonusKombinaceUi[],
  pocetParametru: 2 | 3,
  paramId: (p: BonusKombinaceParametr) => number,
): ComboRef[] {
  const typ = pocetParametru === 3 ? "utocna" : "obranna";
  const videne = new Set<string>();
  const out: ComboRef[] = [];
  for (const r of radky) {
    if (!jeKompletniRadek(r, typ)) continue;
    const klic = klicLogickeKombinace(r);
    if (videne.has(klic)) continue;
    videne.add(klic);
    const params =
      pocetParametru === 3 ? [r.param1, r.param2, r.param3] : [r.param1, r.param2];
    out.push({
      index: out.length,
      radek: r,
      klic,
      paramIds: params.map((p) => paramId(p)),
    });
  }
  return out;
}

function sestavPoolOwned(
  vlastnene: readonly HutCard[],
  filtr: (k: HutCard) => boolean,
  paramDefs: readonly BonusKombinaceParametr[],
  splnuje: (k: HutCard, p: BonusKombinaceParametr) => boolean,
): Pool {
  const karty: HutCard[] = [];
  for (const k of vlastnene) {
    if (!filtr(k) || !k.jmeno.trim()) continue;
    karty.push(k);
  }
  const words = Math.max(1, Math.ceil(paramDefs.length / 32));
  const bity: Uint32Array[] = [];
  const jmena: string[] = [];
  const ovr: number[] = [];
  for (let i = 0; i < karty.length; i++) {
    const k = karty[i]!;
    jmena.push(normalizujJmenoKarty(k.jmeno));
    ovr.push(k.ovr);
    const bits = new Uint32Array(words);
    for (let p = 0; p < paramDefs.length; p++) {
      if (splnuje(k, paramDefs[p]!)) setBit(bits, p);
    }
    bity.push(bits);
  }
  return { karty, jmena, ovr, bity };
}

function jeUtocnik(k: HutCard): boolean {
  return k.pozice === "LK" || k.pozice === "C" || k.pozice === "PK";
}

function jeObrance(k: HutCard): boolean {
  return k.pozice === "LO" || k.pozice === "PO";
}

/**
 * Pro danou dvojici vlastněných karet: které combos dokážou pokrýt 2 ze 3 symbolů
 * a jaký parametr zbývá na třetí kartu.
 */
function chybejiciParametryTrojice(
  bitsA: Uint32Array,
  bitsB: Uint32Array,
  combo: ComboRef,
): number[] {
  const [p0, p1, p2] = combo.paramIds;
  const out: number[] = [];
  const pridej = (maA: boolean, maB: boolean, chybi: number) => {
    if (maA && maB && !out.includes(chybi)) out.push(chybi);
  };
  // A→p0, B→p1, chybí p2 (a prohození A/B)
  pridej(hasBit(bitsA, p0!), hasBit(bitsB, p1!), p2!);
  pridej(hasBit(bitsB, p0!), hasBit(bitsA, p1!), p2!);
  pridej(hasBit(bitsA, p0!), hasBit(bitsB, p2!), p1!);
  pridej(hasBit(bitsB, p0!), hasBit(bitsA, p2!), p1!);
  pridej(hasBit(bitsA, p1!), hasBit(bitsB, p2!), p0!);
  pridej(hasBit(bitsB, p1!), hasBit(bitsA, p2!), p0!);
  return out;
}

/** Jedna vlastněná karta + chybějící partner u dvojice (obrana / G). */
function chybejiciParametryDvojice(bits: Uint32Array, combo: ComboRef): number[] {
  const [p0, p1] = combo.paramIds;
  const out: number[] = [];
  if (hasBit(bits, p0!) && !out.includes(p1!)) out.push(p1!);
  if (hasBit(bits, p1!) && p0 !== p1 && !out.includes(p0!)) out.push(p0!);
  return out;
}

/**
 * Z mapy combo → možné chybějící parametry sestav profily jedné karty,
 * která dokáže dokončit aspoň dvě kombinace najednou.
 */
function profilyJedneKartyProComba(
  comboMissing: ReadonlyMap<number, readonly number[]>,
  paramDefs: readonly BonusKombinaceParametr[],
  minComba = 2,
): { comboIdxs: number[]; profil: ProfilKartyKSehnani }[] {
  const entries = [...comboMissing.entries()].filter(([, ps]) => ps.length > 0);
  if (entries.length < minComba) return [];

  type Node = { idxs: number[]; paramIds: number[] };
  let vrstva: Node[] = [{ idxs: [], paramIds: [] }];

  for (const [comboIdx, candidates] of entries) {
    const next: Node[] = [];
    for (const node of vrstva) {
      // Přeskočit tento combo (nechat méně než všechny)
      next.push(node);
      for (const pid of candidates) {
        const paramIds = [...node.paramIds, pid];
        const sloucen = sloucitPozadavky(paramIds.map((i) => paramDefs[i]!));
        if (!sloucen) continue;
        next.push({ idxs: [...node.idxs, comboIdx], paramIds });
      }
    }
    // Omezit větvení — nech nejsilnější (víc combos)
    next.sort((a, b) => b.idxs.length - a.idxs.length || a.paramIds.length - b.paramIds.length);
    vrstva = next.slice(0, 120);
  }

  const out: { comboIdxs: number[]; profil: ProfilKartyKSehnani }[] = [];
  const videne = new Set<string>();
  for (const node of vrstva) {
    if (node.idxs.length < minComba) continue;
    const profil = profilZParametru(node.paramIds.map((i) => paramDefs[i]!));
    if (!profil) continue;
    const sig = `${node.idxs.slice().sort((a, b) => a - b).join(",")}|${profil.klic}`;
    if (videne.has(sig)) continue;
    videne.add(sig);
    out.push({
      comboIdxs: node.idxs.slice().sort((a, b) => a - b),
      profil,
    });
  }
  // Preferuj pokrytí více bonusů
  out.sort((a, b) => b.comboIdxs.length - a.comboIdxs.length);
  return out.slice(0, 24);
}

async function hledejTrojiceChybiJedna(
  pool: Pool,
  combos: readonly ComboRef[],
  paramDefs: readonly BonusKombinaceParametr[],
  sber: SberSkupin,
  signal: AbortSignal | undefined,
): Promise<void> {
  const n = pool.karty.length;
  let kroky = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (signal?.aborted) return;
      if (pool.jmena[i] === pool.jmena[j]) continue;
      const missing = new Map<number, number[]>();
      for (const combo of combos) {
        const ps = chybejiciParametryTrojice(pool.bity[i]!, pool.bity[j]!, combo);
        if (ps.length) missing.set(combo.index, ps);
      }
      if (missing.size < 2) continue;
      const profily = profilyJedneKartyProComba(missing, paramDefs, 2);
      for (const p of profily) {
        sber.pridej(
          [pool.karty[i]!, pool.karty[j]!],
          { karty: [p.profil] },
          p.comboIdxs,
        );
      }
      kroky += 1;
      if (kroky % 200 === 0) await sleep();
    }
  }
}

type Ukotveni2 = { combo: number; need: [number, number] };

async function hledejTrojiceChybiDve(
  pool: Pool,
  combos: readonly ComboRef[],
  paramDefs: readonly BonusKombinaceParametr[],
  sber: SberSkupin,
  signal: AbortSignal | undefined,
): Promise<void> {
  for (let o = 0; o < pool.karty.length; o++) {
    if (signal?.aborted) return;
    const bits = pool.bity[o]!;
    const ukotveni: Ukotveni2[] = [];
    for (const combo of combos) {
      const ids = combo.paramIds;
      for (let s = 0; s < ids.length; s++) {
        if (!hasBit(bits, ids[s]!)) continue;
        const need = ids.filter((_, i) => i !== s);
        if (need.length !== 2) continue;
        ukotveni.push({ combo: combo.index, need: [need[0]!, need[1]!] });
      }
    }
    if (ukotveni.length < 2) continue;

    for (let i = 0; i < ukotveni.length; i++) {
      for (let j = i + 1; j < ukotveni.length; j++) {
        const A = ukotveni[i]!;
        const B = ukotveni[j]!;
        if (A.combo === B.combo) continue;
        const pairings: [number, number][][] = [
          [
            [A.need[0], B.need[0]],
            [A.need[1], B.need[1]],
          ],
          [
            [A.need[0], B.need[1]],
            [A.need[1], B.need[0]],
          ],
        ];
        for (const pairing of pairings) {
          const p0 = profilZParametru(pairing[0]!.map((id) => paramDefs[id]!));
          const p1 = profilZParametru(pairing[1]!.map((id) => paramDefs[id]!));
          if (!p0 || !p1) continue;
          // Zkus přidat další combos se stejným párem profilů
          const covered = new Set<number>([A.combo, B.combo]);
          for (const u of ukotveni) {
            if (covered.has(u.combo)) continue;
            const a0 = sloucitPozadavky([...p0.pozadavky, paramDefs[u.need[0]!]!]);
            const a1 = sloucitPozadavky([...p1.pozadavky, paramDefs[u.need[1]!]!]);
            const b0 = sloucitPozadavky([...p0.pozadavky, paramDefs[u.need[1]!]!]);
            const b1 = sloucitPozadavky([...p1.pozadavky, paramDefs[u.need[0]!]!]);
            if ((a0 && a1) || (b0 && b1)) covered.add(u.combo);
          }
          if (covered.size < 2) continue;
          sber.pridej(
            [pool.karty[o]!],
            { karty: [p0, p1].sort((a, b) => a.klic.localeCompare(b.klic)) },
            [...covered].sort((a, b) => a - b),
          );
        }
      }
    }
    if (o % 20 === 0) await sleep();
  }
}

async function hledejDvojiceChybiJedna(
  pool: Pool,
  combos: readonly ComboRef[],
  paramDefs: readonly BonusKombinaceParametr[],
  sber: SberSkupin,
  signal: AbortSignal | undefined,
): Promise<void> {
  for (let o = 0; o < pool.karty.length; o++) {
    if (signal?.aborted) return;
    const missing = new Map<number, number[]>();
    for (const combo of combos) {
      const ps = chybejiciParametryDvojice(pool.bity[o]!, combo);
      if (ps.length) missing.set(combo.index, ps);
    }
    if (missing.size < 2) continue;
    const profily = profilyJedneKartyProComba(missing, paramDefs, 2);
    for (const p of profily) {
      sber.pridej([pool.karty[o]!], { karty: [p.profil] }, p.comboIdxs);
    }
    if (o % 40 === 0) await sleep();
  }
}

function porovnejVystup(a: SkupinaDoporuceni, b: SkupinaDoporuceni): number {
  if (a.pocetBonusu !== b.pocetBonusu) return b.pocetBonusu - a.pocetBonusu;
  if (a.pocetTypu !== b.pocetTypu) return b.pocetTypu - a.pocetTypu;
  if (a.clk !== b.clk) return b.clk - a.clk;
  if (a.bs !== b.bs) return b.bs - a.bs;
  if (a.plat !== b.plat) return b.plat - a.plat;
  if (a.pocetChybi !== b.pocetChybi) return a.pocetChybi - b.pocetChybi;
  const ovrA = a.vlastnene.reduce((s, k) => s + k.ovr, 0);
  const ovrB = b.vlastnene.reduce((s, k) => s + k.ovr, 0);
  return ovrB - ovrA;
}

/**
 * Skoro hotové formace podle kombinací z Nastavení bonusů (import Hut Builder).
 * Chybějící 1–2 karty jsou popsané symboly chemie (národnost / tým / typ karty),
 * ne konkrétními hráči z katalogu komunity.
 */
export async function hledejDoporuceneFormace(
  vstup: HledaniDoporucenychVstup,
  hooks?: HledaniDoporucenychHooks,
): Promise<SkupinaDoporuceni[]> {
  const signal = hooks?.signal;
  const progress = hooks?.onProgress ?? (() => {});
  const meta = vstup.typKartyMeta ?? null;
  const narodnostMap = vytvorNarodnostKodMap(vstup.narodnosti);
  const splnuje = (k: HutCard, p: BonusKombinaceParametr) =>
    kartaSplnujeParametrRychle(k, p, narodnostMap, meta);

  const paramDefs: BonusKombinaceParametr[] = [];
  const paramKlic = new Map<string, number>();
  const paramId = (p: BonusKombinaceParametr) => {
    const klic = klicParametru(p);
    const exist = paramKlic.get(klic);
    if (exist !== undefined) return exist;
    const id = paramDefs.length;
    paramKlic.set(klic, id);
    paramDefs.push(p);
    return id;
  };

  const utocne = pripravKomba(vstup.utocne, 3, paramId);
  const obranne = pripravKomba(vstup.obranne, 2, paramId);

  progress(10, "Připravuji útočníky…");
  const utok = sestavPoolOwned(vstup.vlastnene, jeUtocnik, paramDefs, splnuje);
  const sberUtok = new SberSkupin("utok", utocne);
  progress(25, "Hledám útok, kde chybí jedna karta…");
  await hledejTrojiceChybiJedna(utok, utocne, paramDefs, sberUtok, signal);
  if (signal?.aborted) return [];
  if (vstup.maxChybejicich >= 2) {
    progress(55, "Hledám útok, kde chybí dvě karty…");
    await hledejTrojiceChybiDve(utok, utocne, paramDefs, sberUtok, signal);
    if (signal?.aborted) return [];
  }

  progress(75, "Hledám obranu…");
  const obrana = sestavPoolOwned(vstup.vlastnene, jeObrance, paramDefs, splnuje);
  const sberObrana = new SberSkupin("obrana", obranne);
  await hledejDvojiceChybiJedna(obrana, obranne, paramDefs, sberObrana, signal);
  if (signal?.aborted) return [];

  progress(90, "Hledám brankáře…");
  const golmani = sestavPoolOwned(vstup.vlastnene, (k) => k.pozice === "G", paramDefs, splnuje);
  const sberG = new SberSkupin("golmani", obranne);
  await hledejDvojiceChybiJedna(golmani, obranne, paramDefs, sberG, signal);
  if (signal?.aborted) return [];

  progress(100, "Hotovo");
  return [...sberUtok.hotovo(), ...sberObrana.hotovo(), ...sberG.hotovo()].sort(porovnejVystup);
}

export type SlotDoporuceni =
  | {
      druh: "vlastnena";
      karta: HutCard;
      role: "LK" | "C" | "PK" | "LO" | "PO" | "G1" | "G2";
    }
  | {
      druh: "sehnat";
      profil: ProfilKartyKSehnani;
      role: "LK" | "C" | "PK" | "LO" | "PO" | "G1" | "G2";
    };

/** Rozloží vlastněné hráče a profily k sehnání do slotů lajny. */
export function slotyDoporuceni(
  druh: DruhDoporuceneFormace,
  vlastnene: readonly HutCard[],
  sehnat: readonly ProfilKartyKSehnani[],
): SlotDoporuceni[] {
  const rolesUtok = ["LK", "C", "PK"] as const;
  const rolesObrana = ["LO", "PO"] as const;
  const rolesG = ["G1", "G2"] as const;
  const roles =
    druh === "utok" ? rolesUtok : druh === "obrana" ? rolesObrana : rolesG;

  if (druh === "utok" && vlastnene.length === 2 && sehnat.length === 1) {
    const [a, b] = vlastnene as [HutCard, HutCard];
    let best: [HutCard, HutCard] = [a, b];
    let bestSkore = -1;
    for (const [x, y] of [
      [a, b],
      [b, a],
    ] as const) {
      // Placeholder na PK — skóre jen z prvních dvou
      const skore = skorePrirazeniSlotuUtok(x, y, y);
      if (skore > bestSkore) {
        bestSkore = skore;
        best = [x, y];
      }
    }
    return [
      { druh: "vlastnena", karta: best[0], role: "LK" },
      { druh: "vlastnena", karta: best[1], role: "C" },
      { druh: "sehnat", profil: sehnat[0]!, role: "PK" },
    ];
  }

  if (druh === "utok" && vlastnene.length === 1 && sehnat.length === 2) {
    return [
      { druh: "vlastnena", karta: vlastnene[0]!, role: "C" },
      { druh: "sehnat", profil: sehnat[0]!, role: "LK" },
      { druh: "sehnat", profil: sehnat[1]!, role: "PK" },
    ];
  }

  if (vlastnene.length === 1 && sehnat.length === 1) {
    const roleA = roles[0]!;
    const roleB = roles[1]!;
    if (druh === "obrana") {
      const k = vlastnene[0]!;
      if (k.pozice === "PO" || skorePrirazeniSlotuObrana(k, k) < 1) {
        // Preferuj vlastní na jeho straně
      }
      if (k.pozice === "PO") {
        return [
          { druh: "sehnat", profil: sehnat[0]!, role: "LO" },
          { druh: "vlastnena", karta: k, role: "PO" },
        ];
      }
    }
    return [
      { druh: "vlastnena", karta: vlastnene[0]!, role: roleA },
      { druh: "sehnat", profil: sehnat[0]!, role: roleB },
    ];
  }

  // Fallback — vlastněné napřed, pak sehnat
  const out: SlotDoporuceni[] = [];
  let ri = 0;
  for (const k of vlastnene) {
    out.push({ druh: "vlastnena", karta: k, role: roles[Math.min(ri, roles.length - 1)]! });
    ri += 1;
  }
  for (const p of sehnat) {
    out.push({ druh: "sehnat", profil: p, role: roles[Math.min(ri, roles.length - 1)]! });
    ri += 1;
  }
  return out;
}
