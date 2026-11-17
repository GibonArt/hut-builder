"use client";

import { useEffect, useMemo, useRef, useState, startTransition } from "react";
import { useAuth } from "@/components/AuthProvider";
import { FloatingZpetNahoru } from "@/components/FloatingZpetNahoru";
import { HutShell } from "@/components/HutShell";
import { useSezona } from "@/components/SezonaProvider";
import { TypKartyMiniLogo } from "@/components/TypKartyIkona";
import { TymLogo } from "@/components/TymLogo";
import { TypKartyMetaOptsProvider } from "@/components/TypKartyMetaOptsContext";
import { useTypyKaret } from "@/components/TypyKaretProvider";
import {
  nactiBonusKombinaceSdilene,
  formatujBonusVRadkuNahled,
  type BonusKombinaceParametr,
  type RadekBonusKombinaceUi,
} from "@/lib/bonusKombinaceDb";
import { nactiKartyUzivatele } from "@/lib/cardsDb";
import {
  hledejDoporuceneFormace,
  slotyDoporuceni,
  type DruhDoporuceneFormace,
  type ProfilKartyKSehnani,
  type SkupinaDoporuceni,
  type SlotDoporuceni,
} from "@/lib/doporuceneFormace";
import { HUT_FORM_PAGE_BG } from "@/lib/hutFormBackground";
import type { NajdiMetaTypuKartyOpts } from "@/lib/hutdbTypKaret";
import { kodNarodnostiPodleLabelu, vlajkaZeme, vsechnyNarodnostiCS } from "@/lib/narodnosti";
import { formatovatPlatVMil } from "@/lib/platMiliony";
import { ceskaZpravaAuthNeboDb } from "@/lib/supabaseChybyCs";
import { urlLogaTymu } from "@/lib/tymLoga";
import type { HutCard } from "@/types";

const NA_STRANKU = 12;

const btnHledatClass =
  "min-h-12 touch-manipulation rounded-full border border-[var(--hut-lime)]/55 bg-[var(--hut-lime)]/15 px-6 py-3 text-sm font-semibold text-[var(--hut-lime)] shadow-sm transition-colors hover:bg-[var(--hut-lime)]/25 disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-0 sm:py-2.5";

const pillClass = (aktivni: boolean) =>
  [
    "min-h-11 touch-manipulation rounded-full border px-3 py-2 text-xs font-semibold transition-colors sm:min-h-0 sm:py-1.5",
    aktivni
      ? "border-[var(--hut-focus)]/60 bg-[var(--hut-focus)]/15 text-white"
      : "border-[var(--hut-border)] text-[var(--hut-muted)] hover:border-zinc-500 hover:text-zinc-200",
  ].join(" ");

type DruhFiltr = "vse" | DruhDoporuceneFormace;
type ChybiFiltr = "vse" | "1" | "2";

function sklonuj(n: number, jedna: string, dve: string, pet: string): string {
  if (n === 1) return jedna;
  if (n >= 2 && n <= 4) return dve;
  return pet;
}

function nazevDruhu(d: DruhDoporuceneFormace): string {
  switch (d) {
    case "utok":
      return "Útok";
    case "obrana":
      return "Obrana";
    case "golmani":
      return "Brankáři";
  }
}

function formatujSoucet(typ: SkupinaDoporuceni["bonusy"][number]["typ"], hodnota: number): string {
  switch (typ) {
    case "PLAT":
      return `${hodnota} MIL. $ PLAT`;
    case "BS":
      return `${hodnota} BS`;
    case "CLK":
      return `${hodnota} CLK`;
  }
}

function ParamIkona({
  p,
  narodnosti,
}: {
  p: BonusKombinaceParametr;
  narodnosti: ReturnType<typeof vsechnyNarodnostiCS>;
}) {
  switch (p.typ) {
    case "narodnost": {
      const label = narodnosti.find((v) => v.code === p.narodnostKod)?.label ?? p.narodnostKod;
      return (
        <span title={label} className="text-lg leading-none">
          {vlajkaZeme(p.narodnostKod)}
        </span>
      );
    }
    case "tym":
      return (
        <TymLogo
          url={urlLogaTymu(p.tym, p.liga)}
          nazevTymu={p.tym}
          size={18}
          className="rounded-sm"
        />
      );
    case "typ_karty":
      if (p.typKarty.trim() === "*") {
        return (
          <span
            className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-sm border border-zinc-500/50 px-1 font-mono text-[10px] text-zinc-300"
            title="Libovolný typ karty"
          >
            ∗
          </span>
        );
      }
      return <TypKartyMiniLogo ulozeno={p.typKarty} velikost="seznam" bezOkraje />;
  }
}

