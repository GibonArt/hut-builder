"use client";

import { useEffect, useMemo, useState, startTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { jeBonusAdmin } from "@/lib/bonusAdmin";
import { createClient } from "@/lib/supabase/client";
import { nactiKartyUzivatele } from "@/lib/cardsDb";
import { ceskaZpravaAuthNeboDb } from "@/lib/supabaseChybyCs";
import {
  formatujBonusVRadkuNahled,
  nactiBonusKombinaceSdilene,
  type BonusKombinaceParametr,
  type RadekBonusKombinaceUi,
  TYPY_BONUSU_KOMBINACE,
  type TypBonusuKombinace,
} from "@/lib/bonusKombinaceDb";
import {
  filtrujKartyPodleOvr,
  prirazeniSymboluDvojice,
  prirazeniSymboluUtok,
  spoctiGolmanskeDvojice,
  spoctiObranneDvojice,
  spoctiUtocneFormace,
  type DvojiceVysledek,
  type UtocnaFormaceVysledek,
} from "@/lib/optimalizatorFormaci";
import { vsechnyNarodnostiCS, vlajkaZeme } from "@/lib/narodnosti";
import { urlLogaTymu } from "@/lib/tymLoga";
import { HUT_POZICE_ZKRATKA } from "@/lib/hutPozice";
import { formatovatPlatVMil } from "@/lib/platMiliony";
import type { HutCard, Pozice } from "@/types";
import { TypKartyMiniLogo } from "@/components/TypKartyIkona";
import { TymLogo } from "@/components/TymLogo";

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
  typBonusuFiltr: TypBonusuKombinace | "vse";
};

const btnHledatClass =
  "min-h-12 touch-manipulation rounded-full border border-[var(--hut-lime)]/55 bg-[var(--hut-lime)]/15 px-6 py-3 text-sm font-semibold text-[var(--hut-lime)] shadow-sm transition-colors hover:bg-[var(--hut-lime)]/25 disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-0 sm:py-2.5";

function filtrujVysledkyPodleTypuBonusu<T extends { kombinace: RadekBonusKombinaceUi }>(
  radky: readonly T[],
  typ: TypBonusuKombinace | "vse",
): T[] {
  if (typ === "vse") return [...radky];
  return radky.filter((x) => x.kombinace.bonusTyp === typ);
}

function klicUtocnaFormace(v: UtocnaFormaceVysledek): string {
  return `${v.kombinace.id}|${v.lk.id}|${v.c.id}|${v.pk.id}`;
}

