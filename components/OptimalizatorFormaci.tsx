"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { jeBonusAdmin } from "@/lib/bonusAdmin";
import { createClient } from "@/lib/supabase/client";
import { nactiKartyUzivatele } from "@/lib/cardsDb";
import { ceskaZpravaAuthNeboDb } from "@/lib/supabaseChybyCs";
import {
  formatujBonusVRadkuNahled,
  klicLogickeKombinace,
  nactiBonusKombinaceSdilene,
  novyRadekBonusu,
  type BonusKombinaceParametr,
  type RadekBonusKombinaceUi,
  TYPY_BONUSU_KOMBINACE,
  type TypBonusuKombinace,
} from "@/lib/bonusKombinaceDb";
import {
  filtrujDvojicePodleTymuKapitanskaSouhra,
  filtrujKartyPodleOvr,
  filtrujUtokPodleTymuKapitanskaSouhra,
  klicTymFiltruKapitanskaSouhra,
  parseOvrVolitelne,
  prirazeniSymboluDvojice,
  prirazeniSymboluUtok,
  spoctiGolmanskeDvojice,
  spoctiObranneDvojice,
  spoctiUtocneFormace,
  type DvojiceVysledek,
  type TymFiltrKapitanskaSouhra,
  type UtocnaFormaceVysledek,
} from "@/lib/optimalizatorFormaci";
import { vsechnyNarodnostiCS, vlajkaZeme } from "@/lib/narodnosti";
import { urlLogaTymu } from "@/lib/tymLoga";
import { LIGA_ZOBRAZENI } from "@/lib/tymyPodleLigy";
import { HUT_POZICE_ZKRATKA } from "@/lib/hutPozice";
import { formatovatPlatVMil, parsePlatVstupVMilionech } from "@/lib/platMiliony";
import type { HutCard, Liga, Pozice } from "@/types";
import { TypKartyMetaOptsProvider } from "@/components/TypKartyMetaOptsContext";
import { TypKartyMiniLogo } from "@/components/TypKartyIkona";
import type { NajdiMetaTypuKartyOpts } from "@/lib/hutdbTypKaret";
import { useMergedTypyKaret } from "@/hooks/useMergedTypyKaret";
import { FloatingZpetNahoru } from "@/components/FloatingZpetNahoru";
import { InventarKartaHledac } from "@/components/InventarKartaHledac";
import { TymHledacNapricLigami } from "@/components/TymHledacNapricLigami";
import { TymLogo, TymLogoOblast } from "@/components/TymLogo";
import {
  SOUPISKA_POZADOVANE,
  jeKompletniSoupiska,
  nactiUlozenouSoupisku,
  obnovVyberyZNactenych,
  pocetRadkuSoupisky,
  smazUlozenouSoupisku,
  ulozSoupiskuOpt,
  type UlozenaSoupiskaOptV1,
} from "@/lib/optimalizatorSoupiskaStorage";

const labelClass = "mb-1.5 block text-xs font-medium text-[var(--hut-muted)]";

const inputClass =
  "box-border min-h-11 w-full max-w-full rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] px-3 py-2.5 text-base text-white tabular-nums outline-none transition-[border-color,box-shadow] focus:border-[var(--hut-focus)]/70 focus:ring-2 focus:ring-[var(--hut-focus-ring)] sm:max-w-[10rem] sm:min-h-0 sm:py-2 sm:text-sm";

const btnFiltrClass =
  "touch-manipulation rounded-full border px-3 py-2 text-xs font-semibold tracking-wide transition-colors sm:py-1.5";

/** Stejná velikost jako `TypKartyMiniLogo` velikost „kombinace“ (11×11, rounded-lg). */
const PARAM_SYMBOL_BOX =
  "flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]";

/** Logo týmu ve stejném čtverci jako ostatní symboly (vhodné pro `TymLogo` s `fill`). */
const PARAM_SYMBOL_BOX_TYM =
  "grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] p-1";

const TYP_BONUSU_FILTR: { id: TypBonusuKombinace | "vse"; label: string; title: string }[] = [
  { id: "vse", label: "Vše", title: "Všechny typy bonusu" },
  { id: "PLAT", label: "PLAT", title: "Bonus k platu (mil. $)" },
  { id: "CLK", label: "CLK", title: "Chemistry / CLK" },
  { id: "BS", label: "BS", title: "Body synergie (BS)" },
];

type SekceVysledkuQuick = "vse" | "utok" | "obrana" | "golmani";

const SEKCE_QUICK_FILTR: { id: SekceVysledkuQuick; label: string; title: string }[] = [
  { id: "vse", label: "Vše", title: "Útok, obrana i brankáři" },
  { id: "utok", label: "Útok (LK · C · PK)", title: "Jen seznam útočných formací" },
  { id: "obrana", label: "Obrana (LO · PO)", title: "Jen seznam obranných dvojic" },
  { id: "golmani", label: "Brankáři (G · G)", title: "Jen seznam brankářských dvojic" },
];

type SnapshotFiltryOptimalizatoru = {
  minOvrStr: string;
  maxOvrStr: string;
  /** Prázdné = bez limitu; jinak max. součet platů ve formaci (mil. v textu). */
  maxRozpocetMilStr: string;
  /** Prázdné = všichni; jinak `HutCard.id` — jen formace obsahující tuto kartu z inventáře. */
  hracKartaId: string;
  typBonusuFiltr: TypBonusuKombinace | "vse";
  /** Týmy z požadavku kapitánské souhry — ve formaci musí být každý zastoupen. */
  kapitanskaTymy: TymFiltrKapitanskaSouhra[];
};

function stejneTymyFiltryKapitanskaSouhra(
  a: readonly TymFiltrKapitanskaSouhra[],
  b: readonly TymFiltrKapitanskaSouhra[],
): boolean {
  if (a.length !== b.length) return false;
  const ka = [...a].map(klicTymFiltruKapitanskaSouhra).sort().join("\0");
  const kb = [...b].map(klicTymFiltruKapitanskaSouhra).sort().join("\0");
  return ka === kb;
}

const btnHledatClass =
  "min-h-12 touch-manipulation rounded-full border border-[var(--hut-lime)]/55 bg-[var(--hut-lime)]/15 px-6 py-3 text-sm font-semibold text-[var(--hut-lime)] shadow-sm transition-colors hover:bg-[var(--hut-lime)]/25 disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-0 sm:py-2.5";

function filtrujVysledkyPodleTypuBonusu<T extends { kombinace: RadekBonusKombinaceUi }>(
  radky: readonly T[],
  typ: TypBonusuKombinace | "vse",
): T[] {
  if (typ === "vse") return [...radky];
  return radky.filter((x) => x.kombinace.bonusTyp === typ);
}

/** Sestupně = nejvyšší první (OVR součet nebo hodnota bonusu podle režimu). */
type SmerRazeniHodnotyBonusu = "sestupne" | "vzestupne";

/** Výchozí řazení = součet OVR hráčů ve formaci; volitelně jen podle čísla u bonusu. */
type TypRazeniVysledku = "ovr_soucet" | "bonus_hodnota";

function hodnotaBonusuCiselne(r: RadekBonusKombinaceUi): number {
  const h = r.bonusHodnota;
  if (h == null || !Number.isFinite(h)) return Number.NaN;
  return h;
}

function soucetOvrUtocnaFormace(v: UtocnaFormaceVysledek): number {
  return v.lk.ovr + v.c.ovr + v.pk.ovr;
}

function soucetOvrDvojice(v: DvojiceVysledek): number {
  return v.a.ovr + v.b.ovr;
}

function seraditUtocneVysledky(
  radky: readonly UtocnaFormaceVysledek[],
  typ: TypRazeniVysledku,
  smer: SmerRazeniHodnotyBonusu,
): UtocnaFormaceVysledek[] {
  const sMetadaty = radky.map((row, puvodniIndex) => ({ row, puvodniIndex }));
  sMetadaty.sort((a, b) => {
    if (typ === "ovr_soucet") {
      const oa = soucetOvrUtocnaFormace(a.row);
      const ob = soucetOvrUtocnaFormace(b.row);
      if (oa !== ob) return smer === "sestupne" ? ob - oa : oa - ob;
      const ba = hodnotaBonusuCiselne(a.row.kombinace);
      const bb = hodnotaBonusuCiselne(b.row.kombinace);
      const na = Number.isNaN(ba);
      const nb = Number.isNaN(bb);
      if (!na && !nb && ba !== bb) {
        return smer === "sestupne" ? bb - ba : ba - bb;
      }
      if (na !== nb) return na ? 1 : -1;
      return a.puvodniIndex - b.puvodniIndex;
    }
    const va = hodnotaBonusuCiselne(a.row.kombinace);
    const vb = hodnotaBonusuCiselne(b.row.kombinace);
    const na = Number.isNaN(va);
    const nb = Number.isNaN(vb);
    if (na && nb) return a.puvodniIndex - b.puvodniIndex;
    if (na) return 1;
    if (nb) return -1;
    const rozdil = va - vb;
    if (rozdil !== 0) return smer === "sestupne" ? -rozdil : rozdil;
    const oa = soucetOvrUtocnaFormace(a.row);
    const ob = soucetOvrUtocnaFormace(b.row);
    if (oa !== ob) return smer === "sestupne" ? ob - oa : oa - ob;
    return a.puvodniIndex - b.puvodniIndex;
  });
  return sMetadaty.map((x) => x.row);
}

function seraditDvojiceVysledky(
  radky: readonly DvojiceVysledek[],
  typ: TypRazeniVysledku,
  smer: SmerRazeniHodnotyBonusu,
): DvojiceVysledek[] {
  const sMetadaty = radky.map((row, puvodniIndex) => ({ row, puvodniIndex }));
  sMetadaty.sort((a, b) => {
    if (typ === "ovr_soucet") {
      const oa = soucetOvrDvojice(a.row);
      const ob = soucetOvrDvojice(b.row);
      if (oa !== ob) return smer === "sestupne" ? ob - oa : oa - ob;
      const ba = hodnotaBonusuCiselne(a.row.kombinace);
      const bb = hodnotaBonusuCiselne(b.row.kombinace);
      const na = Number.isNaN(ba);
      const nb = Number.isNaN(bb);
      if (!na && !nb && ba !== bb) {
        return smer === "sestupne" ? bb - ba : ba - bb;
      }
      if (na !== nb) return na ? 1 : -1;
      return a.puvodniIndex - b.puvodniIndex;
    }
    const va = hodnotaBonusuCiselne(a.row.kombinace);
    const vb = hodnotaBonusuCiselne(b.row.kombinace);
    const na = Number.isNaN(va);
    const nb = Number.isNaN(vb);
    if (na && nb) return a.puvodniIndex - b.puvodniIndex;
    if (na) return 1;
    if (nb) return -1;
    const rozdil = va - vb;
    if (rozdil !== 0) return smer === "sestupne" ? -rozdil : rozdil;
    const oa = soucetOvrDvojice(a.row);
    const ob = soucetOvrDvojice(b.row);
    if (oa !== ob) return smer === "sestupne" ? ob - oa : oa - ob;
    return a.puvodniIndex - b.puvodniIndex;
  });
  return sMetadaty.map((x) => x.row);
}

function klicUtocnaFormace(v: UtocnaFormaceVysledek): string {
  return `${klicLogickeKombinace(v.kombinace)}|${v.lk.id}|${v.c.id}|${v.pk.id}`;
}

/**
 * Jednoznačný klíč jednoho řádku výsledku (logická kombinace + pořadí hráčů ve slotech a → b).
 * U obrany se záměnou LO/PO rozliší prohozené sloty; pro překryv bonusů dál používej `klicHracuDvojiceIde`.
 */
function klicRadkuDvojice(v: DvojiceVysledek): string {
  return `${klicLogickeKombinace(v.kombinace)}|${v.a.id}|${v.b.id}`;
}

/** Klíč trojice hráčů (LK/C/PK) — pro detekci překryvu typů bonusů. */
function klicHracuUtokTrojice(v: UtocnaFormaceVysledek): string {
  return [v.lk.id, v.c.id, v.pk.id]
    .slice()
    .sort()
    .join("|");
}

/** Klíč dvojice hráčů (bez kombinace) — pro překryv bonusů u obrany / brankářů. */
function klicHracuDvojiceIde(v: DvojiceVysledek): string {
  return [v.a.id, v.b.id]
    .slice()
    .sort()
    .join("|");
}

function stejnaDvojiceHracuAKombinace(a: DvojiceVysledek, b: DvojiceVysledek): boolean {
  return (
    klicLogickeKombinace(a.kombinace) === klicLogickeKombinace(b.kombinace) &&
    klicHracuDvojiceIde(a) === klicHracuDvojiceIde(b)
  );
}

/** Pro danou sestavu hráčů: typ bonusu → hodnota z DB (při více řádcích stejného typu bere maximum). */
type MapaBonusuNaSestavu = Map<string, Map<TypBonusuKombinace, number>>;

function pridejBonusDoMapySestavy(
  m: MapaBonusuNaSestavu,
  klic: string,
  typ: TypBonusuKombinace,
  hodnota: number | null | undefined,
): void {
  const h = hodnota != null && Number.isFinite(hodnota) ? hodnota : null;
  if (h === null) return;
  let inner = m.get(klic);
  if (!inner) {
    inner = new Map();
    m.set(klic, inner);
  }
  const prev = inner.get(typ);
  inner.set(typ, prev == null || !Number.isFinite(prev) ? h : Math.max(prev, h));
}

function mapaTypuBonusuNaSestavuUtok(radky: readonly UtocnaFormaceVysledek[]): MapaBonusuNaSestavu {
  const m: MapaBonusuNaSestavu = new Map();
  for (const v of radky) {
    pridejBonusDoMapySestavy(m, klicHracuUtokTrojice(v), v.kombinace.bonusTyp, v.kombinace.bonusHodnota);
  }
  return m;
}