function NahledBonusu({
  r,
  pocet,
  narodnosti,
}: {
  r: RadekBonusKombinaceUi;
  pocet: 2 | 3;
  narodnosti: ReturnType<typeof vsechnyNarodnostiCS>;
}) {
  const params = pocet === 2 ? [r.param1, r.param2] : [r.param1, r.param2, r.param3];
  return (
    <span className="inline-flex flex-wrap items-center gap-1 text-[var(--hut-muted)]">
      {params.map((p, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 ? <span aria-hidden>+</span> : null}
          <ParamIkona p={p} narodnosti={narodnosti} />
        </span>
      ))}
      <span aria-hidden>=</span>
      <span className="text-xs font-semibold text-white">{formatujBonusVRadkuNahled(r)}</span>
    </span>
  );
}

function popisProfilu(
  profil: ProfilKartyKSehnani,
  narodnosti: ReturnType<typeof vsechnyNarodnostiCS>,
): string {
  return profil.pozadavky
    .map((p) => {
      switch (p.typ) {
        case "narodnost":
          return narodnosti.find((v) => v.code === p.narodnostKod)?.label ?? p.narodnostKod;
        case "tym":
          return p.tym;
        case "typ_karty":
          return p.typKarty.trim() === "*" ? "libovolný typ" : p.typKarty;
      }
    })
    .join(" · ");
}

function BunkaVlastnena({
  k,
  role,
  narodnosti,
}: {
  k: HutCard;
  role: string;
  narodnosti: ReturnType<typeof vsechnyNarodnostiCS>;
}) {
  const kodNar = kodNarodnostiPodleLabelu(k.narodnost, narodnosti);
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5 rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] px-2 py-2 sm:gap-2">
      <span className="w-6 shrink-0 text-center font-mono text-[10px] font-semibold text-[var(--hut-lime)]">
        {role}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1" aria-hidden>
        <span className="text-sm leading-none" title={k.narodnost}>
          {kodNar ? vlajkaZeme(kodNar) : "—"}
        </span>
        <TymLogo url={urlLogaTymu(k.tym, k.liga)} nazevTymu={k.tym} size={16} className="rounded-sm" />
        <TypKartyMiniLogo ulozeno={k.typKarty} velikost="seznam" bezOkraje />
      </span>
      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{k.jmeno}</p>
      <span className="shrink-0 text-[10px] tabular-nums text-zinc-300">OVR {k.ovr}</span>
    </div>
  );
}

function BunkaSehnat({
  slot,
  narodnosti,
}: {
  slot: Extract<SlotDoporuceni, { druh: "sehnat" }>;
  narodnosti: ReturnType<typeof vsechnyNarodnostiCS>;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-amber-400/50 bg-amber-950/35 px-2.5 py-2">
      <div className="flex items-center gap-2">
        <span className="w-6 shrink-0 text-center font-mono text-[10px] font-semibold text-[var(--hut-lime)]">
          {slot.role}
        </span>
        <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
          Sehnat
        </span>
      </div>
      <p className="text-[11px] leading-snug text-amber-50/90">
        Karta, která zároveň sedí na:
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {slot.profil.pozadavky.map((p, i) => (
          <span key={i} className="inline-flex items-center gap-1">
            {i > 0 ? (
              <span className="text-[10px] font-semibold text-amber-200/80" aria-hidden>
                +
              </span>
            ) : null}
            <ParamIkona p={p} narodnosti={narodnosti} />
          </span>
        ))}
      </div>
      <p className="text-[11px] text-amber-100/80">{popisProfilu(slot.profil, narodnosti)}</p>
    </div>
  );
}

function BunkaSlotu({
  slot,
  narodnosti,
}: {
  slot: SlotDoporuceni;
  narodnosti: ReturnType<typeof vsechnyNarodnostiCS>;
}) {
  if (slot.druh === "vlastnena") {
    return <BunkaVlastnena k={slot.karta} role={slot.role} narodnosti={narodnosti} />;
  }
  return <BunkaSehnat slot={slot} narodnosti={narodnosti} />;
}

