"use client";

import { useEffect, useMemo, useState, startTransition } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { nactiKartyUzivatele } from "@/lib/cardsDb";
import {
  formatujBonusVRadkuNahled,
  nactiBonusKombinaceSdilene,
  type BonusKombinaceParametr,
  type RadekBonusKombinaceUi,
  type TypBonusuKombinace,
} from "@/lib/bonusKombinaceDb";
import {
  filtrujKartyPodleOvr,
  prirazeniSymboluDvojice,
  prirazeniSymboluUtok,
  spoctiGolmanskeDvojice,
  spoctiObranneDvojice,
  spoctiUtocneFormace,
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
  "w-full max-w-[10rem] rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] px-3 py-2 text-sm text-white tabular-nums outline-none transition-[border-color,box-shadow] focus:border-[var(--hut-focus)]/70 focus:ring-2 focus:ring-[var(--hut-focus-ring)]";

const btnFiltrClass =
  "rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors";

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

function filtrujVysledkyPodleTypuBonusu<T extends { kombinace: RadekBonusKombinaceUi }>(
  radky: readonly T[],
  typ: TypBonusuKombinace | "vse",
): T[] {
  if (typ === "vse") return [...radky];
  return radky.filter((x) => x.kombinace.bonusTyp === typ);
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
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <NahledKombinace r={r} parametryPocet={parametryPocet} narodnostiVolby={narodnostiVolby} />
      </div>
      <div
        className="shrink-0 text-right"
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

  const minOvr = useMemo(() => parseOvrVolitelne(minOvrStr), [minOvrStr]);
  const maxOvr = useMemo(() => parseOvrVolitelne(maxOvrStr), [maxOvrStr]);
  const chybaOvrRozsah =
    minOvr !== null && maxOvr !== null && minOvr > maxOvr
      ? "Minimální OVR nesmí být vyšší než maximální."
      : null;

  const neplatnyVstup =
    (minOvrStr.trim() !== "" && minOvr === null) ||
    (maxOvrStr.trim() !== "" && maxOvr === null);

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
          setChybaKarty(error.message);
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
          setChybaKomb(error.message);
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
    if (chybaOvrRozsah || neplatnyVstup) return [];
    return filtrujKartyPodleOvr(karty, minOvr, maxOvr);
  }, [karty, minOvr, maxOvr, chybaOvrRozsah, neplatnyVstup]);

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
    () => filtrujVysledkyPodleTypuBonusu(vysledkyUtok, typBonusuFiltr),
    [vysledkyUtok, typBonusuFiltr],
  );
  const obranaZobrazeno = useMemo(
    () => filtrujVysledkyPodleTypuBonusu(vysledkyObrana, typBonusuFiltr),
    [vysledkyObrana, typBonusuFiltr],
  );
  const golmaniZobrazeno = useMemo(
    () => filtrujVysledkyPodleTypuBonusu(vysledkyGolmani, typBonusuFiltr),
    [vysledkyGolmani, typBonusuFiltr],
  );

  const nacitani = authLoading || loadingKarty || loadingKomb;

  return (
    <div className="space-y-10">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight text-white">Optimalizátor formací</h2>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-[var(--hut-muted)]">
          Hledá kompletní sestavy podle uložených kombinací v{" "}
          <a href="/nastaveni-bonusu" className="text-[var(--hut-lime)] underline-offset-2 hover:underline">
            Nastavení bonusů
          </a>
          : útok (LK + C + PK), obrana (LO + PO) a dvojice brankářů (G + G). Symboly z kombinace musí pokrýt
          všechny příslušné pozice v libovolném pořadí (LK nemusí odpovídat prvnímu uloženému parametru).
          Zobrazí se jen plné shody — žádné částečné trojice ani dvojice.
        </p>
      </header>

      {!user ? (
        <p className="rounded-xl border border-dashed border-[var(--hut-border)] bg-[var(--hut-surface)]/50 px-6 py-10 text-center text-sm text-[var(--hut-muted)]">
          Přihlas se pro načtení inventáře a výpočet formací.
        </p>
      ) : (
        <>
          <section className="rounded-xl border border-[var(--hut-border)] bg-[var(--hut-surface-raised)]/80 p-5 shadow-inner shadow-black/20">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--hut-muted)]">
              Filtry formací
            </h3>
            <p className="mt-1 text-xs text-[var(--hut-muted)]/90">
              OVR: prázdné pole = bez limitu. Platí pro všechny typy formací; pozice (LK, C, PK / LO, PO / G) se
              vždy dodrží. Typ bonusu zužuje nalezené kombinace podle hodnoty z Nastavení bonusů.
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
            <div className="mt-3 flex flex-wrap items-end gap-6">
              <div>
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
              <div>
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

          {!nacitani && !chybaOvrRozsah && !neplatnyVstup ? (
            <p className="text-xs text-[var(--hut-muted)]">
              V úvaze: {kartyVeFiltru.length} karet
              {utocneRadky.length ? ` · ${utocneRadky.length} útočných kombinací` : ""}
              {obranneRadky.length ? ` · ${obranneRadky.length} obranných kombinací` : ""}
              {typBonusuFiltr !== "vse"
                ? ` · zobrazeno jen ${typBonusuFiltr}: útok ${utokZobrazeno.length}, obrana ${obranaZobrazeno.length}, brankáři ${golmaniZobrazeno.length}`
                : ` · výsledků: útok ${utokZobrazeno.length}, obrana ${obranaZobrazeno.length}, brankáři ${golmaniZobrazeno.length}`}
            </p>
          ) : null}

          <section>
            <h3 className="text-lg font-medium text-white">Útočné formace (LK · C · PK)</h3>
            {!utocneRadky.length && !loadingKomb ? (
              <p className="mt-2 text-sm text-[var(--hut-muted)]">
                Žádná kompletní útočná kombinace v databázi — doplní ji správce v Nastavení bonusů.
              </p>
            ) : null}
            {vysledkyUtok.length === 0 && utocneRadky.length > 0 && !chybaOvrRozsah && !neplatnyVstup ? (
              <p className="mt-2 text-sm text-[var(--hut-muted)]">
                Žádná trojice nepokrývá všechny tři symboly kombinace na pozicích LK/C/PK při zvolených filtrech.
              </p>
            ) : null}
            {vysledkyUtok.length > 0 && utokZobrazeno.length === 0 && typBonusuFiltr !== "vse" ? (
              <p className="mt-2 text-sm text-[var(--hut-muted)]">
                Po zapnutí filtru „{typBonusuFiltr}“ nezůstala žádná útočná sestava — zkus „Vše“ nebo jiný typ.
              </p>
            ) : null}
            <ul className="mt-4 space-y-4">
              {utokZobrazeno.map((v, idx) => {
                const sym = prirazeniSymboluUtok(v.lk, v.c, v.pk, v.kombinace, narodnostiVolby);
                const celkovyPlat = soucetPlatuKaret([v.lk, v.c, v.pk]);
                return (
                  <li
                    key={`${v.kombinace.id}-${v.lk.id}-${v.c.id}-${v.pk.id}-${idx}`}
                    className="rounded-xl border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]/50 p-4"
                  >
                    <HlavickaVysledkuKombinace
                      r={v.kombinace}
                      parametryPocet={3}
                      narodnostiVolby={narodnostiVolby}
                      celkovyPlat={celkovyPlat}
                    />
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
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-medium text-white">Obranné dvojice (LO · PO)</h3>
            {!obranneRadky.length && !loadingKomb ? (
              <p className="mt-2 text-sm text-[var(--hut-muted)]">
                Žádná kompletní obranná kombinace v databázi.
              </p>
            ) : null}
            {vysledkyObrana.length === 0 && obranneRadky.length > 0 && !chybaOvrRozsah && !neplatnyVstup ? (
              <p className="mt-2 text-sm text-[var(--hut-muted)]">
                Žádná dvojice LO+PO nepokrývá oba symboly kombinace při zvolených filtrech.
              </p>
            ) : null}
            {vysledkyObrana.length > 0 && obranaZobrazeno.length === 0 && typBonusuFiltr !== "vse" ? (
              <p className="mt-2 text-sm text-[var(--hut-muted)]">
                Pro typ „{typBonusuFiltr}“ žádná obranná dvojice.
              </p>
            ) : null}
            <ul className="mt-4 space-y-4">
              {obranaZobrazeno.map((v, idx) => {
                const sym = prirazeniSymboluDvojice(v.a, v.b, v.kombinace, narodnostiVolby);
                const celkovyPlat = soucetPlatuKaret([v.a, v.b]);
                return (
                  <li
                    key={`${v.kombinace.id}-${v.a.id}-${v.b.id}-${idx}`}
                    className="rounded-xl border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]/50 p-4"
                  >
                    <HlavickaVysledkuKombinace
                      r={v.kombinace}
                      parametryPocet={2}
                      narodnostiVolby={narodnostiVolby}
                      celkovyPlat={celkovyPlat}
                    />
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:items-stretch">
                      <BunkaHrace
                        k={v.a}
                        role="LO"
                        narodnostiVolby={narodnostiVolby}
                        symbolParam={sym?.[0]}
                      />
                      <BunkaHrace
                        k={v.b}
                        role="PO"
                        narodnostiVolby={narodnostiVolby}
                        symbolParam={sym?.[1]}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-medium text-white">Brankářské dvojice (G · G)</h3>
            <p className="mt-1 text-xs text-[var(--hut-muted)]">
              Stejné 2-parametrové kombinace jako u obrany; oba symboly lze přiřadit ke dvěma brankářům v
              libovolném pořadí (G1/G2 jsou jen pořadí v seznamu karet).
            </p>
            {vysledkyGolmani.length === 0 && obranneRadky.length > 0 && !chybaOvrRozsah && !neplatnyVstup ? (
              <p className="mt-2 text-sm text-[var(--hut-muted)]">
                Žádná dvojice brankářů nepokrývá oba symboly kombinace při zvolených filtrech.
              </p>
            ) : null}
            {vysledkyGolmani.length > 0 && golmaniZobrazeno.length === 0 && typBonusuFiltr !== "vse" ? (
              <p className="mt-2 text-sm text-[var(--hut-muted)]">
                Pro typ „{typBonusuFiltr}“ žádná brankářská dvojice.
              </p>
            ) : null}
            <ul className="mt-4 space-y-4">
              {golmaniZobrazeno.map((v, idx) => {
                const sym = prirazeniSymboluDvojice(v.a, v.b, v.kombinace, narodnostiVolby);
                const celkovyPlat = soucetPlatuKaret([v.a, v.b]);
                return (
                  <li
                    key={`${v.kombinace.id}-${v.a.id}-${v.b.id}-${idx}`}
                    className="rounded-xl border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]/50 p-4"
                  >
                    <HlavickaVysledkuKombinace
                      r={v.kombinace}
                      parametryPocet={2}
                      narodnostiVolby={narodnostiVolby}
                      celkovyPlat={celkovyPlat}
                    />
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:items-stretch">
                      <BunkaHrace
                        k={v.a}
                        role="G1"
                        narodnostiVolby={narodnostiVolby}
                        symbolParam={sym?.[0]}
                      />
                      <BunkaHrace
                        k={v.b}
                        role="G2"
                        narodnostiVolby={narodnostiVolby}
                        symbolParam={sym?.[1]}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