function mapaTypuBonusuNaSestavuDvojice(radky: readonly DvojiceVysledek[]): MapaBonusuNaSestavu {
  const m: MapaBonusuNaSestavu = new Map();
  for (const v of radky) {
    pridejBonusDoMapySestavy(m, klicHracuDvojiceIde(v), v.kombinace.bonusTyp, v.kombinace.bonusHodnota);
  }
  return m;
}

function filtrujPodlePrekryvuTypuBonusu<T extends { kombinace: RadekBonusKombinaceUi }>(
  radky: readonly T[],
  mapaSestava: MapaBonusuNaSestavu,
  klicSestavy: (v: T) => string,
  filtr: "vse" | "jen-jeden" | string,
): T[] {
  if (filtr === "vse") return [...radky];
  if (filtr === "jen-jeden") {
    return radky.filter((v) => {
      const s = mapaSestava.get(klicSestavy(v));
      return s !== undefined && s.size === 1;
    });
  }
  const poz = filtr.split("+").filter(Boolean) as TypBonusuKombinace[];
  if (poz.length < 2) return [...radky];
  return radky.filter((v) => {
    const s = mapaSestava.get(klicSestavy(v));
    if (!s) return false;
    return poz.every((t) => s.has(t));
  });
}

function klicePrekryvuZMapy(mapa: MapaBonusuNaSestavu): string[] {
  const out = new Set<string>();
  for (const s of mapa.values()) {
    if (s.size < 2) continue;
    out.add(TYPY_BONUSU_KOMBINACE.filter((t) => s.has(t)).join("+"));
  }
  return [...out].sort((a, b) => a.localeCompare(b));
}

type DalsiBonusPrekryv = { typ: TypBonusuKombinace; hodnota: number };

function formatBonusHodnotaProPrekryv(typ: TypBonusuKombinace, hodnota: number): string {
  return formatujBonusVRadkuNahled({
    ...novyRadekBonusu(),
    bonusTyp: typ,
    bonusHodnota: hodnota,
  });
}

function dalsiBonusyPrekryvuProRadek(
  rowTyp: TypBonusuKombinace,
  inner: ReadonlyMap<TypBonusuKombinace, number> | undefined,
): DalsiBonusPrekryv[] {
  if (!inner || inner.size < 2) return [];
  return TYPY_BONUSU_KOMBINACE.filter((t) => inner.has(t) && t !== rowTyp).map((t) => ({
    typ: t,
    hodnota: inner.get(t) as number,
  }));
}

function maUtokSpolecnehoHrace(
  v: UtocnaFormaceVysledek,
  zakazaneId: ReadonlySet<string>,
): boolean {
  return zakazaneId.has(v.lk.id) || zakazaneId.has(v.c.id) || zakazaneId.has(v.pk.id);
}

function maDvojiceSpolecnehoHrace(
  v: DvojiceVysledek,
  zakazaneId: ReadonlySet<string>,
): boolean {
  return zakazaneId.has(v.a.id) || zakazaneId.has(v.b.id);
}

/** Max. připnutých řádků na celou soupisku (všechny typy bonusu dohromady). */
const MAX_VYBER_UTOK = 4;
const MAX_VYBER_OBRANA = 3;
const MAX_VYBER_GOLMAN = 1;

function prazdneVyberyPodleTypu(): Record<TypBonusuKombinace, string[]> {
  return { PLAT: [], CLK: [], BS: [] };
}

function pocetPripnutych(vybery: Record<TypBonusuKombinace, string[]>): number {
  return TYPY_BONUSU_KOMBINACE.reduce((n, t) => n + vybery[t].length, 0);
}

function zakazaneIdZUtokKlicu(
  mapa: ReadonlyMap<string, UtocnaFormaceVysledek>,
  vybery: Record<TypBonusuKombinace, string[]>,
): Set<string> {
  const ids = new Set<string>();
  for (const typ of TYPY_BONUSU_KOMBINACE) {
    for (const klic of vybery[typ]) {
      const v = mapa.get(klic);
      if (v) {
        ids.add(v.lk.id);
        ids.add(v.c.id);
        ids.add(v.pk.id);
      }
    }
  }
  return ids;
}

function zakazaneIdZDvojicKlicu(
  mapa: ReadonlyMap<string, DvojiceVysledek>,
  vybery: Record<TypBonusuKombinace, string[]>,
): Set<string> {
  const ids = new Set<string>();
  for (const typ of TYPY_BONUSU_KOMBINACE) {
    for (const klic of vybery[typ]) {
      const v = mapa.get(klic);
      if (v) {
        ids.add(v.a.id);
        ids.add(v.b.id);
      }
    }
  }
  return ids;
}

function soucetPlatuKaret(karty: readonly HutCard[]): number {
  let s = 0;
  for (const k of karty) {
    const p = k.plat;
    if (typeof p === "number" && Number.isFinite(p)) s += p;
  }
  return s;
}

function parseMaxRozpocetVolitelne(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  return parsePlatVstupVMilionech(raw);
}

function filtrujUtokPodleMaxRozpoctu(
  radky: readonly UtocnaFormaceVysledek[],
  maxPlatAbsolutni: number | null,
): UtocnaFormaceVysledek[] {
  if (maxPlatAbsolutni === null) return [...radky];
  return radky.filter((v) => soucetPlatuKaret([v.lk, v.c, v.pk]) <= maxPlatAbsolutni);
}

function filtrujDvojicePodleMaxRozpoctu(
  radky: readonly DvojiceVysledek[],
  maxPlatAbsolutni: number | null,
): DvojiceVysledek[] {
  if (maxPlatAbsolutni === null) return [...radky];
  return radky.filter((v) => soucetPlatuKaret([v.a, v.b]) <= maxPlatAbsolutni);
}

function filtrujUtokPodleHrace(
  radky: readonly UtocnaFormaceVysledek[],
  kartaId: string | null,
): UtocnaFormaceVysledek[] {
  if (!kartaId) return [...radky];
  return radky.filter(
    (v) => v.lk.id === kartaId || v.c.id === kartaId || v.pk.id === kartaId,
  );
}

function filtrujDvojicePodleHrace(
  radky: readonly DvojiceVysledek[],
  kartaId: string | null,
): DvojiceVysledek[] {
  if (!kartaId) return [...radky];
  return radky.filter((v) => v.a.id === kartaId || v.b.id === kartaId);
}

function popisekKartyProVyber(k: HutCard): string {
  return `${k.jmeno} · ${k.ovr} OVR · ${HUT_POZICE_ZKRATKA[k.pozice]} · ${k.tym}`;
}

function ParamIkona({
  p,
  narodnostiVolby,
}: {
  p: BonusKombinaceParametr;
  narodnostiVolby: ReturnType<typeof vsechnyNarodnostiCS>;
}) {
  switch (p.typ) {
    case "narodnost": {
      const label =
        narodnostiVolby.find((v) => v.code === p.narodnostKod)?.label ?? p.narodnostKod;
      return (
        <span className={PARAM_SYMBOL_BOX} title={label}>
          <span className="text-2xl leading-none" aria-hidden>
            {vlajkaZeme(p.narodnostKod)}
          </span>
        </span>
      );
    }
    case "tym":
      return (
        <span className={PARAM_SYMBOL_BOX_TYM} title={p.tym}>
          <TymLogo
            url={urlLogaTymu(p.tym, p.liga)}
            nazevTymu={p.tym}
            fill
            className="max-h-full max-w-full min-h-0 min-w-0 object-contain"
          />
        </span>
      );
    case "typ_karty":
      return <TypKartyMiniLogo ulozeno={p.typKarty} velikost="kombinace" />;
  }
}

function NahledKombinace({
  r,
  parametryPocet,
  narodnostiVolby,
}: {
  r: RadekBonusKombinaceUi;
  parametryPocet: 2 | 3;
  narodnostiVolby: ReturnType<typeof vsechnyNarodnostiCS>;
}) {
  const params =
    parametryPocet === 2 ? [r.param1, r.param2] : [r.param1, r.param2, r.param3];
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[var(--hut-muted)]">
      {params.map((p, i) => (
        <span key={i} className="contents">
          {i > 0 ? <span aria-hidden>+</span> : null}
          <ParamIkona p={p} narodnostiVolby={narodnostiVolby} />
        </span>
      ))}
      <span aria-hidden>=</span>
      <span className="text-xs font-semibold text-white">{formatujBonusVRadkuNahled(r)}</span>
    </div>
  );
}

function HlavickaVysledkuKombinace({
  r,
  parametryPocet,
  narodnostiVolby,
  celkovyPlat,
}: {
  r: RadekBonusKombinaceUi;
  parametryPocet: 2 | 3;
  narodnostiVolby: ReturnType<typeof vsechnyNarodnostiCS>;
  celkovyPlat: number;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <NahledKombinace r={r} parametryPocet={parametryPocet} narodnostiVolby={narodnostiVolby} />
      </div>
      <div
        className="shrink-0 text-left sm:text-right"
        title="Součet polí plat ze všech karet v této sestavě"
      >
        <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--hut-muted)]">
          Plat celkem
        </div>
        <div className="text-sm font-semibold tabular-nums text-white">{formatovatPlatVMil(celkovyPlat)}</div>
      </div>
    </div>
  );
}

function BunkaHrace({
  k,
  role,
  narodnostiVolby,
  symbolParam,
}: {
  k: HutCard;
  role: Pozice | "G1" | "G2";
  narodnostiVolby: ReturnType<typeof vsechnyNarodnostiCS>;
  /** Který symbol z kombinace tato karta pokrývá (podle zvoleného pořadí přiřazení). */
  symbolParam?: BonusKombinaceParametr;
}) {
  const z = HUT_POZICE_ZKRATKA[k.pozice];
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col justify-center rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] px-2 py-2">
      <div className="flex items-center gap-2">
        {symbolParam ? (
          <div className="shrink-0" title="Splněný symbol z kombinace">
            <ParamIkona p={symbolParam} narodnostiVolby={narodnostiVolby} />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 text-[10px] text-[var(--hut-muted)]">
            <span className="font-mono font-semibold text-[var(--hut-lime)]">
              {role === "G1" || role === "G2" ? role : z}
            </span>
            <span className="tabular-nums text-zinc-300">OVR {k.ovr}</span>
          </div>
          <p className="truncate text-xs font-medium text-white">{k.jmeno}</p>
        </div>
      </div>
    </div>
  );
}

const btnVyberFiltrClass =
  "touch-manipulation rounded-lg border border-[var(--hut-lime)]/45 bg-[var(--hut-lime)]/10 px-3 py-2 text-xs font-semibold text-[var(--hut-lime)] transition-colors hover:border-[var(--hut-lime)]/70 hover:bg-[var(--hut-lime)]/15";

const btnZrusitVyberClass =
  "touch-manipulation rounded-lg border border-[var(--hut-border)] px-3 py-1.5 text-xs font-medium text-[var(--hut-muted)] transition-colors hover:border-zinc-500 hover:text-zinc-200";

function UtocnaFormaceObsah({
  v,
  narodnostiVolby,
  zobrazitTlacitkoVyber,
  onVybratProFiltrHrace,
  dalsiBonusyPrekryvu,
}: {
  v: UtocnaFormaceVysledek;
  narodnostiVolby: ReturnType<typeof vsechnyNarodnostiCS>;
  zobrazitTlacitkoVyber: boolean;
  onVybratProFiltrHrace: () => void;
  /** Jiné bonusy (PLAT/CLK/BS + hodnota z DB), které u téže trojice hráčů sedí na jiném řádku kombinace. */
  dalsiBonusyPrekryvu?: DalsiBonusPrekryv[];
}) {
  const sym = prirazeniSymboluUtok(v.lk, v.c, v.pk, v.kombinace, narodnostiVolby);
  const celkovyPlat = soucetPlatuKaret([v.lk, v.c, v.pk]);
  return (
    <>
      <HlavickaVysledkuKombinace
        r={v.kombinace}
        parametryPocet={3}
        narodnostiVolby={narodnostiVolby}
        celkovyPlat={celkovyPlat}
      />
      {dalsiBonusyPrekryvu?.length ? (
        <p
          className="mt-2 rounded-md border border-amber-500/35 bg-amber-950/40 px-2.5 py-2 text-[11px] leading-snug text-amber-100/95"
          role="status"
        >
          <span className="font-semibold text-amber-50">Překryv bonusů:</span> stejná trojice hráčů splňuje v
          databázi na jiných řádcích kombinace také{" "}
          {dalsiBonusyPrekryvu.map((x, i) => (
            <span key={x.typ}>
              {i > 0 ? ", " : ""}
              <span className="font-mono font-semibold text-amber-200">{x.typ}</span>{" "}
              <span className="tabular-nums text-amber-100/90">
                ({formatBonusHodnotaProPrekryv(x.typ, x.hodnota)})
              </span>
            </span>
          ))}
          {" "}
          — jiný řádek kombinace; ve hře můžeš získat víc bonusů najednou.
        </p>
      ) : null}
      {zobrazitTlacitkoVyber ? (
        <div className="mt-3">
          <button type="button" className={btnVyberFiltrClass} onClick={onVybratProFiltrHrace}>
            Přidat do soupisky
          </button>
          <p className="mt-1.5 text-[11px] leading-snug text-[var(--hut-muted)]">
            Připne řádek do soupisky a skryje ostatní útočné formace se stejným hráčem (LK, C nebo PK).
          </p>
        </div>
      ) : null}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-stretch">
        <BunkaHrace
          k={v.lk}
          role="LK"
          narodnostiVolby={narodnostiVolby}
          symbolParam={sym?.[0]}
        />
        <BunkaHrace
          k={v.c}
          role="C"
          narodnostiVolby={narodnostiVolby}
          symbolParam={sym?.[1]}
        />
        <BunkaHrace
          k={v.pk}
          role="PK"
          narodnostiVolby={narodnostiVolby}
          symbolParam={sym?.[2]}
        />
      </div>
    </>
  );
}