export function DoporuceneFormace() {
  const { user, session, loading: authLoading } = useAuth();
  const { supabase, cesta } = useSezona();
  const narodnosti = useMemo(() => vsechnyNarodnostiCS(), []);
  const { typyKaret, aliasMapZBaze } = useTypyKaret();
  const typKartyMetaOpts = useMemo<NajdiMetaTypuKartyOpts>(
    () => ({ radky: typyKaret, aliasMapZBaze }),
    [typyKaret, aliasMapZBaze],
  );

  const [karty, setKarty] = useState<HutCard[]>([]);
  const [utocneRadky, setUtocneRadky] = useState<RadekBonusKombinaceUi[]>([]);
  const [obranneRadky, setObranneRadky] = useState<RadekBonusKombinaceUi[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [chybaDat, setChybaDat] = useState<string | null>(null);

  const [maxChybi, setMaxChybi] = useState<1 | 2>(2);
  const [druhFiltr, setDruhFiltr] = useState<DruhFiltr>("vse");
  const [chybiFiltr, setChybiFiltr] = useState<ChybiFiltr>("vse");

  const [vysledky, setVysledky] = useState<SkupinaDoporuceni[]>([]);
  const [hledam, setHledam] = useState(false);
  const [progress, setProgress] = useState("");
  const [chybaVypoctu, setChybaVypoctu] = useState<string | null>(null);
  const [hledaniProbehlo, setHledaniProbehlo] = useState(false);
  const [stranka, setStranka] = useState(0);
  const [varianty, setVarianty] = useState<Record<string, number>>({});
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!user?.id) {
      startTransition(() => {
        setKarty([]);
        setLoadingData(false);
        setChybaDat(null);
      });
      return;
    }
    let zruseno = false;
    startTransition(() => {
      setLoadingData(true);
      setChybaDat(null);
    });
    void nactiKartyUzivatele(supabase, user.id).then(({ data, error }) => {
      if (zruseno) return;
      startTransition(() => {
        setLoadingData(false);
        if (error) {
          setChybaDat(ceskaZpravaAuthNeboDb(error.message));
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
    if (authLoading) return;
    if (!user || !session) {
      startTransition(() => {
        setUtocneRadky([]);
        setObranneRadky([]);
      });
      return;
    }
    let zruseno = false;
    void (async () => {
      const { utocna, obranna, error } = await nactiBonusKombinaceSdilene(supabase);
      if (zruseno) return;
      if (error) {
        startTransition(() => {
          setChybaDat((prev) => prev ?? ceskaZpravaAuthNeboDb(error.message));
          setUtocneRadky([]);
          setObranneRadky([]);
        });
        return;
      }
      startTransition(() => {
        setUtocneRadky(utocna);
        setObranneRadky(obranna);
      });
    })();
    return () => {
      zruseno = true;
    };
  }, [supabase, authLoading, user, session]);

  const aktivniKarty = useMemo(() => karty.filter((k) => !k.prodano), [karty]);

  const zobrazene = useMemo(() => {
    return vysledky.filter((v) => {
      if (druhFiltr !== "vse" && v.druh !== druhFiltr) return false;
      if (chybiFiltr === "1" && v.pocetChybi !== 1) return false;
      if (chybiFiltr === "2" && v.pocetChybi !== 2) return false;
      return true;
    });
  }, [vysledky, druhFiltr, chybiFiltr]);

  const pocetStranek = Math.max(1, Math.ceil(zobrazene.length / NA_STRANKU));
  const strankaBezpecna = Math.min(stranka, pocetStranek - 1);
  const radkyStranky = zobrazene.slice(
    strankaBezpecna * NA_STRANKU,
    strankaBezpecna * NA_STRANKU + NA_STRANKU,
  );

  async function spustitHledani() {
    if (!user || hledam) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setHledam(true);
    setChybaVypoctu(null);
    setProgress("Připravuji…");
    try {
      const nalezene = await hledejDoporuceneFormace(
        {
          vlastnene: aktivniKarty,
          utocne: utocneRadky,
          obranne: obranneRadky,
          narodnosti,
          typKartyMeta: typKartyMetaOpts,
          maxChybejicich: maxChybi,
        },
        {
          signal: ac.signal,
          onProgress: (pct, text) => {
            if (ac.signal.aborted) return;
            setProgress(`${text} (${pct} %)`);
          },
        },
      );
      if (ac.signal.aborted) return;
      setVysledky(nalezene);
      setHledaniProbehlo(true);
      setStranka(0);
      setVarianty({});
      setProgress("");
    } catch (e) {
      if (ac.signal.aborted) return;
      setChybaVypoctu(e instanceof Error ? e.message : "Výpočet selhal.");
    } finally {
      if (abortRef.current === ac) setHledam(false);
    }
  }

  return (
    <HutShell
      headerSectionLabel="Doporučené formace"
      mainStyle={HUT_FORM_PAGE_BG}
      mainInnerClassName="relative z-0 mx-auto max-w-6xl"
    >
      <TypKartyMetaOptsProvider value={typKartyMetaOpts}>
        <div className="flex min-h-full w-full flex-col">
          <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Doporučené formace
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--hut-muted)] sm:text-[15px]">
            Z tvých aktivních karet a{" "}
            <span className="font-medium text-zinc-300">kombinací z Nastavení bonusů</span> (import z
            Hut Builderu) hledá skoro hotové formace s aspoň dvěma bonusy najednou. U každé ukáže, jakou
            kartu sehnat — podle symbolů chemie (národnost, tým, typ karty), ne podle katalogu komunity.
          </p>

          {!user && !authLoading ? (
            <p className="mt-6 text-sm text-[var(--hut-muted)]">
              Přihlas se pro načtení inventáře a doporučení.
            </p>
          ) : null}

          {chybaDat ? (
            <p className="mt-4 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-100" role="alert">
              {chybaDat}
            </p>
          ) : null}

          {user ? (
            <section className="mt-6 rounded-xl border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]/40 p-4">
              <h3 className="text-sm font-semibold text-white">Hledání</h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--hut-muted)]">
                Aktivních karet: {loadingData ? "…" : aktivniKarty.length}. Kombinací z DB: útok{" "}
                {utocneRadky.length}, obrana {obranneRadky.length}
                {utocneRadky.length === 0 && obranneRadky.length === 0
                  ? " — správce je načte v Nastavení bonusů z Hut Builderu."
                  : "."}{" "}
                Typy karet: {typyKaret.length}.
              </p>
              {utocneRadky.length === 0 && obranneRadky.length === 0 && !loadingData ? (
                <p className="mt-2 text-xs text-amber-200">
                  V databázi zatím nejsou kombinace. Po importu v{" "}
                  <a
                    href={cesta("/nastaveni-bonusu")}
                    className="font-medium text-[var(--hut-lime)] underline-offset-2 hover:underline"
                  >
                    Nastavení bonusů
                  </a>{" "}
                  se tu objeví doporučení.
                </p>
              ) : null}
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
                <div>
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[var(--hut-muted)]">
                    Chybějící karty
                  </span>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Kolik karet sehnat">
                    <button type="button" className={pillClass(maxChybi === 1)} onClick={() => setMaxChybi(1)}>
                      Jen 1
                    </button>
                    <button type="button" className={pillClass(maxChybi === 2)} onClick={() => setMaxChybi(2)}>
                      1 nebo 2
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  className={btnHledatClass}
                  disabled={
                    hledam ||
                    loadingData ||
                    authLoading ||
                    (utocneRadky.length === 0 && obranneRadky.length === 0)
                  }
                  onClick={() => void spustitHledani()}
                >
                  {hledam ? "Hledám…" : "Hledat doporučení"}
                </button>
              </div>
              {hledam && progress ? (
                <p className="mt-3 text-sm text-[var(--hut-muted)]" role="status">
                  {progress}
                </p>
              ) : null}
              {chybaVypoctu ? (
                <p className="mt-3 text-sm text-red-200" role="alert">
                  {chybaVypoctu}
                </p>
              ) : null}
            </section>
          ) : null}

          {hledaniProbehlo && !hledam ? (
            <section className="mt-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <h3 className="text-lg font-medium text-white">
                  {zobrazene.length}{" "}
                  {sklonuj(zobrazene.length, "formace", "formace", "formací")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["vse", "Vše"],
                      ["utok", "Útok"],
                      ["obrana", "Obrana"],
                      ["golmani", "Brankáři"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={pillClass(druhFiltr === id)}
                      onClick={() => {
                        setDruhFiltr(id);
                        setStranka(0);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                  <span className="mx-1 hidden h-6 w-px self-center bg-[var(--hut-border)] sm:inline" aria-hidden />
                  {(
                    [
                      ["vse", "1 i 2 karty"],
                      ["1", "Chybí 1"],
                      ["2", "Chybí 2"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={pillClass(chybiFiltr === id)}
                      onClick={() => {
                        setChybiFiltr(id);
                        setStranka(0);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {zobrazene.length === 0 ? (
                <p className="mt-4 text-sm leading-relaxed text-[var(--hut-muted)]">
                  Žádná skoro hotová formace s alespoň dvěma bonusy. Zkus povolit dvě chybějící karty, nebo
                  doplnit inventář / aktualizovat kombinace v Nastavení bonusů.
                </p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {radkyStranky.map((skupina) => {
                    const idx = Math.min(
                      varianty[skupina.klic] ?? 0,
                      skupina.moznosti.length - 1,
                    );
                    const moznost = skupina.moznosti[idx] ?? skupina.moznosti[0]!;
                    const sloty = slotyDoporuceni(skupina.druh, skupina.vlastnene, moznost.karty);
                    const platVlastnenych = skupina.vlastnene.reduce((s, k) => s + k.plat, 0);
                    const ovrVlastnenych = skupina.vlastnene.reduce((s, k) => s + k.ovr, 0);
                    const parametryPocet: 2 | 3 = skupina.druh === "utok" ? 3 : 2;
                    const soucty = new Map<string, number>();
                    for (const b of skupina.bonusy) {
                      soucty.set(b.typ, (soucty.get(b.typ) ?? 0) + b.hodnota);
                    }
                    return (
                      <li
                        key={skupina.klic}
                        className="rounded-xl border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]/50 p-3 sm:p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--hut-muted)]">
                              {nazevDruhu(skupina.druh)} · chybí{" "}
                              {skupina.pocetChybi === 1 ? "1 karta" : "2 karty"} ·{" "}
                              {skupina.pocetBonusu}{" "}
                              {sklonuj(skupina.pocetBonusu, "bonus", "bonusy", "bonusů")}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                              {[...soucty.entries()].map(([typ, hodnota], i) => (
                                <span key={typ} className="contents">
                                  {i > 0 ? (
                                    <span className="text-[var(--hut-muted)]" aria-hidden>
                                      ·
                                    </span>
                                  ) : null}
                                  <span className="text-sm font-semibold tabular-nums text-[var(--hut-lime)]">
                                    {formatujSoucet(
                                      typ as SkupinaDoporuceni["bonusy"][number]["typ"],
                                      hodnota,
                                    )}
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="shrink-0 text-left sm:text-right">
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--hut-muted)]">
                              Tvoje karty · OVR {ovrVlastnenych} · {formatovatPlatVMil(platVlastnenych)}
                            </div>
                          </div>
                        </div>

                        <ul className="mt-3 space-y-1.5">
                          {skupina.bonusy.map((b) => (
                            <li key={b.klic} className="flex flex-wrap items-center gap-2 text-[11px]">
                              <span className="font-mono text-[10px] font-semibold text-amber-200">
                                {b.typ}
                              </span>
                              <NahledBonusu
                                r={b.kombinace}
                                pocet={parametryPocet}
                                narodnosti={narodnosti}
                              />
                            </li>
                          ))}
                        </ul>

                        {skupina.moznosti.length > 1 ? (
                          <label className="mt-3 block text-xs text-[var(--hut-muted)]">
                            Varianta požadavku na kartu
                            <select
                              className="mt-1 block w-full max-w-xl rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] px-2 py-2 text-sm text-white"
                              value={idx}
                              onChange={(e) =>
                                setVarianty((prev) => ({
                                  ...prev,
                                  [skupina.klic]: Number(e.target.value),
                                }))
                              }
                            >
                              {skupina.moznosti.map((m, i) => (
                                <option key={m.karty.map((k) => k.klic).join("||")} value={i}>
                                  {m.karty.map((k) => popisProfilu(k, narodnosti)).join(" + ")}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}

                        <div
                          className={[
                            "mt-3 grid grid-cols-1 gap-2",
                            sloty.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
                          ].join(" ")}
                        >
                          {sloty.map((slot, i) => (
                            <BunkaSlotu
                              key={`${slot.role}-${i}-${slot.druh === "vlastnena" ? slot.karta.id : slot.profil.klic}`}
                              slot={slot}
                              narodnosti={narodnosti}
                            />
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {pocetStranek > 1 ? (
                <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                  <button
                    type="button"
                    className={pillClass(false)}
                    disabled={strankaBezpecna === 0}
                    onClick={() => setStranka((s) => Math.max(0, s - 1))}
                  >
                    Předchozí
                  </button>
                  <span className="tabular-nums text-[var(--hut-muted)]">
                    {strankaBezpecna + 1} / {pocetStranek}
                  </span>
                  <button
                    type="button"
                    className={pillClass(false)}
                    disabled={strankaBezpecna >= pocetStranek - 1}
                    onClick={() => setStranka((s) => s + 1)}
                  >
                    Další
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
        <FloatingZpetNahoru />
      </TypKartyMetaOptsProvider>
    </HutShell>
  );
}