/** Jednoznačný klíč dvojice (pořadí karet v řádku nehraje roli). */
function klicDvojiceVysledek(v: DvojiceVysledek): string {
  const [x, y] = [v.a.id, v.b.id].slice().sort();
  return `${v.kombinace.id}|${x}|${y}`;
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

const MAX_VYBER_UTOK_NA_TYP = 4;
const MAX_VYBER_OBRANA_NA_TYP = 3;
const MAX_VYBER_GOLMAN_NA_TYP = 1;

function prazdneVyberyPodleTypu(): Record<TypBonusuKombinace, string[]> {
  return { PLAT: [], CLK: [], BS: [] };
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

function parseOvrVolitelne(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  if (!Number.isFinite(n) || n < 0 || n > 99) return null;
  return n;
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
}: {
  v: UtocnaFormaceVysledek;
  narodnostiVolby: ReturnType<typeof vsechnyNarodnostiCS>;
  zobrazitTlacitkoVyber: boolean;
  onVybratProFiltrHrace: () => void;
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
      {zobrazitTlacitkoVyber ? (
        <div className="mt-3">
          <button type="button" className={btnVyberFiltrClass} onClick={onVybratProFiltrHrace}>
            Vybrat — skrýt ostatní sestavy se stejným hráčem
          </button>
          <p className="mt-1.5 text-[11px] leading-snug text-[var(--hut-muted)]">
            Z výsledků zmizí všechny útočné formace, kde je LK, C nebo PK kterýkoli z těchto tří hráčů.
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
}: {
  v: DvojiceVysledek;
  narodnostiVolby: ReturnType<typeof vsechnyNarodnostiCS>;
  zobrazitTlacitkoVyber: boolean;
  onVybratProFiltrHrace: () => void;
  roleA: Pozice | "G1" | "G2";
  roleB: Pozice | "G1" | "G2";
  filtrHint: string;
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
      {zobrazitTlacitkoVyber ? (
        <div className="mt-3">
          <button type="button" className={btnVyberFiltrClass} onClick={onVybratProFiltrHrace}>
            Vybrat — skrýt ostatní sestavy se stejným hráčem
          </button>
          <p className="mt-1.5 text-[11px] leading-snug text-[var(--hut-muted)]">
            Z výsledků zmizí všechny {filtrHint}, kde je kterýkoli z těchto dvou hráčů.
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

  const [karty, setKarty] = useState<HutCard[]>([]);
  const [loadingKarty, setLoadingKarty] = useState(false);
  const [chybaKarty, setChybaKarty] = useState<string | null>(null);

  const [utocneRadky, setUtocneRadky] = useState<RadekBonusKombinaceUi[]>([]);
  const [obranneRadky, setObranneRadky] = useState<RadekBonusKombinaceUi[]>([]);
  const [loadingKomb, setLoadingKomb] = useState(false);
  const [chybaKomb, setChybaKomb] = useState<string | null>(null);

  const [minOvrStr, setMinOvrStr] = useState("");
  const [maxOvrStr, setMaxOvrStr] = useState("");
  const [typBonusuFiltr, setTypBonusuFiltr] = useState<TypBonusuKombinace | "vse">("vse");
  /** Hodnoty filtrů použité u posledního výpočtu (klik „Hledat“). Dokud je null, náročné výpočty neběží. */
  const [filtryPoHledani, setFiltryPoHledani] = useState<SnapshotFiltryOptimalizatoru | null>(
    null,
  );
  /** Rychlý výběr, který blok výsledků zobrazit — méně scrollování při velkém počtu kombinací. */
  const [sekceQuickFiltr, setSekceQuickFiltr] = useState<SekceVysledkuQuick>("vse");

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

  const minOvr = useMemo(() => parseOvrVolitelne(minOvrStr), [minOvrStr]);
  const maxOvr = useMemo(() => parseOvrVolitelne(maxOvrStr), [maxOvrStr]);
  const chybaOvrRozsah =
    minOvr !== null && maxOvr !== null && minOvr > maxOvr
      ? "Minimální OVR nesmí být vyšší než maximální."
      : null;

  const neplatnyVstup =
    (minOvrStr.trim() !== "" && minOvr === null) ||
    (maxOvrStr.trim() !== "" && maxOvr === null);

  const filtryOdlisneOdHledani = useMemo(() => {
    if (!filtryPoHledani) return false;
    return (
      filtryPoHledani.minOvrStr !== minOvrStr ||
      filtryPoHledani.maxOvrStr !== maxOvrStr ||
      filtryPoHledani.typBonusuFiltr !== typBonusuFiltr
    );
  }, [filtryPoHledani, minOvrStr, maxOvrStr, typBonusuFiltr]);

  useEffect(() => {
    if (!user?.id) {
      setFiltryPoHledani(null);
    }
  }, [user?.id]);

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

  const vysledkyUtok = useMemo(
    () => spoctiUtocneFormace(kartyVeFiltru, utocneRadky, narodnostiVolby),
    [kartyVeFiltru, utocneRadky, narodnostiVolby],
  );

  const vysledkyObrana = useMemo(
    () => spoctiObranneDvojice(kartyVeFiltru, obranneRadky, narodnostiVolby),
    [kartyVeFiltru, obranneRadky, narodnostiVolby],
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

  const mapaUtok = useMemo(() => {
    const m = new Map<string, UtocnaFormaceVysledek>();
    for (const x of vysledkyUtok) m.set(klicUtocnaFormace(x), x);
    return m;
  }, [vysledkyUtok]);

  const mapaObrana = useMemo(() => {
    const m = new Map<string, DvojiceVysledek>();
    for (const x of vysledkyObrana) m.set(klicDvojiceVysledek(x), x);
    return m;
  }, [vysledkyObrana]);

  const mapaGolmani = useMemo(() => {
    const m = new Map<string, DvojiceVysledek>();
    for (const x of vysledkyGolmani) m.set(klicDvojiceVysledek(x), x);
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
    if (!zakazaneIdUtok.size) return utokZobrazeno;
    return utokZobrazeno.filter((row) => !maUtokSpolecnehoHrace(row, zakazaneIdUtok));
  }, [utokZobrazeno, zakazaneIdUtok]);

  const obranaZobrazenoPoVylouceni = useMemo(() => {
    if (!zakazaneIdObrana.size) return obranaZobrazeno;
    return obranaZobrazeno.filter((row) => !maDvojiceSpolecnehoHrace(row, zakazaneIdObrana));
  }, [obranaZobrazeno, zakazaneIdObrana]);

  const golmaniZobrazenoPoVylouceni = useMemo(() => {
    if (!zakazaneIdGolmani.size) return golmaniZobrazeno;
    return golmaniZobrazeno.filter((row) => !maDvojiceSpolecnehoHrace(row, zakazaneIdGolmani));
  }, [golmaniZobrazeno, zakazaneIdGolmani]);

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
    const valid = new Set(vysledkyObrana.map((x) => klicDvojiceVysledek(x)));
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
    const valid = new Set(vysledkyGolmani.map((x) => klicDvojiceVysledek(x)));
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

  const pridatUtok = (v: UtocnaFormaceVysledek) => {
    const klic = klicUtocnaFormace(v);
    const typ = v.kombinace.bonusTyp;
    setVyberyUtok((prev) => {
      if (prev[typ].includes(klic)) return prev;
      if (prev[typ].length >= MAX_VYBER_UTOK_NA_TYP) {
        toast.error(`Útok: nejvýše ${MAX_VYBER_UTOK_NA_TYP} sestavy s bonusem ${typ}.`);
        return prev;
      }
      return { ...prev, [typ]: [...prev[typ], klic] };
    });
  };

  const pridatObrana = (v: DvojiceVysledek) => {
    const klic = klicDvojiceVysledek(v);
    const typ = v.kombinace.bonusTyp;
    setVyberyObrana((prev) => {
      if (prev[typ].includes(klic)) return prev;
      if (prev[typ].length >= MAX_VYBER_OBRANA_NA_TYP) {
        toast.error(`Obrana: nejvýše ${MAX_VYBER_OBRANA_NA_TYP} dvojice s bonusem ${typ}.`);
        return prev;
      }
      return { ...prev, [typ]: [...prev[typ], klic] };
    });
  };

  const pridatGolmani = (v: DvojiceVysledek) => {
    const klic = klicDvojiceVysledek(v);
    const typ = v.kombinace.bonusTyp;
    setVyberyGolmani((prev) => {
      if (prev[typ].includes(klic)) return prev;
      if (prev[typ].length >= MAX_VYBER_GOLMAN_NA_TYP) {
        toast.error(`Brankáři: nejvýše ${MAX_VYBER_GOLMAN_NA_TYP} dvojice s bonusem ${typ}.`);
        return prev;
      }
      return { ...prev, [typ]: [...prev[typ], klic] };
    });
  };

  const handleHledat = () => {
    if (chybaOvrRozsah || neplatnyVstup) {
      toast.error("Zkontroluj rozsah OVR (celá čísla 0–99 nebo prázdná pole).");
      return;
    }
    if (!karty.some((k) => !k.prodano)) {
      toast.error("Žádná neprodaná karta k výpočtu.");
      return;
    }
    startTransition(() => {
      setFiltryPoHledani({
        minOvrStr,
        maxOvrStr,
        typBonusuFiltr,
      });
    });
  };

  const nacitani = authLoading || loadingKarty || loadingKomb;

  const hledatDisabled =
    nacitani || !!chybaKarty || !!chybaKomb || !karty.some((k) => !k.prodano);

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
          Zobrazí se jen plné shody — žádné částečné trojice ani dvojice. U každého výsledku můžeš připnout
          sestavy podle typu bonusu (PLAT / CLK / BS): útok max. 4 na typ, obrana max. 3 na typ, brankáři max. 1
          na typ. Ze seznamu se pak skryjí všechny varianty, které sdílejí alespoň jednoho hráče s některou z
          připnutých sestav v dané sekci (sjednocení množin hráčů). Karty v inventáři označené jako{" "}
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
              OVR: prázdné pole = bez limitu. Typ bonusu zužuje výsledky podle hodnoty z Nastavení bonusů. Pozice (LK,
              C, PK / LO, PO / G) se vždy dodrží. Kombinace se dopočítají až po kliknutí na{" "}
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
            <h4 className="mt-6 text-xs font-semibold uppercase tracking-wide text-[var(--hut-muted)]">
              OVR
            </h4>
            <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-end sm:gap-6">
              <div className="w-full sm:w-auto">
                <label htmlFor="opt-min-ovr" className={labelClass}>
                  Minimální OVR
                </label>
                <input
                  id="opt-min-ovr"
                  type="text"
                  inputMode="numeric"
                  placeholder="—"
                  value={minOvrStr}
                  onChange={(e) => setMinOvrStr(e.target.value)}
                  className={inputClass}
                  aria-invalid={minOvrStr.trim() !== "" && minOvr === null}
                />
              </div>
              <div className="w-full sm:w-auto">
                <label htmlFor="opt-max-ovr" className={labelClass}>
                  Maximální OVR
                </label>
                <input
                  id="opt-max-ovr"
                  type="text"
                  inputMode="numeric"
                  placeholder="—"
                  value={maxOvrStr}
                  onChange={(e) => setMaxOvrStr(e.target.value)}
                  className={inputClass}
                  aria-invalid={maxOvrStr.trim() !== "" && maxOvr === null}
                />
              </div>
            </div>
            {neplatnyVstup ? (
              <p className="mt-3 text-sm text-amber-200/90" role="alert">
                Zadej celé číslo 0–99 nebo nech pole prázdné.
              </p>
            ) : null}
            {chybaOvrRozsah ? (
              <p className="mt-3 text-sm text-red-200/90" role="alert">
                {chybaOvrRozsah}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className={btnHledatClass}
                disabled={hledatDisabled}
                onClick={handleHledat}
              >
                Hledat
              </button>
              {filtryPoHledani ? (
                <button
                  type="button"
                  className="touch-manipulation rounded-full border border-[var(--hut-border)] bg-transparent px-4 py-2.5 text-sm font-medium text-[var(--hut-muted)] transition-colors hover:border-zinc-500 hover:text-white disabled:opacity-45 sm:py-2"
                  disabled={nacitani}
                  onClick={() => {
                    startTransition(() => setFiltryPoHledani(null));
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
                Nastav filtry výše (OVR, typ bonusu) a klikni na <strong className="text-zinc-200">Hledat</strong>. Teprve
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
                {filtryPoHledani.typBonusuFiltr !== "vse"
                  ? ` · zobrazeno jen ${filtryPoHledani.typBonusuFiltr}: útok ${utokZobrazeno.length}, obrana ${obranaZobrazeno.length}, brankáři ${golmaniZobrazeno.length}`
                  : ` · výsledků: útok ${utokZobrazeno.length}, obrana ${obranaZobrazeno.length}, brankáři ${golmaniZobrazeno.length}`}
                {maVybranouUtok || maVybranouObranu || maVybraneGolmany
                  ? ` · po výběru hráčů: útok ${utokZobrazenoPoVylouceni.length}/${utokZobrazeno.length}, obrana ${obranaZobrazenoPoVylouceni.length}/${obranaZobrazeno.length}, brankáři ${golmaniZobrazenoPoVylouceni.length}/${golmaniZobrazeno.length}`
                  : ""}
              </p>
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
            </div>
          ) : null}

          {filtryPoHledani && !nacitani && zobrazitPripnutouSekci ? (
            <section
              className="space-y-4 rounded-xl border border-[var(--hut-lime)]/40 bg-[var(--hut-surface-raised)]/90 p-4 shadow-inner shadow-black/15 sm:p-5"
              aria-label="Vybrané sestavy pro filtrování podle hráčů"
            >
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--hut-lime)]">
                  Připnuté sestavy (filtr hráčů)
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[var(--hut-muted)]">
                  Ze seznamů níže jsou skryté varianty, které sdílejí alespoň jednoho hráče s některou z
                  připnutých sestav v dané sekci (sjednocení hráčů ze všech připnutí). Limity: útok 4 / typ
                  bonusu, obrana 3 / typ, brankáři 1 / typ.
                </p>
              </div>

              {maVybranouUtok && zobrazitSekciUtok ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-white">Útočná formace (LK · C · PK)</p>
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
                          Bonus {typ} ({vyberyUtok[typ].length}/{MAX_VYBER_UTOK_NA_TYP})
                        </p>
                        {vyberyUtok[typ].map((klic) => {
                          const v = mapaUtok.get(klic);
                          if (!v) return null;
                          return (
                            <article
                              key={klic}
                              className={`${polozkaFormaceClass} border-[var(--hut-focus)]/30 bg-[var(--hut-bg-elevated)]/70`}
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
                    <p className="text-xs font-semibold text-white">Obranná dvojice (LO · PO)</p>
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
                          Bonus {typ} ({vyberyObrana[typ].length}/{MAX_VYBER_OBRANA_NA_TYP})
                        </p>
                        {vyberyObrana[typ].map((klic) => {
                          const v = mapaObrana.get(klic);
                          if (!v) return null;
                          return (
                            <article
                              key={klic}
                              className={`${polozkaFormaceClass} border-[var(--hut-focus)]/30 bg-[var(--hut-bg-elevated)]/70`}
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
                    <p className="text-xs font-semibold text-white">Brankářská dvojice (G · G)</p>
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
                          Bonus {typ} ({vyberyGolmani[typ].length}/{MAX_VYBER_GOLMAN_NA_TYP})
                        </p>
                        {vyberyGolmani[typ].map((klic) => {
                          const v = mapaGolmani.get(klic);
                          if (!v) return null;
                          return (
                            <article
                              key={klic}
                              className={`${polozkaFormaceClass} border-[var(--hut-focus)]/30 bg-[var(--hut-bg-elevated)]/70`}
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
                              />
                            </article>
                          );
                        })}
                      </div>
                    ),
                  )}
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
            utokZobrazenoPoVylouceni.length === 0 &&
            maVybranouUtok &&
            filtryPoHledani ? (
              <p className="mt-2 text-sm text-amber-200/90" role="status">
                Ostatní útočné formace sdílejí s některou z připnutých sestav alespoň jednoho hráče — v seznamu
                níže nic nezbývá. Uprav připnutí nahoře nebo změň OVR / typ bonusu.
              </p>
            ) : null}
            <ul className="mt-4 space-y-4">
              {utokZobrazenoPoVylouceni.map((v) => (
                <li key={klicUtocnaFormace(v)} className={polozkaFormaceClass}>
                  <UtocnaFormaceObsah
                    v={v}
                    narodnostiVolby={narodnostiVolby}
                    zobrazitTlacitkoVyber
                    onVybratProFiltrHrace={() => pridatUtok(v)}
                  />
                </li>
              ))}
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
            obranaZobrazenoPoVylouceni.length === 0 &&
            maVybranouObranu &&
            filtryPoHledani ? (
              <p className="mt-2 text-sm text-amber-200/90" role="status">
                Ostatní obranné dvojice sdílejí s některým připnutím alespoň jednoho hráče — zkus upravit výběr
                nahoře.
              </p>
            ) : null}
            <ul className="mt-4 space-y-4">
              {obranaZobrazenoPoVylouceni.map((v) => (
                <li key={klicDvojiceVysledek(v)} className={polozkaFormaceClass}>
                  <DvojiceFormaceObsah
                    v={v}
                    narodnostiVolby={narodnostiVolby}
                    zobrazitTlacitkoVyber
                    onVybratProFiltrHrace={() => pridatObrana(v)}
                    roleA="LO"
                    roleB="PO"
                    filtrHint="obranné dvojice"
                  />
                </li>
              ))}
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
            golmaniZobrazenoPoVylouceni.length === 0 &&
            maVybraneGolmany &&
            filtryPoHledani ? (
              <p className="mt-2 text-sm text-amber-200/90" role="status">
                Ostatní brankářské dvojice sdílejí s některým připnutím alespoň jednoho hráče — zkus upravit výběr
                nahoře.
              </p>
            ) : null}
            <ul className="mt-4 space-y-4">
              {golmaniZobrazenoPoVylouceni.map((v) => (
                <li key={klicDvojiceVysledek(v)} className={polozkaFormaceClass}>
                  <DvojiceFormaceObsah
                    v={v}
                    narodnostiVolby={narodnostiVolby}
                    zobrazitTlacitkoVyber
                    onVybratProFiltrHrace={() => pridatGolmani(v)}
                    roleA="G1"
                    roleB="G2"
                    filtrHint="brankářské dvojice"
                  />
                </li>
              ))}
            </ul>
          </section>
          ) : null}
        </>
      )}
    </div>
  );
}