function DvojiceFormaceObsah({
  v,
  narodnostiVolby,
  zobrazitTlacitkoVyber,
  onVybratProFiltrHrace,
  roleA,
  roleB,
  filtrHint,
  dalsiBonusyPrekryvu,
}: {
  v: DvojiceVysledek;
  narodnostiVolby: ReturnType<typeof vsechnyNarodnostiCS>;
  zobrazitTlacitkoVyber: boolean;
  onVybratProFiltrHrace: () => void;
  roleA: Pozice | "G1" | "G2";
  roleB: Pozice | "G1" | "G2";
  filtrHint: string;
  dalsiBonusyPrekryvu?: DalsiBonusPrekryv[];
}) {
  const sym = prirazeniSymboluDvojice(v.a, v.b, v.kombinace, narodnostiVolby);
  const celkovyPlat = soucetPlatuKaret([v.a, v.b]);
  const parametryPocet = 2 as const;
  return (
    <>
      <HlavickaVysledkuKombinace
        r={v.kombinace}
        parametryPocet={parametryPocet}
        narodnostiVolby={narodnostiVolby}
        celkovyPlat={celkovyPlat}
      />
      {dalsiBonusyPrekryvu?.length ? (
        <p
          className="mt-2 rounded-md border border-amber-500/35 bg-amber-950/40 px-2.5 py-2 text-[11px] leading-snug text-amber-100/95"
          role="status"
        >
          <span className="font-semibold text-amber-50">Překryv bonusů:</span> stejná dvojice hráčů splňuje v
          databázi na jiných řádcích kombinace také{" "}
          {dalsiBonusyPrekryvu.map((x, i) => (
            <span key={x.typ}>
              {i > 0 ? ", " : ""}
              <span className="font-mono font-semibold text-amber-200">{x.typ}</span>{" "}
              <span className="tabular-nums text-amber-100/90">
                ({formatBonusHodnotaProPrekryv(x.typ, x.hodnota)})
              </span>
            </span>
          ))}
          {" "}
          — jiný řádek kombinace.
        </p>
      ) : null}
      {zobrazitTlacitkoVyber ? (
        <div className="mt-3">
          <button type="button" className={btnVyberFiltrClass} onClick={onVybratProFiltrHrace}>
            Přidat do soupisky
          </button>
          <p className="mt-1.5 text-[11px] leading-snug text-[var(--hut-muted)]">
            Připne řádek do soupisky a skryje ostatní {filtrHint} se stejným hráčem.
          </p>
        </div>
      ) : null}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:items-stretch">
        <BunkaHrace
          k={v.a}
          role={roleA}
          narodnostiVolby={narodnostiVolby}
          symbolParam={sym?.[0]}
        />
        <BunkaHrace
          k={v.b}
          role={roleB}
          narodnostiVolby={narodnostiVolby}
          symbolParam={sym?.[1]}
        />
      </div>
    </>
  );
}

const polozkaFormaceClass =
  "rounded-xl border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]/50 p-3 sm:p-4";

export function OptimalizatorFormaci() {
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const narodnostiVolby = useMemo(() => vsechnyNarodnostiCS(), []);
  const { typyKaret, aliasMapZBaze } = useMergedTypyKaret();
  const typKartyMetaOpts = useMemo<NajdiMetaTypuKartyOpts>(
    () => ({ radky: typyKaret, aliasMapZBaze }),
    [typyKaret, aliasMapZBaze],
  );

  const [karty, setKarty] = useState<HutCard[]>([]);
  const [loadingKarty, setLoadingKarty] = useState(false);
  const [chybaKarty, setChybaKarty] = useState<string | null>(null);

  const [utocneRadky, setUtocneRadky] = useState<RadekBonusKombinaceUi[]>([]);
  const [obranneRadky, setObranneRadky] = useState<RadekBonusKombinaceUi[]>([]);
  const [loadingKomb, setLoadingKomb] = useState(false);
  const [chybaKomb, setChybaKomb] = useState<string | null>(null);

  const [minOvrStr, setMinOvrStr] = useState("");
  const [maxOvrStr, setMaxOvrStr] = useState("");
  const [maxRozpocetMilStr, setMaxRozpocetMilStr] = useState("");
  const [hracKartaId, setHracKartaId] = useState("");
  const [kapitanskaTymy, setKapitanskaTymy] = useState<TymFiltrKapitanskaSouhra[]>([]);
  const [typBonusuFiltr, setTypBonusuFiltr] = useState<TypBonusuKombinace | "vse">("vse");
  /** Hodnoty filtrů použité u posledního výpočtu (klik „Hledat“). Dokud je null, náročné výpočty neběží. */
  const [filtryPoHledani, setFiltryPoHledani] = useState<SnapshotFiltryOptimalizatoru | null>(
    null,
  );
  /** Rychlý výběr, který blok výsledků zobrazit — méně scrollování při velkém počtu kombinací. */
  const [sekceQuickFiltr, setSekceQuickFiltr] = useState<SekceVysledkuQuick>("vse");
  /**
   * Řazení seznamů výsledků (útok / obrana / brankáři) podle čísla u uložené kombinace = platí pro PLAT, CLK i BS
   * (srovnatelná hodnota v rámci řádku).
   */
  const [smerRazeniHodnotyBonusu, setSmerRazeniHodnotyBonusu] =
    useState<SmerRazeniHodnotyBonusu>("sestupne");
  const [typRazeniVysledku, setTypRazeniVysledku] = useState<TypRazeniVysledku>("ovr_soucet");
  const [kridlaVzajemna, setKridlaVzajemna] = useState(false);
  const [loPoVzajemne, setLoPoVzajemne] = useState(false);
  /**
   * Po „Hledat“: filtrování řádků podle toho, zda stejná sestava hráčů splňuje víc typů bonusů (PLAT/CLK/BS).
   * Dynamické hodnoty „BS+PLAT“ atd. odpovídají přesné množině typů u té sestavy v plném výsledku.
   */
  const [filtrPrekryvBonusu, setFiltrPrekryvBonusu] = useState<"vse" | "jen-jeden" | string>("vse");

  /** Připnuté sestavy podle typu bonusu (PLAT/CLK/BS) — limity: útok 4, obrana 3, brankáři 1 na typ. */
  const [vyberyUtok, setVyberyUtok] = useState<Record<TypBonusuKombinace, string[]>>(
    () => prazdneVyberyPodleTypu(),
  );
  const [vyberyObrana, setVyberyObrana] = useState<Record<TypBonusuKombinace, string[]>>(
    () => prazdneVyberyPodleTypu(),
  );
  const [vyberyGolmani, setVyberyGolmani] = useState<Record<TypBonusuKombinace, string[]>>(
    () => prazdneVyberyPodleTypu(),
  );
  const [ulozenaSoupiskaMeta, setUlozenaSoupiskaMeta] = useState<UlozenaSoupiskaOptV1 | null>(
    null,
  );
  const preskocitAutoUlozeniRef = useRef(false);
  /** Po prvním Hledat v této relaci načteme uloženou soupisku z prohlížeče. */
  const obnovenoPoHledatRef = useRef(false);

  const minOvr = useMemo(() => parseOvrVolitelne(minOvrStr), [minOvrStr]);
  const maxOvr = useMemo(() => parseOvrVolitelne(maxOvrStr), [maxOvrStr]);
  const maxRozpocetMil = useMemo(
    () => parseMaxRozpocetVolitelne(maxRozpocetMilStr),
    [maxRozpocetMilStr],
  );
  const chybaOvrRozsah =
    minOvr !== null && maxOvr !== null && minOvr > maxOvr
      ? "Minimální OVR nesmí být vyšší než maximální."
      : null;

  const neplatnyVstup =
    (minOvrStr.trim() !== "" && minOvr === null) ||
    (maxOvrStr.trim() !== "" && maxOvr === null) ||
    (maxRozpocetMilStr.trim() !== "" && maxRozpocetMil === null);

  const filtryOdlisneOdHledani = useMemo(() => {
    if (!filtryPoHledani) return false;
    return (
      filtryPoHledani.minOvrStr !== minOvrStr ||
      filtryPoHledani.maxOvrStr !== maxOvrStr ||
      filtryPoHledani.maxRozpocetMilStr !== maxRozpocetMilStr ||
      filtryPoHledani.hracKartaId !== hracKartaId ||
      filtryPoHledani.typBonusuFiltr !== typBonusuFiltr ||
      !stejneTymyFiltryKapitanskaSouhra(filtryPoHledani.kapitanskaTymy, kapitanskaTymy)
    );
  }, [filtryPoHledani, minOvrStr, maxOvrStr, maxRozpocetMilStr, hracKartaId, typBonusuFiltr, kapitanskaTymy]);

  useEffect(() => {
    if (!user?.id) {
      setFiltryPoHledani(null);
      setFiltrPrekryvBonusu("vse");
      setSmerRazeniHodnotyBonusu("sestupne");
      setTypRazeniVysledku("ovr_soucet");
      setKridlaVzajemna(false);
      setLoPoVzajemne(false);
      setHracKartaId("");
      setKapitanskaTymy([]);
      setUlozenaSoupiskaMeta(null);
      return;
    }
    setUlozenaSoupiskaMeta(nactiUlozenouSoupisku(user.id));
  }, [user?.id]);

  const kartyProVyberHrace = useMemo(() => {
    return karty
      .filter((k) => !k.prodano)
      .sort(
        (a, b) =>
          a.jmeno.localeCompare(b.jmeno, "cs") || b.ovr - a.ovr || a.id.localeCompare(b.id),
      );
  }, [karty]);

  useEffect(() => {
    if (!hracKartaId) return;
    if (!kartyProVyberHrace.some((k) => k.id === hracKartaId)) {
      setHracKartaId("");
    }
  }, [kartyProVyberHrace, hracKartaId]);

  useEffect(() => {
    if (!filtryPoHledani) setFiltrPrekryvBonusu("vse");
  }, [filtryPoHledani]);

  useEffect(() => {
    if (!user?.id) {
      startTransition(() => {
        setKarty([]);
        setLoadingKarty(false);
        setChybaKarty(null);
      });
      return;
    }
    let zruseno = false;
    startTransition(() => {
      setLoadingKarty(true);
      setChybaKarty(null);
    });
    nactiKartyUzivatele(supabase, user.id).then(({ data, error }) => {
      if (zruseno) return;
      startTransition(() => {
        setLoadingKarty(false);
        if (error) {
          setChybaKarty(ceskaZpravaAuthNeboDb(error.message));
          setKarty([]);
          return;
        }
        setKarty(data);
      });
    });
    return () => {
      zruseno = true;
    };
  }, [user?.id, supabase]);

  useEffect(() => {
    let zruseno = false;
    startTransition(() => {
      setLoadingKomb(true);
      setChybaKomb(null);
    });
    nactiBonusKombinaceSdilene(supabase).then(({ utocna, obranna, error }) => {
      if (zruseno) return;
      startTransition(() => {
        setLoadingKomb(false);
        if (error) {
          setChybaKomb(ceskaZpravaAuthNeboDb(error.message));
          setUtocneRadky([]);
          setObranneRadky([]);
          return;
        }
        setUtocneRadky(utocna);
        setObranneRadky(obranna);
      });
    });
    return () => {
      zruseno = true;
    };
  }, [supabase]);

  const kartyVeFiltru = useMemo(() => {
    if (!filtryPoHledani) return [];
    const min = parseOvrVolitelne(filtryPoHledani.minOvrStr);
    const max = parseOvrVolitelne(filtryPoHledani.maxOvrStr);
    const bezProdanych = karty.filter((k) => !k.prodano);
    return filtrujKartyPodleOvr(bezProdanych, min, max);
  }, [karty, filtryPoHledani]);

  const typBonusuAplikovany = filtryPoHledani?.typBonusuFiltr ?? "vse";

  const maxRozpocetAplikovany = useMemo(() => {
    if (!filtryPoHledani) return null;
    return parseMaxRozpocetVolitelne(filtryPoHledani.maxRozpocetMilStr);
  }, [filtryPoHledani]);

  const hracKartaIdAplikovany = useMemo(() => {
    const id = filtryPoHledani?.hracKartaId?.trim() ?? "";
    return id || null;
  }, [filtryPoHledani]);

  const vybranaKartaAplikovana = useMemo(() => {
    if (!hracKartaIdAplikovany) return null;
    return karty.find((k) => k.id === hracKartaIdAplikovany) ?? null;
  }, [hracKartaIdAplikovany, karty]);

  const kapitanskaTymyAplikovane = useMemo(
    () => filtryPoHledani?.kapitanskaTymy ?? [],
    [filtryPoHledani],
  );

  const pridejKapitanskyTym = useCallback((liga: Liga, tym: string) => {
    setKapitanskaTymy((prev) => {
      const klic = klicTymFiltruKapitanskaSouhra({ liga, tym });
      if (prev.some((t) => klicTymFiltruKapitanskaSouhra(t) === klic)) {
        toast.message("Tento tým už je vybraný.");
        return prev;
      }
      return [...prev, { liga, tym }];
    });
  }, []);

  const odeberKapitanskyTym = useCallback((klic: string) => {
    setKapitanskaTymy((prev) =>
      prev.filter((t) => klicTymFiltruKapitanskaSouhra(t) !== klic),
    );
  }, []);

  const vysledkyUtok = useMemo(
    () =>
      spoctiUtocneFormace(kartyVeFiltru, utocneRadky, narodnostiVolby, {
        kridlaVzajemna,
      }),
    [kartyVeFiltru, utocneRadky, narodnostiVolby, kridlaVzajemna],
  );

  const vysledkyObrana = useMemo(
    () =>
      spoctiObranneDvojice(kartyVeFiltru, obranneRadky, narodnostiVolby, {
        loPoVzajemne,
      }),
    [kartyVeFiltru, obranneRadky, narodnostiVolby, loPoVzajemne],
  );

  const vysledkyGolmani = useMemo(
    () => spoctiGolmanskeDvojice(kartyVeFiltru, obranneRadky, narodnostiVolby),
    [kartyVeFiltru, obranneRadky, narodnostiVolby],
  );

  const utokZobrazeno = useMemo(
    () => filtrujVysledkyPodleTypuBonusu(vysledkyUtok, typBonusuAplikovany),
    [vysledkyUtok, typBonusuAplikovany],
  );
  const obranaZobrazeno = useMemo(
    () => filtrujVysledkyPodleTypuBonusu(vysledkyObrana, typBonusuAplikovany),
    [vysledkyObrana, typBonusuAplikovany],
  );
  const golmaniZobrazeno = useMemo(
    () => filtrujVysledkyPodleTypuBonusu(vysledkyGolmani, typBonusuAplikovany),
    [vysledkyGolmani, typBonusuAplikovany],
  );

  const utokZobrazenoPoRozpoctu = useMemo(
    () => filtrujUtokPodleMaxRozpoctu(utokZobrazeno, maxRozpocetAplikovany),
    [utokZobrazeno, maxRozpocetAplikovany],
  );
  const obranaZobrazenoPoRozpoctu = useMemo(
    () => filtrujDvojicePodleMaxRozpoctu(obranaZobrazeno, maxRozpocetAplikovany),
    [obranaZobrazeno, maxRozpocetAplikovany],
  );
  const golmaniZobrazenoPoRozpoctu = useMemo(
    () => filtrujDvojicePodleMaxRozpoctu(golmaniZobrazeno, maxRozpocetAplikovany),
    [golmaniZobrazeno, maxRozpocetAplikovany],
  );

  const utokZobrazenoPoHracovi = useMemo(
    () => filtrujUtokPodleHrace(utokZobrazenoPoRozpoctu, hracKartaIdAplikovany),
    [utokZobrazenoPoRozpoctu, hracKartaIdAplikovany],
  );
  const obranaZobrazenoPoHracovi = useMemo(
    () => filtrujDvojicePodleHrace(obranaZobrazenoPoRozpoctu, hracKartaIdAplikovany),
    [obranaZobrazenoPoRozpoctu, hracKartaIdAplikovany],
  );
  const golmaniZobrazenoPoHracovi = useMemo(
    () => filtrujDvojicePodleHrace(golmaniZobrazenoPoRozpoctu, hracKartaIdAplikovany),
    [golmaniZobrazenoPoRozpoctu, hracKartaIdAplikovany],
  );

  const utokZobrazenoPoKapitanske = useMemo(
    () => filtrujUtokPodleTymuKapitanskaSouhra(utokZobrazenoPoHracovi, kapitanskaTymyAplikovane),
    [utokZobrazenoPoHracovi, kapitanskaTymyAplikovane],
  );
  const obranaZobrazenoPoKapitanske = useMemo(
    () =>
      filtrujDvojicePodleTymuKapitanskaSouhra(
        obranaZobrazenoPoHracovi,
        kapitanskaTymyAplikovane,
      ),
    [obranaZobrazenoPoHracovi, kapitanskaTymyAplikovane],
  );
  const golmaniZobrazenoPoKapitanske = useMemo(
    () =>
      filtrujDvojicePodleTymuKapitanskaSouhra(
        golmaniZobrazenoPoHracovi,
        kapitanskaTymyAplikovane,
      ),
    [golmaniZobrazenoPoHracovi, kapitanskaTymyAplikovane],
  );

  const mapaBonusuUtok = useMemo(
    () => mapaTypuBonusuNaSestavuUtok(vysledkyUtok),
    [vysledkyUtok],
  );
  const mapaBonusuObrana = useMemo(
    () => mapaTypuBonusuNaSestavuDvojice(vysledkyObrana),
    [vysledkyObrana],
  );
  const mapaBonusuGolmani = useMemo(
    () => mapaTypuBonusuNaSestavuDvojice(vysledkyGolmani),
    [vysledkyGolmani],
  );

  const klicePrekryvuKDispozici = useMemo(() => {
    const u = new Set<string>();
    for (const k of klicePrekryvuZMapy(mapaBonusuUtok)) u.add(k);
    for (const k of klicePrekryvuZMapy(mapaBonusuObrana)) u.add(k);
    for (const k of klicePrekryvuZMapy(mapaBonusuGolmani)) u.add(k);
    return [...u].sort((a, b) => a.localeCompare(b));
  }, [mapaBonusuUtok, mapaBonusuObrana, mapaBonusuGolmani]);

  const utokZobrazenoPoPrekryvu = useMemo(
    () =>
      filtrujPodlePrekryvuTypuBonusu(
        utokZobrazenoPoKapitanske,
        mapaBonusuUtok,
        klicHracuUtokTrojice,
        filtrPrekryvBonusu,
      ),
    [utokZobrazenoPoKapitanske, mapaBonusuUtok, filtrPrekryvBonusu],
  );
  const obranaZobrazenoPoPrekryvu = useMemo(
    () =>
      filtrujPodlePrekryvuTypuBonusu(
        obranaZobrazenoPoKapitanske,
        mapaBonusuObrana,
        klicHracuDvojiceIde,
        filtrPrekryvBonusu,
      ),
    [obranaZobrazenoPoKapitanske, mapaBonusuObrana, filtrPrekryvBonusu],
  );
  const golmaniZobrazenoPoPrekryvu = useMemo(
    () =>
      filtrujPodlePrekryvuTypuBonusu(
        golmaniZobrazenoPoKapitanske,
        mapaBonusuGolmani,
        klicHracuDvojiceIde,
        filtrPrekryvBonusu,
      ),
    [golmaniZobrazenoPoKapitanske, mapaBonusuGolmani, filtrPrekryvBonusu],
  );

  const mapaUtok = useMemo(() => {
    const m = new Map<string, UtocnaFormaceVysledek>();
    for (const x of vysledkyUtok) m.set(klicUtocnaFormace(x), x);
    return m;
  }, [vysledkyUtok]);

  const mapaObrana = useMemo(() => {
    const m = new Map<string, DvojiceVysledek>();
    for (const x of vysledkyObrana) m.set(klicRadkuDvojice(x), x);
    return m;
  }, [vysledkyObrana]);

  const mapaGolmani = useMemo(() => {
    const m = new Map<string, DvojiceVysledek>();
    for (const x of vysledkyGolmani) m.set(klicRadkuDvojice(x), x);
    return m;
  }, [vysledkyGolmani]);

  const zakazaneIdUtok = useMemo(
    () => zakazaneIdZUtokKlicu(mapaUtok, vyberyUtok),
    [mapaUtok, vyberyUtok],
  );

  const zakazaneIdObrana = useMemo(
    () => zakazaneIdZDvojicKlicu(mapaObrana, vyberyObrana),
    [mapaObrana, vyberyObrana],
  );

  const zakazaneIdGolmani = useMemo(
    () => zakazaneIdZDvojicKlicu(mapaGolmani, vyberyGolmani),
    [mapaGolmani, vyberyGolmani],
  );

  const maVybranouUtok = useMemo(
    () => TYPY_BONUSU_KOMBINACE.some((t) => vyberyUtok[t].length > 0),
    [vyberyUtok],
  );
  const maVybranouObranu = useMemo(
    () => TYPY_BONUSU_KOMBINACE.some((t) => vyberyObrana[t].length > 0),
    [vyberyObrana],
  );
  const maVybraneGolmany = useMemo(
    () => TYPY_BONUSU_KOMBINACE.some((t) => vyberyGolmani[t].length > 0),
    [vyberyGolmani],
  );

  const utokZobrazenoPoVylouceni = useMemo(() => {
    if (!zakazaneIdUtok.size) return utokZobrazenoPoPrekryvu;
    return utokZobrazenoPoPrekryvu.filter((row) => !maUtokSpolecnehoHrace(row, zakazaneIdUtok));
  }, [utokZobrazenoPoPrekryvu, zakazaneIdUtok]);

  const obranaZobrazenoPoVylouceni = useMemo(() => {
    if (!zakazaneIdObrana.size) return obranaZobrazenoPoPrekryvu;
    return obranaZobrazenoPoPrekryvu.filter((row) => !maDvojiceSpolecnehoHrace(row, zakazaneIdObrana));
  }, [obranaZobrazenoPoPrekryvu, zakazaneIdObrana]);

  const golmaniZobrazenoPoVylouceni = useMemo(() => {
    if (!zakazaneIdGolmani.size) return golmaniZobrazenoPoPrekryvu;
    return golmaniZobrazenoPoPrekryvu.filter((row) => !maDvojiceSpolecnehoHrace(row, zakazaneIdGolmani));
  }, [golmaniZobrazenoPoPrekryvu, zakazaneIdGolmani]);

  const utokZobrazenoPoVylouceniSerazeno = useMemo(
    () => seraditUtocneVysledky(utokZobrazenoPoVylouceni, typRazeniVysledku, smerRazeniHodnotyBonusu),
    [utokZobrazenoPoVylouceni, typRazeniVysledku, smerRazeniHodnotyBonusu],
  );
  const obranaZobrazenoPoVylouceniSerazeno = useMemo(
    () => seraditDvojiceVysledky(obranaZobrazenoPoVylouceni, typRazeniVysledku, smerRazeniHodnotyBonusu),
    [obranaZobrazenoPoVylouceni, typRazeniVysledku, smerRazeniHodnotyBonusu],
  );
  const golmaniZobrazenoPoVylouceniSerazeno = useMemo(
    () => seraditDvojiceVysledky(golmaniZobrazenoPoVylouceni, typRazeniVysledku, smerRazeniHodnotyBonusu),
    [golmaniZobrazenoPoVylouceni, typRazeniVysledku, smerRazeniHodnotyBonusu],
  );

  const soupiska = useMemo(() => {
    let platUtok = 0;
    let platObrana = 0;
    let platGolmani = 0;
    const hracIds = new Set<string>();

    for (const typ of TYPY_BONUSU_KOMBINACE) {
      for (const klic of vyberyUtok[typ]) {
        const v = mapaUtok.get(klic);
        if (!v) continue;
        platUtok += soucetPlatuKaret([v.lk, v.c, v.pk]);
        hracIds.add(v.lk.id);
        hracIds.add(v.c.id);
        hracIds.add(v.pk.id);
      }
      for (const klic of vyberyObrana[typ]) {
        const v = mapaObrana.get(klic);
        if (!v) continue;
        platObrana += soucetPlatuKaret([v.a, v.b]);
        hracIds.add(v.a.id);
        hracIds.add(v.b.id);
      }
      for (const klic of vyberyGolmani[typ]) {
        const v = mapaGolmani.get(klic);
        if (!v) continue;
        platGolmani += soucetPlatuKaret([v.a, v.b]);
        hracIds.add(v.a.id);
        hracIds.add(v.b.id);
      }
    }

    const pocetUtok = pocetPripnutych(vyberyUtok);
    const pocetObrana = pocetPripnutych(vyberyObrana);
    const pocetGolmani = pocetPripnutych(vyberyGolmani);
    let pocetRadku = 0;
    for (const typ of TYPY_BONUSU_KOMBINACE) {
      pocetRadku += vyberyUtok[typ].length + vyberyObrana[typ].length + vyberyGolmani[typ].length;
    }

    return {
      pocetUtok,
      pocetObrana,
      pocetGolmani,
      platUtok,
      platObrana,
      platGolmani,
      platCelkem: platUtok + platObrana + platGolmani,
      unikatniHracu: hracIds.size,
      pocetRadku,
    };
  }, [vyberyUtok, vyberyObrana, vyberyGolmani, mapaUtok, mapaObrana, mapaGolmani]);

  const kompletniSoupiska = jeKompletniSoupiska({
    utok: soupiska.pocetUtok,
    obrana: soupiska.pocetObrana,
    golmani: soupiska.pocetGolmani,
  });

  const ulozitKompletniSoupisku = useCallback(() => {
    if (!user?.id) return;
    if (!kompletniSoupiska) {
      toast.error(
        `Kompletní soupiska = ${SOUPISKA_POZADOVANE.utok} útok + ${SOUPISKA_POZADOVANE.obrana} obrana + ${SOUPISKA_POZADOVANE.golmani} brankář.`,
      );
      return;
    }
    ulozSoupiskuOpt(user.id, {
      utok: vyberyUtok,
      obrana: vyberyObrana,
      golmani: vyberyGolmani,
      platCelkem: soupiska.platCelkem,
    });
    setUlozenaSoupiskaMeta(nactiUlozenouSoupisku(user.id));
    toast.success("Kompletní soupiska uložena v tomto prohlížeči.");
  }, [
    user?.id,
    kompletniSoupiska,
    vyberyUtok,
    vyberyObrana,
    vyberyGolmani,
    soupiska.platCelkem,
  ]);

  const aplikovatUlozenouSoupisku = useCallback(
    (ulozena: UlozenaSoupiskaOptV1, options?: { toast?: boolean }) => {
      const validUtok = new Set(vysledkyUtok.map((x) => klicUtocnaFormace(x)));
      const validObrana = new Set(vysledkyObrana.map((x) => klicRadkuDvojice(x)));
      const validGolmani = new Set(vysledkyGolmani.map((x) => klicRadkuDvojice(x)));

      const u = obnovVyberyZNactenych(ulozena.utok, validUtok);
      const o = obnovVyberyZNactenych(ulozena.obrana, validObrana);
      const g = obnovVyberyZNactenych(ulozena.golmani, validGolmani);

      preskocitAutoUlozeniRef.current = true;
      setVyberyUtok(u.vybery);
      setVyberyObrana(o.vybery);
      setVyberyGolmani(g.vybery);

      if (options?.toast === false) return;

      const preskoceno = u.preskoceno + o.preskoceno + g.preskoceno;
      const nUtok = pocetPripnutych(u.vybery);
      const nObr = pocetPripnutych(o.vybery);
      const nG = pocetPripnutych(g.vybery);

      if (preskoceno > 0) {
        toast.warning(
          `${preskoceno} řádků už v aktuálních výsledcích není — načteno útok ${nUtok}, obrana ${nObr}, brankáři ${nG}.`,
        );
      } else {
        toast.success("Uložená soupiska načtena.");
      }
    },
    [vysledkyUtok, vysledkyObrana, vysledkyGolmani],
  );

  const nacistUlozenouSoupisku = useCallback(() => {
    if (!user?.id) return;
    if (!filtryPoHledani) {
      toast.error("Nejdřív spusť Hledat — načtení soupisky potřebuje aktuální výsledky.");
      return;
    }
    const ulozena = nactiUlozenouSoupisku(user.id);
    if (!ulozena) {
      toast.error("Žádná uložená soupiska.");
      return;
    }
    aplikovatUlozenouSoupisku(ulozena, { toast: true });
  }, [user?.id, filtryPoHledani, aplikovatUlozenouSoupisku]);

  const smazatUlozenouSoupisku = useCallback(() => {
    if (!user?.id) return;
    smazUlozenouSoupisku(user.id);
    setUlozenaSoupiskaMeta(null);
    preskocitAutoUlozeniRef.current = true;
    setVyberyUtok(prazdneVyberyPodleTypu());
    setVyberyObrana(prazdneVyberyPodleTypu());
    setVyberyGolmani(prazdneVyberyPodleTypu());
    toast.success("Uložená soupiska smazána.");
  }, [user?.id]);

  useEffect(() => {
    const valid = new Set(vysledkyUtok.map((x) => klicUtocnaFormace(x)));
    setVyberyUtok((prev) => {
      let changed = false;
      const next = prazdneVyberyPodleTypu();
      for (const typ of TYPY_BONUSU_KOMBINACE) {
        next[typ] = prev[typ].filter((k) => valid.has(k));
        if (next[typ].length !== prev[typ].length) changed = true;
      }
      return changed ? next : prev;
    });
  }, [vysledkyUtok]);

  useEffect(() => {
    const valid = new Set(vysledkyObrana.map((x) => klicRadkuDvojice(x)));
    setVyberyObrana((prev) => {
      let changed = false;
      const next = prazdneVyberyPodleTypu();
      for (const typ of TYPY_BONUSU_KOMBINACE) {
        next[typ] = prev[typ].filter((k) => valid.has(k));
        if (next[typ].length !== prev[typ].length) changed = true;
      }
      return changed ? next : prev;
    });
  }, [vysledkyObrana]);

  useEffect(() => {
    const valid = new Set(vysledkyGolmani.map((x) => klicRadkuDvojice(x)));
    setVyberyGolmani((prev) => {
      let changed = false;
      const next = prazdneVyberyPodleTypu();
      for (const typ of TYPY_BONUSU_KOMBINACE) {
        next[typ] = prev[typ].filter((k) => valid.has(k));
        if (next[typ].length !== prev[typ].length) changed = true;
      }
      return changed ? next : prev;
    });
  }, [vysledkyGolmani]);

  useEffect(() => {
    if (!user?.id || !filtryPoHledani || obnovenoPoHledatRef.current) return;
    if (vysledkyUtok.length === 0 && vysledkyObrana.length === 0 && vysledkyGolmani.length === 0) {
      return;
    }
    const ulozena = nactiUlozenouSoupisku(user.id);
    obnovenoPoHledatRef.current = true;
    if (!ulozena || pocetRadkuSoupisky(ulozena.utok) + pocetRadkuSoupisky(ulozena.obrana) + pocetRadkuSoupisky(ulozena.golmani) === 0) {
      return;
    }
    aplikovatUlozenouSoupisku(ulozena, { toast: false });
  }, [
    user?.id,
    filtryPoHledani,
    vysledkyUtok,
    vysledkyObrana,
    vysledkyGolmani,
    aplikovatUlozenouSoupisku,
  ]);

  useEffect(() => {
    if (!user?.id || !filtryPoHledani) return;
    if (preskocitAutoUlozeniRef.current) {
      preskocitAutoUlozeniRef.current = false;
      return;
    }
    ulozSoupiskuOpt(user.id, {
      utok: vyberyUtok,
      obrana: vyberyObrana,
      golmani: vyberyGolmani,
      platCelkem: soupiska.platCelkem,
    });
    setUlozenaSoupiskaMeta(nactiUlozenouSoupisku(user.id));
  }, [user?.id, filtryPoHledani, vyberyUtok, vyberyObrana, vyberyGolmani, soupiska.platCelkem]);

  const pridatUtok = (v: UtocnaFormaceVysledek) => {
    const klic = klicUtocnaFormace(v);
    const typ = v.kombinace.bonusTyp;
    setVyberyUtok((prev) => {
      if (prev[typ].includes(klic)) return prev;
      if (pocetPripnutych(prev) >= MAX_VYBER_UTOK) {
        toast.error(`Soupiska — útok: nejvýše ${MAX_VYBER_UTOK} připnuté sestavy celkem.`);
        return prev;
      }
      return { ...prev, [typ]: [...prev[typ], klic] };
    });
  };

  const pridatObrana = (v: DvojiceVysledek) => {
    const klic = klicRadkuDvojice(v);
    const typ = v.kombinace.bonusTyp;
    setVyberyObrana((prev) => {
      if (prev[typ].includes(klic)) return prev;
      if (
        prev[typ].some((k) => {
          const w = mapaObrana.get(k);
          return w !== undefined && stejnaDvojiceHracuAKombinace(w, v);
        })
      ) {
        return prev;
      }
      if (pocetPripnutych(prev) >= MAX_VYBER_OBRANA) {
        toast.error(`Soupiska — obrana: nejvýše ${MAX_VYBER_OBRANA} připnuté dvojice celkem.`);
        return prev;
      }
      return { ...prev, [typ]: [...prev[typ], klic] };
    });
  };

  const pridatGolmani = (v: DvojiceVysledek) => {
    const klic = klicRadkuDvojice(v);
    const typ = v.kombinace.bonusTyp;
    setVyberyGolmani((prev) => {
      if (prev[typ].includes(klic)) return prev;
      if (pocetPripnutych(prev) >= MAX_VYBER_GOLMAN) {
        toast.error(`Soupiska — brankáři: nejvýše ${MAX_VYBER_GOLMAN} připnutá dvojice.`);
        return prev;
      }
      return { ...prev, [typ]: [...prev[typ], klic] };
    });
  };

  const handleHledat = () => {
    if (chybaOvrRozsah || neplatnyVstup) {
      toast.error(
        "Zkontroluj OVR (0–99), maximální rozpočet (mil., např. 12 nebo 12,5) nebo nech pole prázdná.",
      );
      return;
    }
    if (!karty.some((k) => !k.prodano)) {
      toast.error("Žádná neprodaná karta k výpočtu.");
      return;
    }
    if (hracKartaId) {
      const k = karty.find((c) => c.id === hracKartaId && !c.prodano);
      if (!k) {
        toast.error("Vybraná karta už není v inventáři (nebo je prodaná).");
        return;
      }
      const min = parseOvrVolitelne(minOvrStr);
      const max = parseOvrVolitelne(maxOvrStr);
      if (filtrujKartyPodleOvr([k], min, max).length === 0) {
        toast.error(
          "Vybraná karta neprochází filtry OVR — uprav OVR nebo zruš výběr hráče.",
        );
        return;
      }
    }
    startTransition(() => {
      setFiltrPrekryvBonusu("vse");
      setFiltryPoHledani({
        minOvrStr,
        maxOvrStr,
        maxRozpocetMilStr,
        hracKartaId,
        typBonusuFiltr,
        kapitanskaTymy: [...kapitanskaTymy],
      });
    });
  };

  const nacitani = authLoading || loadingKarty || loadingKomb;

  const hledatDisabled =
    nacitani || !!chybaKarty || !!chybaKomb || !karty.some((k) => !k.prodano);

  const maNastaveneFiltryFormulare =
    minOvrStr.trim() !== "" ||
    maxOvrStr.trim() !== "" ||
    maxRozpocetMilStr.trim() !== "" ||
    hracKartaId !== "" ||
    kapitanskaTymy.length > 0 ||
    typBonusuFiltr !== "vse" ||
    kridlaVzajemna ||
    loPoVzajemne;

  const vymazatFiltryFormulare = useCallback(() => {
    setMinOvrStr("");
    setMaxOvrStr("");
    setMaxRozpocetMilStr("");
    setHracKartaId("");
    setKapitanskaTymy([]);
    setTypBonusuFiltr("vse");
    setKridlaVzajemna(false);
    setLoPoVzajemne(false);
  }, []);

  const zobrazitSekciUtok = sekceQuickFiltr === "vse" || sekceQuickFiltr === "utok";
  const zobrazitSekciObranu = sekceQuickFiltr === "vse" || sekceQuickFiltr === "obrana";
  const zobrazitSekciGolmany = sekceQuickFiltr === "vse" || sekceQuickFiltr === "golmani";

  const zobrazitPripnutouSekci =
    !!filtryPoHledani &&
    ((sekceQuickFiltr === "vse" && (maVybranouUtok || maVybranouObranu || maVybraneGolmany)) ||
      (sekceQuickFiltr === "utok" && maVybranouUtok) ||
      (sekceQuickFiltr === "obrana" && maVybranouObranu) ||
      (sekceQuickFiltr === "golmani" && maVybraneGolmany));

  const nastaveniBonusuJakoOdkaz = jeBonusAdmin(user?.email);

  return (
    <TypKartyMetaOptsProvider value={typKartyMetaOpts}>
    <>
    <div className="space-y-8 sm:space-y-10">
      <header>
        <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Optimalizátor formací</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--hut-muted)] sm:text-[15px]">
          Hledá kompletní sestavy podle uložených kombinací v{" "}
          {nastaveniBonusuJakoOdkaz ? (
            <Link
              href="/nastaveni-bonusu"
              className="text-[var(--hut-lime)] underline-offset-2 hover:underline"
            >
              Nastavení bonusů
            </Link>
          ) : (
            <span>Nastavení bonusů</span>
          )}
          : útok (LK + C + PK), obrana (LO + PO) a dvojice brankářů (G + G). Symboly z kombinace musí pokrýt
          všechny příslušné pozice v libovolném pořadí (LK nemusí odpovídat prvnímu uloženému parametru).
          Zobrazí se jen plné shody — žádné částečné trojice ani dvojice. Můžeš vybrat konkrétní kartu z inventáře
          (jen formace s tímto hráčem) nebo omezit sestavy maximálním součtem platů (rozpočet formace). Výsledky se výchozí řadí podle součtu OVR
          hráčů ve sestavě (útok LK + C + PK, obrana a brankáři součet dvojice); lze přepnout na řazení podle čísla
          bonusu u rovnítka. Připnutím sestav skládáš soupisku (útok max. {MAX_VYBER_UTOK}, obrana max.{" "}
          {MAX_VYBER_OBRANA}, brankáři max. {MAX_VYBER_GOLMAN}) — v panelu připnutých se sčítá plat všech řádků. Ze
          seznamu se pak skryjí všechny varianty, které
          sdílejí alespoň jednoho hráče s některou z připnutých sestav v dané sekci (sjednocení množin hráčů). Karty v
          inventáři označené jako{" "}
          <span className="text-zinc-300">Prodáno</span> se do výpočtu nezahrnují.
        </p>
      </header>

      {!user ? (
        <p className="rounded-xl border border-dashed border-[var(--hut-border)] bg-[var(--hut-surface)]/50 px-6 py-10 text-center text-sm text-[var(--hut-muted)]">
          Přihlas se pro načtení inventáře a výpočet formací.
        </p>
      ) : !loadingKarty && !chybaKarty && karty.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--hut-border)] bg-[var(--hut-surface)]/50 px-6 py-10 text-center text-sm text-[var(--hut-muted)]">
          <p>
            Nemáš žádné karty v inventáři — optimalizátor potřebuje alespoň jednu kartu z{" "}
            <Link
              href="/"
              className="font-medium text-[var(--hut-lime)] underline underline-offset-2 hover:text-[var(--hut-lime-dim)]"
            >
              Můj Inventář
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          <section className="rounded-xl border border-[var(--hut-border)] bg-[var(--hut-surface-raised)]/80 p-4 shadow-inner shadow-black/20 sm:p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--hut-muted)]">
              Filtry formací
            </h3>
            <p className="mt-1 text-xs text-[var(--hut-muted)]/90">
              OVR a rozpočet: prázdné pole = bez limitu. Rozpočet = součet platů všech hráčů v dané sestavě (útok 3
              karty, obrana / brankáři 2 karty), ve stejných milionech jako u karet v inventáři. Výběr hráče z tvého
              inventáře zobrazí jen formace, kde daná karta figuruje. U kapitánské souhry vyber týmy z požadavku na tvé
              kapitánské kartě — ve formaci musí být každý z nich zastoupen alespoň jedním hráčem (jako u aktivace
              kapitánské chemie v HUT Builderu; útok max. 3 týmy v jedné trojici, obrana / brankáři max. 2). Typ bonusu zužuje
              výsledky podle hodnoty z Nastavení bonusů. Kombinace se dopočítají až po kliknutí na{" "}
              <span className="text-zinc-300">Hledat</span> — úvodní načtení stránky tak zůstane rychlé.
            </p>
            <div
              className="mt-5 flex flex-wrap items-center gap-2"
              role="group"
              aria-label="Rychlý filtr podle typu bonusu"
            >
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--hut-muted)]">
                Typ bonusu
              </span>
              {TYP_BONUSU_FILTR.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  title={b.title}
                  onClick={() => setTypBonusuFiltr(b.id)}
                  className={[
                    btnFiltrClass,
                    typBonusuFiltr === b.id
                      ? "border-[var(--hut-focus)]/60 bg-[var(--hut-focus)]/15 text-white"
                      : "border-[var(--hut-border)] text-[var(--hut-muted)] hover:border-zinc-500 hover:text-zinc-200",
                  ].join(" ")}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-1 items-end gap-4 md:grid-cols-2 xl:grid-cols-12">
              <div className="min-w-0 md:col-span-1 xl:col-span-3">
                <p className={labelClass}>OVR</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <label htmlFor="opt-min-ovr" className="mb-1 block text-[10px] text-[var(--hut-muted)]">
                      Min.
                    </label>
                    <input
                      id="opt-min-ovr"
                      type="text"
                      inputMode="numeric"
                      placeholder="—"
                      value={minOvrStr}
                      onChange={(e) => setMinOvrStr(e.target.value)}
                      className={`${inputClass} sm:max-w-none`}
                      aria-invalid={minOvrStr.trim() !== "" && minOvr === null}
                    />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="opt-max-ovr" className="mb-1 block text-[10px] text-[var(--hut-muted)]">
                      Max.
                    </label>
                    <input
                      id="opt-max-ovr"
                      type="text"
                      inputMode="numeric"
                      placeholder="—"
                      value={maxOvrStr}
                      onChange={(e) => setMaxOvrStr(e.target.value)}
                      className={`${inputClass} sm:max-w-none`}
                      aria-invalid={maxOvrStr.trim() !== "" && maxOvr === null}
                    />
                  </div>
                </div>
              </div>
              <div className="min-w-0 md:col-span-1 xl:col-span-5">
                <label htmlFor="opt-hrac" className={labelClass}>
                  Hráč z inventáře
                </label>
                <InventarKartaHledac
                  id="opt-hrac"
                  karty={kartyProVyberHrace}
                  value={hracKartaId}
                  onChange={setHracKartaId}
                  disabled={loadingKarty || kartyProVyberHrace.length === 0}
                />
              </div>
              <div className="min-w-0 md:col-span-2 xl:col-span-4">
                <label htmlFor="opt-max-rozpocet" className={labelClass}>
                  Rozpočet (max. plat celkem, mil.)
                </label>
                <input
                  id="opt-max-rozpocet"
                  type="text"
                  inputMode="decimal"
                  placeholder="např. 12"
                  value={maxRozpocetMilStr}
                  onChange={(e) => setMaxRozpocetMilStr(e.target.value)}
                  className={`${inputClass} sm:max-w-none`}
                  aria-invalid={maxRozpocetMilStr.trim() !== "" && maxRozpocetMil === null}
                  autoComplete="off"
                />
              </div>
            </div>
            {neplatnyVstup ? (
              <p className="mt-3 text-sm text-amber-200/90" role="alert">
                OVR: celé číslo 0–99. Rozpočet: kladné číslo v milionech (např. 12 nebo 12,5). Prázdná pole = bez
                limitu.
              </p>
            ) : null}
            {chybaOvrRozsah ? (
              <p className="mt-3 text-sm text-red-200/90" role="alert">
                {chybaOvrRozsah}
              </p>
            ) : null}
            <div className="mt-5 rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]/40 p-4">
              <p className={labelClass}>Kapitánská souhra — týmy</p>
              <p className="text-xs leading-relaxed text-[var(--hut-muted)]/95">
                Na kapitánské kartě v HUT (stejně jako v{" "}
                <a
                  href="https://nhlhutbuilder.com/NHL26/builder.php"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--hut-lime)] underline-offset-2 hover:underline"
                >
                  HUT Builderu
                </a>
                ) jsou uvedené týmy, ze kterých potřebuješ hráče v celé soupisce. Zde vyber tyto týmy — zobrazí se jen
                formace, kde je v každé sestavě alespoň jeden hráč z každého zvoleného týmu.
              </p>
              {kapitanskaTymy.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {kapitanskaTymy.map((t) => {
                    const klic = klicTymFiltruKapitanskaSouhra(t);
                    return (
                      <li key={klic}>
                        <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--hut-border)] bg-[var(--hut-surface)] py-1 pl-1.5 pr-2 text-sm text-zinc-100">
                          <TymLogoOblast
                            size={28}
                            url={urlLogaTymu(t.tym, t.liga)}
                            nazevTymu={t.tym}
                          />
                          <span className="min-w-0 truncate">{t.tym}</span>
                          <span
                            className="shrink-0 rounded-md border border-[var(--hut-border)] bg-[var(--hut-bg)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--hut-muted)]"
                            title={LIGA_ZOBRAZENI[t.liga]}
                          >
                            {t.liga}
                          </span>
                          <button
                            type="button"
                            className="ml-0.5 shrink-0 rounded-full px-1.5 text-[var(--hut-muted)] transition-colors hover:bg-red-950/40 hover:text-red-300"
                            aria-label={`Odebrat ${t.tym}`}
                            onClick={() => odeberKapitanskyTym(klic)}
                          >
                            ×
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-[var(--hut-muted)]/80">
                  Zatím žádný tým — vyhledání níže (např. Penguins, Maple Leafs…).
                </p>
              )}
              <div className="mt-3 max-w-xl">
                <label htmlFor="opt-kapitanska-tym" className="mb-1 block text-[10px] text-[var(--hut-muted)]">
                  Přidat tým
                </label>
                <TymHledacNapricLigami
                  id="opt-kapitanska-tym"
                  variant="formular"
                  disabled={nacitani}
                  onVybrat={pridejKapitanskyTym}
                />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label
                htmlFor="opt-kridla-vzajemna"
                className="flex cursor-pointer items-start gap-2.5 text-xs leading-snug text-[var(--hut-muted)]"
              >
                <input
                  id="opt-kridla-vzajemna"
                  type="checkbox"
                  checked={kridlaVzajemna}
                  onChange={(e) => setKridlaVzajemna(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--hut-border)] bg-[var(--hut-bg)] accent-[var(--hut-focus)]"
                />
                <span className="min-w-0">
                  <span className="font-medium text-zinc-200">Záměna křídel (útok):</span> LK a PK vzájemně (tři různí
                  hráči, C jen pozice C).
                </span>
              </label>
              <label
                htmlFor="opt-lo-po-vzajemne"
                className="flex cursor-pointer items-start gap-2.5 text-xs leading-snug text-[var(--hut-muted)]"
              >
                <input
                  id="opt-lo-po-vzajemne"
                  type="checkbox"
                  checked={loPoVzajemne}
                  onChange={(e) => setLoPoVzajemne(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--hut-border)] bg-[var(--hut-bg)] accent-[var(--hut-focus)]"
                />
                <span className="min-w-0">
                  <span className="font-medium text-zinc-200">Záměna stran (obrana):</span> LO a PO vzájemně (dva různí
                  hráči).
                </span>
              </label>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className={btnHledatClass}
                disabled={hledatDisabled}
                onClick={handleHledat}
              >
                Hledat
              </button>
              {maNastaveneFiltryFormulare ? (
                <button
                  type="button"
                  className="touch-manipulation rounded-full border border-[var(--hut-border)] bg-transparent px-4 py-2.5 text-sm font-medium text-[var(--hut-muted)] transition-colors hover:border-zinc-500 hover:text-white disabled:opacity-45 sm:py-2"
                  disabled={nacitani}
                  onClick={vymazatFiltryFormulare}
                >
                  Vymazat filtry
                </button>
              ) : null}
              {filtryPoHledani ? (
                <button
                  type="button"
                  className="touch-manipulation rounded-full border border-[var(--hut-border)] bg-transparent px-4 py-2.5 text-sm font-medium text-[var(--hut-muted)] transition-colors hover:border-zinc-500 hover:text-white disabled:opacity-45 sm:py-2"
                  disabled={nacitani}
                  onClick={() => {
                    startTransition(() => {
                      setFiltrPrekryvBonusu("vse");
                      setSmerRazeniHodnotyBonusu("sestupne");
                      setFiltryPoHledani(null);
                      obnovenoPoHledatRef.current = false;
                    });
                  }}
                >
                  Zrušit výsledky
                </button>
              ) : null}
            </div>
            {filtryPoHledani && filtryOdlisneOdHledani ? (
              <p className="mt-3 text-sm text-amber-200/90" role="status">
                Upravil jsi filtry oproti poslednímu hledání — pro přepočet znovu klikni na <strong>Hledat</strong>.
              </p>
            ) : null}
          </section>

          {chybaKarty ? (
            <p className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200" role="alert">
              {chybaKarty}
            </p>
          ) : null}
          {chybaKomb ? (
            <p className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200" role="alert">
              Kombinace: {chybaKomb}
            </p>
          ) : null}

          {nacitani ? (
            <p className="text-sm text-[var(--hut-muted)]">Načítám karty a kombinace…</p>
          ) : null}

          {!nacitani && !filtryPoHledani && !chybaKarty && karty.length > 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--hut-border)] bg-[var(--hut-surface)]/40 px-4 py-6 text-center sm:px-6">
              <p className="text-sm leading-relaxed text-[var(--hut-muted)]">
                Nastav filtry výše (OVR, hráč, rozpočet, typ bonusu) a klikni na <strong className="text-zinc-200">Hledat</strong>. Teprve
                potom proběhne výpočet kombinací — úvodní načtení stránky je rychlejší.
              </p>
            </div>
          ) : null}

          {filtryPoHledani && !nacitani ? (
            <div className="space-y-3">
              <p className="text-xs text-[var(--hut-muted)]">
                V úvaze: {kartyVeFiltru.length} karet
                {utocneRadky.length ? ` · ${utocneRadky.length} útočných kombinací` : ""}
                {obranneRadky.length ? ` · ${obranneRadky.length} obranných kombinací` : ""}
                {hracKartaIdAplikovany && vybranaKartaAplikovana
                  ? ` · hráč ${vybranaKartaAplikovana.jmeno}: útok ${utokZobrazenoPoHracovi.length}, obrana ${obranaZobrazenoPoHracovi.length}, brankáři ${golmaniZobrazenoPoHracovi.length}`
                  : kapitanskaTymyAplikovane.length > 0
                    ? ` · kapitánská souhra (${kapitanskaTymyAplikovane.map((t) => t.tym).join(", ")}): útok ${utokZobrazenoPoKapitanske.length}, obrana ${obranaZobrazenoPoKapitanske.length}, brankáři ${golmaniZobrazenoPoKapitanske.length}`
                    : maxRozpocetAplikovany !== null
                    ? ` · max. plat ≤ ${formatovatPlatVMil(maxRozpocetAplikovany)}: útok ${utokZobrazenoPoRozpoctu.length}, obrana ${obranaZobrazenoPoRozpoctu.length}, brankáři ${golmaniZobrazenoPoRozpoctu.length}`
                    : filtryPoHledani.typBonusuFiltr !== "vse"
                      ? ` · zobrazeno jen ${filtryPoHledani.typBonusuFiltr}: útok ${utokZobrazeno.length}, obrana ${obranaZobrazeno.length}, brankáři ${golmaniZobrazeno.length}`
                      : ` · výsledků: útok ${utokZobrazeno.length}, obrana ${obranaZobrazeno.length}, brankáři ${golmaniZobrazeno.length}`}
                {maVybranouUtok || maVybranouObranu || maVybraneGolmany
                  ? ` · po výběru hráčů: útok ${utokZobrazenoPoVylouceni.length}/${utokZobrazenoPoPrekryvu.length}, obrana ${obranaZobrazenoPoVylouceni.length}/${obranaZobrazenoPoPrekryvu.length}, brankáři ${golmaniZobrazenoPoVylouceni.length}/${golmaniZobrazenoPoPrekryvu.length}`
                  : ""}
              </p>
              {vysledkyUtok.length + vysledkyObrana.length + vysledkyGolmani.length > 0 ? (
                <div
                  className="rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]/30 px-3 py-3 sm:px-4"
                  role="group"
                  aria-label="Filtr překryvu typů bonusů"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--hut-muted)]">
                    Překryv bonusů (po Hledat)
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-[var(--hut-muted)]/95">
                    Stejná sestava hráčů může splnit víc uložených kombinací s různým PLAT / CLK / BS — ve hře pak
                    „přibyde“ víc bonusů. Zde je to vidět dopředu.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      title="Všechny řádky výsledků"
                      onClick={() => setFiltrPrekryvBonusu("vse")}
                      className={[
                        btnFiltrClass,
                        filtrPrekryvBonusu === "vse"
                          ? "border-[var(--hut-focus)]/60 bg-[var(--hut-focus)]/15 text-white"
                          : "border-[var(--hut-border)] text-[var(--hut-muted)] hover:border-zinc-500 hover:text-zinc-200",
                      ].join(" ")}
                    >
                      Vše
                    </button>
                    <button
                      type="button"
                      title="Jen sestavy, kde v databázi existuje jen jeden typ bonusu pro tuto sestavu hráčů"
                      onClick={() => setFiltrPrekryvBonusu("jen-jeden")}
                      className={[
                        btnFiltrClass,
                        filtrPrekryvBonusu === "jen-jeden"
                          ? "border-[var(--hut-focus)]/60 bg-[var(--hut-focus)]/15 text-white"
                          : "border-[var(--hut-border)] text-[var(--hut-muted)] hover:border-zinc-500 hover:text-zinc-200",
                      ].join(" ")}
                    >
                      Jen 1 typ bonusu
                    </button>
                    {klicePrekryvuKDispozici.map((klic) => (
                      <button
                        key={klic}
                        type="button"
                        title={`Jen sestavy kde současně sedí ${klic.replace(/\+/g, " + ")}`}
                        onClick={() => setFiltrPrekryvBonusu(klic)}
                        className={[
                          btnFiltrClass,
                          filtrPrekryvBonusu === klic
                            ? "border-amber-400/55 bg-amber-500/15 text-amber-100"
                            : "border-[var(--hut-border)] text-[var(--hut-muted)] hover:border-zinc-500 hover:text-zinc-200",
                        ].join(" ")}
                      >
                        {klic.replace(/\+/g, " + ")}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div
                className="flex flex-wrap items-center gap-2"
                role="group"
                aria-label="Rychlý výběr zobrazené sekce výsledků"
              >
                <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--hut-muted)]">
                  Zobrazit sekci
                </span>
                {SEKCE_QUICK_FILTR.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    title={s.title}
                    onClick={() => setSekceQuickFiltr(s.id)}
                    className={[
                      btnFiltrClass,
                      sekceQuickFiltr === s.id
                        ? "border-[var(--hut-focus)]/60 bg-[var(--hut-focus)]/15 text-white"
                        : "border-[var(--hut-border)] text-[var(--hut-muted)] hover:border-zinc-500 hover:text-zinc-200",
                    ].join(" ")}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] leading-relaxed text-[var(--hut-muted)]/90">
                Zobraz jen jednu kategorii výsledků — méně scrollování při stovkách kombinací. Pro změnu filtrů použij
                znovu tlačítko Hledat v sekci nahoře.
              </p>
              <div
                className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--hut-border)]/80 pt-3"
                role="group"
                aria-label="Kritérium řazení výsledků"
              >
                <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--hut-muted)]">
                  Řadit podle
                </span>
                <button
                  type="button"
                  title="Součet OVR hráčů ve formaci (útok tři hráči, dvojice dva)"
                  onClick={() => setTypRazeniVysledku("ovr_soucet")}
                  className={[
                    btnFiltrClass,
                    typRazeniVysledku === "ovr_soucet"
                      ? "border-[var(--hut-focus)]/60 bg-[var(--hut-focus)]/15 text-white"
                      : "border-[var(--hut-border)] text-[var(--hut-muted)] hover:border-zinc-500 hover:text-zinc-200",
                  ].join(" ")}
                >
                  Součet OVR
                </button>
                <button
                  type="button"
                  title="Číslo u rovnítka u uložené kombinace (PLAT / CLK / BS)"
                  onClick={() => setTypRazeniVysledku("bonus_hodnota")}
                  className={[
                    btnFiltrClass,
                    typRazeniVysledku === "bonus_hodnota"
                      ? "border-[var(--hut-focus)]/60 bg-[var(--hut-focus)]/15 text-white"
                      : "border-[var(--hut-border)] text-[var(--hut-muted)] hover:border-zinc-500 hover:text-zinc-200",
                  ].join(" ")}
                >
                  Hodnota bonusu
                </button>
              </div>
              <div
                className="mt-2 flex flex-wrap items-center gap-2"
                role="group"
                aria-label="Směr řazení"
              >
                <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--hut-muted)]">
                  Směr
                </span>
                <button
                  type="button"
                  title={
                    typRazeniVysledku === "ovr_soucet"
                      ? "Nejvyšší součet OVR nahoře"
                      : "Nejvyšší uvedená hodnota bonusu nahoře"
                  }
                  onClick={() => setSmerRazeniHodnotyBonusu("sestupne")}
                  className={[
                    btnFiltrClass,
                    smerRazeniHodnotyBonusu === "sestupne"
                      ? "border-[var(--hut-focus)]/60 bg-[var(--hut-focus)]/15 text-white"
                      : "border-[var(--hut-border)] text-[var(--hut-muted)] hover:border-zinc-500 hover:text-zinc-200",
                  ].join(" ")}
                >
                  Nejvyšší → nejnižší
                </button>
                <button
                  type="button"
                  title={
                    typRazeniVysledku === "ovr_soucet"
                      ? "Nejnižší součet OVR nahoře"
                      : "Nejnižší hodnota bonusu nahoře"
                  }
                  onClick={() => setSmerRazeniHodnotyBonusu("vzestupne")}
                  className={[
                    btnFiltrClass,
                    smerRazeniHodnotyBonusu === "vzestupne"
                      ? "border-[var(--hut-focus)]/60 bg-[var(--hut-focus)]/15 text-white"
                      : "border-[var(--hut-border)] text-[var(--hut-muted)] hover:border-zinc-500 hover:text-zinc-200",
                  ].join(" ")}
                >
                  Nejnižší → nejvyšší
                </button>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-[var(--hut-muted)]/90">
                Platí pro všechny tři seznamy (útok, obrana, brankáři). Při shodě se použije druhé kritérium (bonus
                nebo OVR) a pak původní pořadí z výpočtu.
              </p>
            </div>
          ) : null}

          {filtryPoHledani && !nacitani && zobrazitPripnutouSekci ? (
            <section
              className="space-y-4 rounded-xl border border-[var(--hut-lime)]/40 bg-[var(--hut-surface-raised)]/90 p-4 shadow-inner shadow-black/15 sm:p-5"
              aria-label="Soupiska — připnuté sestavy"
            >
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--hut-lime)]">
                  Soupiska (připnuté sestavy)
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[var(--hut-muted)]">
                  Skládáš soupisku: útok {SOUPISKA_POZADOVANE.utok}, obrana {SOUPISKA_POZADOVANE.obrana}, brankáři{" "}
                  {SOUPISKA_POZADOVANE.golmani} řádků. Připnuté řádky se automaticky ukládají v tomto prohlížeči a po
                  Hledat se obnoví. Plat se sčítá po řádcích.
                </p>
                {ulozenaSoupiskaMeta ? (
                  <p className="mt-2 text-xs text-[var(--hut-lime)]/95">
                    Uloženo{" "}
                    {new Date(ulozenaSoupiskaMeta.ulozeno).toLocaleString("cs-CZ", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}{" "}
                    · plat {formatovatPlatVMil(ulozenaSoupiskaMeta.platCelkem)}
                  </p>
                ) : null}
              </div>

              {maVybranouUtok && zobrazitSekciUtok ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-white">
                      Útočná formace (LK · C · PK) — {soupiska.pocetUtok}/{MAX_VYBER_UTOK}
                    </p>
                    <button
                      type="button"
                      className={btnZrusitVyberClass}
                      onClick={() => setVyberyUtok(prazdneVyberyPodleTypu())}
                    >
                      Zrušit vše (útok)
                    </button>
                  </div>
                  {TYPY_BONUSU_KOMBINACE.map((typ) =>
                    vyberyUtok[typ].length === 0 ? null : (
                      <div key={typ} className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--hut-lime)]">
                          Bonus {typ}
                          {vyberyUtok[typ].length > 1 ? ` · ${vyberyUtok[typ].length} řádky` : null}
                        </p>
                        {vyberyUtok[typ].map((klic) => {
                          const v = mapaUtok.get(klic);
                          if (!v) return null;
                          const dalsiPin = dalsiBonusyPrekryvuProRadek(
                            v.kombinace.bonusTyp,
                            mapaBonusuUtok.get(klicHracuUtokTrojice(v)),
                          );
                          return (
                            <article
                              key={klic}
                              className={[
                                polozkaFormaceClass,
                                "border-[var(--hut-focus)]/30 bg-[var(--hut-bg-elevated)]/70",
                                dalsiPin.length ? "border-l-2 border-amber-400/45" : "",
                              ].join(" ")}
                            >
                              <div className="mb-3 flex flex-wrap items-start justify-end gap-2">
                                <button
                                  type="button"
                                  className={btnZrusitVyberClass}
                                  onClick={() =>
                                    setVyberyUtok((p) => ({
                                      ...p,
                                      [typ]: p[typ].filter((k) => k !== klic),
                                    }))
                                  }
                                >
                                  Odebrat
                                </button>
                              </div>
                              <UtocnaFormaceObsah
                                v={v}
                                narodnostiVolby={narodnostiVolby}
                                zobrazitTlacitkoVyber={false}
                                onVybratProFiltrHrace={() => {}}
                                dalsiBonusyPrekryvu={
                                  dalsiPin.length ? dalsiPin : undefined
                                }
                              />
                            </article>
                          );
                        })}
                      </div>
                    ),
                  )}
                </div>
              ) : null}

              {maVybranouObranu && zobrazitSekciObranu ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-white">
                      Obranná dvojice (LO · PO) — {soupiska.pocetObrana}/{MAX_VYBER_OBRANA}
                    </p>
                    <button
                      type="button"
                      className={btnZrusitVyberClass}
                      onClick={() => setVyberyObrana(prazdneVyberyPodleTypu())}
                    >
                      Zrušit vše (obrana)
                    </button>
                  </div>
                  {TYPY_BONUSU_KOMBINACE.map((typ) =>
                    vyberyObrana[typ].length === 0 ? null : (
                      <div key={typ} className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--hut-lime)]">
                          Bonus {typ}
                          {vyberyObrana[typ].length > 1 ? ` · ${vyberyObrana[typ].length} řádky` : null}
                        </p>
                        {vyberyObrana[typ].map((klic) => {
                          const v = mapaObrana.get(klic);
                          if (!v) return null;
                          const dalsiPin = dalsiBonusyPrekryvuProRadek(
                            v.kombinace.bonusTyp,
                            mapaBonusuObrana.get(klicHracuDvojiceIde(v)),
                          );
                          return (
                            <article
                              key={klic}
                              className={[
                                polozkaFormaceClass,
                                "border-[var(--hut-focus)]/30 bg-[var(--hut-bg-elevated)]/70",
                                dalsiPin.length ? "border-l-2 border-amber-400/45" : "",
                              ].join(" ")}
                            >
                              <div className="mb-3 flex flex-wrap items-start justify-end gap-2">
                                <button
                                  type="button"
                                  className={btnZrusitVyberClass}
                                  onClick={() =>
                                    setVyberyObrana((p) => ({
                                      ...p,
                                      [typ]: p[typ].filter((k) => k !== klic),
                                    }))
                                  }
                                >
                                  Odebrat
                                </button>
                              </div>
                              <DvojiceFormaceObsah
                                v={v}
                                narodnostiVolby={narodnostiVolby}
                                zobrazitTlacitkoVyber={false}
                                onVybratProFiltrHrace={() => {}}
                                roleA="LO"
                                roleB="PO"
                                filtrHint="obranné dvojice"
                                dalsiBonusyPrekryvu={
                                  dalsiPin.length ? dalsiPin : undefined
                                }
                              />
                            </article>
                          );
                        })}
                      </div>
                    ),
                  )}
                </div>
              ) : null}

              {maVybraneGolmany && zobrazitSekciGolmany ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-white">
                      Brankářská dvojice (G · G) — {soupiska.pocetGolmani}/{MAX_VYBER_GOLMAN}
                    </p>
                    <button
                      type="button"
                      className={btnZrusitVyberClass}
                      onClick={() => setVyberyGolmani(prazdneVyberyPodleTypu())}
                    >
                      Zrušit vše (brankáři)
                    </button>
                  </div>
                  {TYPY_BONUSU_KOMBINACE.map((typ) =>
                    vyberyGolmani[typ].length === 0 ? null : (
                      <div key={typ} className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--hut-lime)]">
                          Bonus {typ}
                        </p>
                        {vyberyGolmani[typ].map((klic) => {
                          const v = mapaGolmani.get(klic);
                          if (!v) return null;
                          const dalsiPin = dalsiBonusyPrekryvuProRadek(
                            v.kombinace.bonusTyp,
                            mapaBonusuGolmani.get(klicHracuDvojiceIde(v)),
                          );
                          return (
                            <article
                              key={klic}
                              className={[
                                polozkaFormaceClass,
                                "border-[var(--hut-focus)]/30 bg-[var(--hut-bg-elevated)]/70",
                                dalsiPin.length ? "border-l-2 border-amber-400/45" : "",
                              ].join(" ")}
                            >
                              <div className="mb-3 flex flex-wrap items-start justify-end gap-2">
                                <button
                                  type="button"
                                  className={btnZrusitVyberClass}
                                  onClick={() =>
                                    setVyberyGolmani((p) => ({
                                      ...p,
                                      [typ]: p[typ].filter((k) => k !== klic),
                                    }))
                                  }
                                >
                                  Odebrat
                                </button>
                              </div>
                              <DvojiceFormaceObsah
                                v={v}
                                narodnostiVolby={narodnostiVolby}
                                zobrazitTlacitkoVyber={false}
                                onVybratProFiltrHrace={() => {}}
                                roleA="G1"
                                roleB="G2"
                                filtrHint="brankářské dvojice"
                                dalsiBonusyPrekryvu={
                                  dalsiPin.length ? dalsiPin : undefined
                                }
                              />
                            </article>
                          );
                        })}
                      </div>
                    ),
                  )}
                </div>
              ) : null}

              {filtryPoHledani ? (
                <div className="flex flex-wrap items-center gap-2 border-t border-[var(--hut-border)] pt-4">
                  <button
                    type="button"
                    className={btnVyberFiltrClass}
                    disabled={!kompletniSoupiska}
                    title={
                      kompletniSoupiska
                        ? "Uložit 4+3+1 do prohlížeče"
                        : `Potřeba ${SOUPISKA_POZADOVANE.utok} útok + ${SOUPISKA_POZADOVANE.obrana} obrana + ${SOUPISKA_POZADOVANE.golmani} brankář`
                    }
                    onClick={ulozitKompletniSoupisku}
                  >
                    Uložit kompletní soupisku
                  </button>
                  <button
                    type="button"
                    className={btnZrusitVyberClass}
                    disabled={!ulozenaSoupiskaMeta}
                    onClick={nacistUlozenouSoupisku}
                  >
                    Obnovit z uložené
                  </button>
                  {ulozenaSoupiskaMeta ? (
                    <button
                      type="button"
                      className={btnZrusitVyberClass}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Smazat uloženou soupisku z tohoto prohlížeče?",
                          )
                        ) {
                          smazatUlozenouSoupisku();
                        }
                      }}
                    >
                      Smazat uloženou
                    </button>
                  ) : null}
                  {!kompletniSoupiska && soupiska.pocetRadku > 0 ? (
                    <span className="text-[11px] text-[var(--hut-muted)]">
                      K uložení chybí{" "}
                      {[
                        soupiska.pocetUtok < SOUPISKA_POZADOVANE.utok
                          ? `${SOUPISKA_POZADOVANE.utok - soupiska.pocetUtok} útok`
                          : null,
                        soupiska.pocetObrana < SOUPISKA_POZADOVANE.obrana
                          ? `${SOUPISKA_POZADOVANE.obrana - soupiska.pocetObrana} obrana`
                          : null,
                        soupiska.pocetGolmani < SOUPISKA_POZADOVANE.golmani
                          ? `${SOUPISKA_POZADOVANE.golmani - soupiska.pocetGolmani} brankář`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {soupiska.pocetRadku > 0 ? (
                <div className="mt-2 flex flex-col gap-3 border-t border-[var(--hut-border)] pt-4 sm:flex-row sm:items-end sm:justify-between">
                  <p className="text-xs leading-relaxed text-[var(--hut-muted)]">
                    Řádky: útok {soupiska.pocetUtok}/{MAX_VYBER_UTOK}, obrana {soupiska.pocetObrana}/
                    {MAX_VYBER_OBRANA}, brankáři {soupiska.pocetGolmani}/{MAX_VYBER_GOLMAN}
                    {soupiska.pocetRadku > soupiska.unikatniHracu ? (
                      <>
                        {" "}
                        · <span className="text-zinc-300">{soupiska.unikatniHracu} unikátních hráčů</span> (plat
                        řádků může být vyšší)
                      </>
                    ) : null}
                    {maxRozpocetAplikovany !== null ? (
                      <>
                        {" "}
                        · limit filtru{" "}
                        <span className="tabular-nums text-zinc-300">
                          {formatovatPlatVMil(maxRozpocetAplikovany)}
                        </span>
                        {soupiska.platCelkem > maxRozpocetAplikovany ? (
                          <span className="text-amber-200/95"> — nad rozpočtem</span>
                        ) : (
                          <span className="text-[var(--hut-lime)]"> — vejde se</span>
                        )}
                      </>
                    ) : null}
                  </p>
                  <div className="shrink-0 text-left sm:text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--hut-muted)]">
                      Plat soupisky celkem
                    </p>
                    <p className="text-xl font-semibold tabular-nums text-white">
                      {formatovatPlatVMil(soupiska.platCelkem)}
                    </p>
                    <p className="mt-0.5 text-[11px] tabular-nums text-[var(--hut-muted)]">
                      útok {formatovatPlatVMil(soupiska.platUtok)} · obrana{" "}
                      {formatovatPlatVMil(soupiska.platObrana)} · brankáři{" "}
                      {formatovatPlatVMil(soupiska.platGolmani)}
                    </p>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {filtryPoHledani && zobrazitSekciUtok ? (
          <section>
            <h3 className="text-lg font-medium text-white">Útočné formace (LK · C · PK)</h3>
            {!utocneRadky.length && !loadingKomb ? (
              <p className="mt-2 text-sm text-[var(--hut-muted)]">
                Žádná kompletní útočná kombinace v databázi — doplní ji správce v Nastavení bonusů.
              </p>
            ) : null}
            {vysledkyUtok.length === 0 && utocneRadky.length > 0 && filtryPoHledani ? (
              <p className="mt-2 text-sm text-[var(--hut-muted)]">
                Žádná trojice nepokrývá všechny tři symboly kombinace na pozicích LK/C/PK při zvolených filtrech.
              </p>
            ) : null}
            {vysledkyUtok.length > 0 && utokZobrazeno.length === 0 && typBonusuAplikovany !== "vse" ? (
              <p className="mt-2 text-sm text-[var(--hut-muted)]">
                Po zapnutí filtru „{typBonusuAplikovany}“ nezůstala žádná útočná sestava — zkus „Vše“ nebo jiný typ.
              </p>
            ) : null}
            {utokZobrazeno.length > 0 &&
            utokZobrazenoPoRozpoctu.length === 0 &&
            maxRozpocetAplikovany !== null ? (
              <p className="mt-2 text-sm text-[var(--hut-muted)]">
                Žádná útočná sestava nepřekročí rozpočet do{" "}
                {formatovatPlatVMil(maxRozpocetAplikovany)} — zkus vyšší limit nebo jiné karty.
              </p>
            ) : null}
            {utokZobrazenoPoRozpoctu.length > 0 &&
            utokZobrazenoPoKapitanske.length === 0 &&
            kapitanskaTymyAplikovane.length > 0 ? (
              <p className="mt-2 text-sm text-[var(--hut-muted)]">
                Žádná útočná formace neobsahuje všechny zvolené týmy kapitánské souhry — zkus méně týmů, uvolnit OVR
                nebo přidat karty z požadovaných týmů do inventáře.
              </p>
            ) : null}
            {utokZobrazenoPoRozpoctu.length > 0 &&
            utokZobrazenoPoHracovi.length === 0 &&
            hracKartaIdAplikovany &&
            vybranaKartaAplikovana &&
            kapitanskaTymyAplikovane.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--hut-muted)]">
                {vybranaKartaAplikovana.jmeno} není v žádné útočné formaci při zvolených filtrech — zkus jinou pozici
                (útok vyžaduje LK/C/PK), uvolnit OVR nebo zrušit výběr hráče.
              </p>
            ) : null}
            {utokZobrazenoPoPrekryvu.length > 0 &&
            utokZobrazenoPoVylouceni.length === 0 &&
            maVybranouUtok &&
            filtryPoHledani ? (
              <p className="mt-2 text-sm text-amber-200/90" role="status">
                Ostatní útočné formace sdílejí s některou z připnutých sestav alespoň jednoho hráče — v seznamu
                níže nic nezbývá. Uprav připnutí nahoře nebo změň OVR / typ bonusu.
              </p>
            ) : null}
            <ul className="mt-4 space-y-4">
              {utokZobrazenoPoVylouceniSerazeno.map((v) => {
                const dalsi = dalsiBonusyPrekryvuProRadek(
                  v.kombinace.bonusTyp,
                  mapaBonusuUtok.get(klicHracuUtokTrojice(v)),
                );
                return (
                  <li
                    key={klicUtocnaFormace(v)}
                    className={[
                      polozkaFormaceClass,
                      dalsi.length ? "border-l-2 border-amber-400/45 bg-amber-950/15" : "",
                    ].join(" ")}
                  >
                    <UtocnaFormaceObsah
                      v={v}
                      narodnostiVolby={narodnostiVolby}
                      zobrazitTlacitkoVyber
                      onVybratProFiltrHrace={() => pridatUtok(v)}
                      dalsiBonusyPrekryvu={dalsi.length ? dalsi : undefined}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
          ) : null}

          {filtryPoHledani && zobrazitSekciObranu ? (
          <section>
            <h3 className="text-lg font-medium text-white">Obranné dvojice (LO · PO)</h3>
            {!obranneRadky.length && !loadingKomb ? (
              <p className="mt-2 text-sm text-[var(--hut-muted)]">
                Žádná kompletní obranná kombinace v databázi.
              </p>
            ) : null}
            {vysledkyObrana.length === 0 && obranneRadky.length > 0 && filtryPoHledani ? (
              <p className="mt-2 text-sm text-[var(--hut-muted)]">
                Žádná dvojice LO+PO nepokrývá oba symboly kombinace při zvolených filtrech.
              </p>
            ) : null}
            {vysledkyObrana.length > 0 && obranaZobrazeno.length === 0 && typBonusuAplikovany !== "vse" ? (
              <p className="mt-2 text-sm text-[var(--hut-muted)]">
                Pro typ „{typBonusuAplikovany}“ žádná obranná dvojice.
              </p>
            ) : null}
            {obranaZobrazeno.length > 0 &&
            obranaZobrazenoPoRozpoctu.length === 0 &&
            maxRozpocetAplikovany !== null ? (
              <p className="mt-2 text-sm text-[var(--hut-muted)]">
                Žádná obranná dvojice se nevejde do rozpočtu do{" "}
                {formatovatPlatVMil(maxRozpocetAplikovany)}.
              </p>
            ) : null}
            {obranaZobrazenoPoRozpoctu.length > 0 &&
            obranaZobrazenoPoHracovi.length === 0 &&
            hracKartaIdAplikovany &&
            vybranaKartaAplikovana ? (
              <p className="mt-2 text-sm text-[var(--hut-muted)]">
                {vybranaKartaAplikovana.jmeno} není v žádné obranné dvojici — zkontroluj pozici (LO/PO) nebo filtry.
              </p>
            ) : null}
            {obranaZobrazenoPoPrekryvu.length > 0 &&
            obranaZobrazenoPoVylouceni.length === 0 &&
            maVybranouObranu &&
            filtryPoHledani ? (
              <p className="mt-2 text-sm text-amber-200/90" role="status">
                Ostatní obranné dvojice sdílejí s některým připnutím alespoň jednoho hráče — zkus upravit výběr
                nahoře.
              </p>
            ) : null}
            <ul className="mt-4 space-y-4">
              {obranaZobrazenoPoVylouceniSerazeno.map((v) => {
                const dalsi = dalsiBonusyPrekryvuProRadek(
                  v.kombinace.bonusTyp,
                  mapaBonusuObrana.get(klicHracuDvojiceIde(v)),
                );
                return (
                  <li
                    key={klicRadkuDvojice(v)}
                    className={[
                      polozkaFormaceClass,
                      dalsi.length ? "border-l-2 border-amber-400/45 bg-amber-950/15" : "",
                    ].join(" ")}
                  >
                    <DvojiceFormaceObsah
                      v={v}
                      narodnostiVolby={narodnostiVolby}
                      zobrazitTlacitkoVyber
                      onVybratProFiltrHrace={() => pridatObrana(v)}
                      roleA="LO"
                      roleB="PO"
                      filtrHint="obranné dvojice"
                      dalsiBonusyPrekryvu={dalsi.length ? dalsi : undefined}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
          ) : null}

          {filtryPoHledani && zobrazitSekciGolmany ? (
          <section>
            <h3 className="text-lg font-medium text-white">Brankářské dvojice (G · G)</h3>
            <p className="mt-1 text-xs text-[var(--hut-muted)]">
              Stejné 2-parametrové kombinace jako u obrany; oba symboly lze přiřadit ke dvěma brankářům v
              libovolném pořadí (G1/G2 jsou jen pořadí v seznamu karet).
            </p>
            {vysledkyGolmani.length === 0 && obranneRadky.length > 0 && filtryPoHledani ? (
              <p className="mt-2 text-sm text-[var(--hut-muted)]">
                Žádná dvojice brankářů nepokrývá oba symboly kombinace při zvolených filtrech.
              </p>
            ) : null}
            {vysledkyGolmani.length > 0 && golmaniZobrazeno.length === 0 && typBonusuAplikovany !== "vse" ? (
              <p className="mt-2 text-sm text-[var(--hut-muted)]">
                Pro typ „{typBonusuAplikovany}“ žádná brankářská dvojice.
              </p>
            ) : null}
            {golmaniZobrazeno.length > 0 &&
            golmaniZobrazenoPoRozpoctu.length === 0 &&
            maxRozpocetAplikovany !== null ? (
              <p className="mt-2 text-sm text-[var(--hut-muted)]">
                Žádná brankářská dvojice se nevejde do rozpočtu do{" "}
                {formatovatPlatVMil(maxRozpocetAplikovany)}.
              </p>
            ) : null}
            {golmaniZobrazenoPoRozpoctu.length > 0 &&
            golmaniZobrazenoPoHracovi.length === 0 &&
            hracKartaIdAplikovany &&
            vybranaKartaAplikovana ? (
              <p className="mt-2 text-sm text-[var(--hut-muted)]">
                {vybranaKartaAplikovana.jmeno} není v žádné brankářské dvojici — pozice musí být G.
              </p>
            ) : null}
            {golmaniZobrazenoPoPrekryvu.length > 0 &&
            golmaniZobrazenoPoVylouceni.length === 0 &&
            maVybraneGolmany &&
            filtryPoHledani ? (
              <p className="mt-2 text-sm text-amber-200/90" role="status">
                Ostatní brankářské dvojice sdílejí s některým připnutím alespoň jednoho hráče — zkus upravit výběr
                nahoře.
              </p>
            ) : null}
            <ul className="mt-4 space-y-4">
              {golmaniZobrazenoPoVylouceniSerazeno.map((v) => {
                const dalsi = dalsiBonusyPrekryvuProRadek(
                  v.kombinace.bonusTyp,
                  mapaBonusuGolmani.get(klicHracuDvojiceIde(v)),
                );
                return (
                  <li
                    key={klicRadkuDvojice(v)}
                    className={[
                      polozkaFormaceClass,
                      dalsi.length ? "border-l-2 border-amber-400/45 bg-amber-950/15" : "",
                    ].join(" ")}
                  >
                    <DvojiceFormaceObsah
                      v={v}
                      narodnostiVolby={narodnostiVolby}
                      zobrazitTlacitkoVyber
                      onVybratProFiltrHrace={() => pridatGolmani(v)}
                      roleA="G1"
                      roleB="G2"
                      filtrHint="brankářské dvojice"
                      dalsiBonusyPrekryvu={dalsi.length ? dalsi : undefined}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
          ) : null}
        </>
      )}
    </div>
    <FloatingZpetNahoru />
    </>
    </TypKartyMetaOptsProvider>
  );
}
