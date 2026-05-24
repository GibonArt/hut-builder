"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import type { Liga, TypKombinaceBonusu } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import { NarodnostVyber } from "@/components/NarodnostVyber";
import { TypKartyMiniLogo } from "@/components/TypKartyIkona";
import { TypKartyVyber } from "@/components/TypKartyVyber";
import { TymLogo } from "@/components/TymLogo";
import { TymHledacNapricLigami } from "@/components/TymHledacNapricLigami";
import { TymVyber } from "@/components/TymVyber";
import { HutShell } from "@/components/HutShell";
import { HUT_FORM_PAGE_BG } from "@/lib/hutFormBackground";
import { jeBonusAdmin } from "@/lib/bonusAdmin";
import {
  deduplikujPayloadBonusu,
  deduplikujRadkyBonusu,
  formatujBonusVRadkuNahled,
  jeKompletniParametr,
  jeKompletniRadek,
  jsouRadkyBonusuDuplicitni,
  migrujLegacyBonusTypyVSdileneTabulce,
  nactiBonusKombinaceSdilene,
  novyParametrPrazdny,
  novyRadekBonusu,
  parametryBonusuShodne,
  radkaZKopii,
  TYPY_BONUSU_KOMBINACE,
  ulozBonusKombinaciSdilenou,
  type BonusKombinaceParametr,
  type BonusKombinaceParametrTyp,
  type RadekBonusKombinaceUi,
  type TypBonusuKombinace,
} from "@/lib/bonusKombinaceDb";
import { createClient } from "@/lib/supabase/client";
import {
  LIGA_ZOBRAZENI,
  LIGY_V_PORADI,
  tymyProLigu,
} from "@/lib/tymyPodleLigy";
import {
  radkyZRadekHutbuilder,
  type HutbuilderImportedLine,
} from "@/lib/hutbuilderBonusImport";
import { TypKartyMetaOptsProvider } from "@/components/TypKartyMetaOptsContext";
import type { HutDbTypKarty, NajdiMetaTypuKartyOpts } from "@/lib/hutdbTypKaret";
import { vsechnyNarodnostiCS, vlajkaZeme } from "@/lib/narodnosti";
import { useMergedTypyKaret } from "@/hooks/useMergedTypyKaret";
import { urlLogaTymu } from "@/lib/tymLoga";

const labelClass = "mb-1.5 block text-xs font-medium text-[var(--hut-muted)]";

const selectClass =
  "box-border h-14 min-h-14 w-full cursor-pointer rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] px-3 py-0 text-sm text-white outline-none transition-[border-color,box-shadow] focus:border-[var(--hut-focus)]/70 focus:ring-2 focus:ring-[var(--hut-focus-ring)] lg:h-11 lg:min-h-11";

const DRUH_VOLBY: { id: BonusKombinaceParametrTyp; label: string }[] = [
  { id: "narodnost", label: "Národnost" },
  { id: "tym", label: "Tým" },
  { id: "typ_karty", label: "Typ karty" },
];

type Payload = {
  utocna: RadekBonusKombinaceUi[];
  obranna: RadekBonusKombinaceUi[];
};

function jeOpakovatelnaChybaFetch(e: unknown): boolean {
  if (e instanceof DOMException && e.name === "AbortError") return false;
  if (e instanceof TypeError) return true;
  const msg = String(e instanceof Error ? e.message : e);
  return /failed to fetch|network|timeout|502|503|504|hut builder neodpověděl/i.test(
    msg,
  );
}

async function fetchJsonHutbuilderAdminPage(
  url: string,
  sig: AbortSignal,
  onRetry?: (pokus: number, max: number) => void,
): Promise<Record<string, unknown>> {
  const maxPokusu = 4;
  let posledni: unknown;
  for (let pokus = 1; pokus <= maxPokusu; pokus++) {
    try {
      const res = await fetch(url, { signal: sig, cache: "no-store" });
      const rawText = await res.text();
      let chunk: Record<string, unknown>;
      try {
        chunk = JSON.parse(rawText) as Record<string, unknown>;
      } catch {
        throw new Error(rawText.slice(0, 280));
      }
      if (!res.ok) {
        throw new Error(String(chunk.error ?? rawText.slice(0, 280)));
      }
      return chunk;
    } catch (e) {
      posledni = e;
      if (sig.aborted) throw e;
      const znovu = pokus < maxPokusu && jeOpakovatelnaChybaFetch(e);
      if (!znovu) throw e;
      onRetry?.(pokus + 1, maxPokusu);
      await new Promise((r) => setTimeout(r, 1800 * pokus));
    }
  }
  throw posledni instanceof Error ? posledni : new Error(String(posledni));
}

function prazdnyFiltrNahled(): BonusKombinaceParametr {
  return novyParametrPrazdny("narodnost");
}

function parametryRadku(
  r: RadekBonusKombinaceUi,
  obor: TypKombinaceBonusu,
): BonusKombinaceParametr[] {
  return obor === "obranna"
    ? [r.param1, r.param2]
    : [r.param1, r.param2, r.param3];
}

/** Řádek projde, pokud zadaná hodnota sedí na libovolné pozici (1., 2. nebo 3. parametr). */
function radekSplnujeVyhledaniKdekoli(
  r: RadekBonusKombinaceUi,
  hledany: BonusKombinaceParametr,
  obor: TypKombinaceBonusu,
): boolean {
  if (!jeKompletniParametr(hledany)) return true;
  return parametryRadku(r, obor).some((p) => parametryBonusuShodne(p, hledany));
}

/** Stejná logika jako náhled pod uloženými řádky (typ bonusu PLAT/CLK/BS + volitelné vyhledávání). */
function radekJeVNahledu(
  r: RadekBonusKombinaceUi,
  nahledFiltrBonusTyp: "vse" | TypBonusuKombinace,
  nahledFiltrParamAplikovany: boolean,
  nahledFiltrVyhledani: BonusKombinaceParametr,
  obor: TypKombinaceBonusu,
): boolean {
  if (nahledFiltrBonusTyp !== "vse" && r.bonusTyp !== nahledFiltrBonusTyp) {
    return false;
  }
  if (
    nahledFiltrParamAplikovany &&
    !radekSplnujeVyhledaniKdekoli(r, nahledFiltrVyhledani, obor)
  ) {
    return false;
  }
  return true;
}

/** Náhled: nejvyšší bonus nahoře; bez vyplněné hodnoty až dole. */
function seradKombinacePodleBonusuDesc(
  radky: RadekBonusKombinaceUi[],
): RadekBonusKombinaceUi[] {
  return [...radky].sort((a, b) => {
    const va =
      a.bonusHodnota != null && Number.isFinite(a.bonusHodnota)
        ? a.bonusHodnota
        : Number.NEGATIVE_INFINITY;
    const vb =
      b.bonusHodnota != null && Number.isFinite(b.bonusHodnota)
        ? b.bonusHodnota
        : Number.NEGATIVE_INFINITY;
    if (vb !== va) return vb - va;
    return a.id.localeCompare(b.id);
  });
}

function nastavParametr(
  r: RadekBonusKombinaceUi,
  slot: 1 | 2 | 3,
  p: BonusKombinaceParametr,
): RadekBonusKombinaceUi {
  if (slot === 1) return { ...r, param1: p };
  if (slot === 2) return { ...r, param2: p };
  return { ...r, param3: p };
}

function parametrZRadek(r: RadekBonusKombinaceUi, slot: 1 | 2 | 3): BonusKombinaceParametr {
  if (slot === 1) return r.param1;
  if (slot === 2) return r.param2;
  return r.param3;
}

/** Společný tvar čtverce pro náhled uložené kombinace (vlajka / logo / typ karty). */
const SLOT_KOMBINACE_BOX =
  "h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]";

function SlotIkona({
  p,
  narodnostiVolby,
}: {
  p: BonusKombinaceParametr;
  narodnostiVolby: readonly { code: string; label: string }[];
}) {
  switch (p.typ) {
    case "narodnost": {
      const narLabel =
        narodnostiVolby.find((v) => v.code === p.narodnostKod)?.label ??
        p.narodnostKod;
      return (
        <span
          className={`flex ${SLOT_KOMBINACE_BOX} items-center justify-center text-2xl leading-none`}
          title={narLabel}
          role="img"
          aria-label={narLabel}
        >
          <span aria-hidden>{vlajkaZeme(p.narodnostKod)}</span>
        </span>
      );
    }
    case "tym":
      return (
        <span className={`block ${SLOT_KOMBINACE_BOX}`} title={p.tym || "Tým"}>
          <TymLogo
            url={p.tym ? urlLogaTymu(p.tym, p.liga) : null}
            nazevTymu={p.tym || "?"}
            fill
            className="p-1.5"
          />
        </span>
      );
    case "typ_karty":
      return <TypKartyMiniLogo ulozeno={p.typKarty} velikost="kombinace" />;
  }
}

const btnUpravitClass =
  "rounded-lg border border-zinc-500/45 bg-zinc-800/35 px-2.5 py-1.5 text-xs font-medium text-zinc-100 transition-colors hover:border-zinc-400/55 hover:bg-zinc-700/45";

const btnSmazatClass =
  "rounded-lg border border-red-500/35 bg-red-950/20 px-2.5 py-1.5 text-xs font-medium text-red-200 transition-colors hover:border-red-400/50 hover:bg-red-950/40";

function RadekKombinaceIkony({
  r,
  narodnostiVolby,
  parametryPocet = 3,
}: {
  r: RadekBonusKombinaceUi;
  narodnostiVolby: readonly { code: string; label: string }[];
  /** Obranná kombinace = jen 2 parametry. */
  parametryPocet?: 2 | 3;
}) {
  const tri =
    parametryPocet === 2
      ? [r.param1, r.param2]
      : [r.param1, r.param2, r.param3];
  const bonusText = formatujBonusVRadkuNahled(r);
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-2.5">
      {tri.map((p, i) => (
        <span key={i} className="contents">
          {i > 0 ? (
            <span className="shrink-0 text-lg font-semibold text-[var(--hut-muted)]" aria-hidden>
              +
            </span>
          ) : null}
          <SlotIkona p={p} narodnostiVolby={narodnostiVolby} />
        </span>
      ))}
      <span className="shrink-0 text-lg font-semibold text-[var(--hut-muted)]" aria-hidden>
        =
      </span>
      <span
        className="inline-flex min-h-11 min-w-0 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] px-2.5 text-sm font-semibold tabular-nums tracking-tight text-white"
        title={`Bonus: ${bonusText}`}
      >
        {bonusText}
      </span>
    </div>
  );
}

function SloupecParametru({
  slot,
  draftId,
  param,
  narodnostiVolby,
  hutdbTypyKaret,
  ukladam,
  onZmenDruh,
  onZmenParam,
  popisekSlotu,
}: {
  slot: 1 | 2 | 3;
  draftId: string;
  param: BonusKombinaceParametr;
  narodnostiVolby: readonly { code: string; label: string }[];
  hutdbTypyKaret: HutDbTypKarty[];
  ukladam: boolean;
  onZmenDruh: (druh: BonusKombinaceParametrTyp) => void;
  onZmenParam: (p: BonusKombinaceParametr) => void;
  /** Vlastní nadpis sloupce (např. vyhledávání bez čísla pozice). */
  popisekSlotu?: string;
}) {
  const tymy = param.typ === "tym" ? tymyProLigu(param.liga) : [];

  return (
    <div className="min-w-0 rounded-lg border border-[var(--hut-border)]/80 bg-[var(--hut-bg-elevated)]/25 p-3 sm:p-4 lg:p-2.5">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--hut-lime)] lg:mb-1.5">
        {popisekSlotu ?? `Parametr ${slot}`}
      </p>
      <p className={labelClass}>Druh hodnoty</p>
      <div
        className="mt-1.5 flex flex-wrap gap-1.5 lg:gap-1"
        role="group"
        aria-label={`Parametr ${slot} — druh`}
      >
        {DRUH_VOLBY.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={ukladam}
            onClick={() => onZmenDruh(opt.id)}
            className={[
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:text-[13px] lg:px-2 lg:py-1 lg:text-xs",
              param.typ === opt.id
                ? "border-[var(--hut-focus)]/60 bg-[var(--hut-focus)]/15 text-white"
                : "border-[var(--hut-border)] text-[var(--hut-muted)] hover:border-zinc-500 hover:text-zinc-200",
            ].join(" ")}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mt-4 lg:mt-2.5">
        {param.typ === "narodnost" ? (
          <>
            <label htmlFor={`nb-s${slot}-nar-${draftId}`} className={labelClass}>
              Národnost
            </label>
            <div className="mt-1">
              <NarodnostVyber
                id={`nb-s${slot}-nar-${draftId}`}
                volby={narodnostiVolby}
                value={param.narodnostKod}
                onChange={(kod) => onZmenParam({ typ: "narodnost", narodnostKod: kod })}
                disabled={narodnostiVolby.length === 0 || ukladam}
                triggerHeight="kompaktniLg"
              />
            </div>
          </>
        ) : null}

        {param.typ === "tym" ? (
          <div className="space-y-3 lg:space-y-2">
            <div>
              <label htmlFor={`nb-s${slot}-liga-${draftId}`} className={labelClass}>
                Liga
              </label>
              <div className="mt-1">
                <select
                  id={`nb-s${slot}-liga-${draftId}`}
                  className={selectClass}
                  value={param.liga}
                  disabled={ukladam}
                  onChange={(e) => {
                    const nova = e.target.value as Liga;
                    const tymyNove = tymyProLigu(nova);
                    const tymNovy =
                      param.tym && tymyNove.includes(param.tym) ? param.tym : "";
                    onZmenParam({ typ: "tym", liga: nova, tym: tymNovy });
                  }}
                >
                  {LIGY_V_PORADI.map((l) => (
                    <option key={l} value={l}>
                      {LIGA_ZOBRAZENI[l]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor={`nb-s${slot}-tym-${draftId}`} className={labelClass}>
                Tým
              </label>
              <div className="mt-1">
                <TymVyber
                  key={`${draftId}-s${slot}-${param.liga}`}
                  id={`nb-s${slot}-tym-${draftId}`}
                  liga={param.liga}
                  tymy={tymy}
                  value={param.tym}
                  disabled={ukladam}
                  onChange={(tym) => onZmenParam({ typ: "tym", liga: param.liga, tym })}
                  triggerHeight="kompaktniLg"
                />
              </div>
            </div>
            <div>
              <label htmlFor={`nb-s${slot}-tym-hledat-${draftId}`} className={labelClass}>
                Najít tým napříč ligami
              </label>
              <p className="mb-1.5 text-[11px] leading-snug text-[var(--hut-muted)]/85">
                Nevíš, ve které lize tým je? Zadej část názvu — po výběru se nastaví liga i tým.
              </p>
              <TymHledacNapricLigami
                id={`nb-s${slot}-tym-hledat-${draftId}`}
                disabled={ukladam}
                onVybrat={(liga, tym) => onZmenParam({ typ: "tym", liga, tym })}
                variant="kompaktniLg"
              />
            </div>
          </div>
        ) : null}

        {param.typ === "typ_karty" ? (
          <>
            <label htmlFor={`nb-s${slot}-typ-${draftId}`} className={labelClass}>
              Typ karty
            </label>
            <div className="mt-1">
              <TypKartyVyber
                id={`nb-s${slot}-typ-${draftId}`}
                typy={hutdbTypyKaret}
                value={param.typKarty}
                disabled={ukladam}
                onChange={(v) => onZmenParam({ typ: "typ_karty", typKarty: v })}
                triggerHeight="kompaktniLg"
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function SloupecBonusu({
  draftId,
  bonusHodnota,
  bonusTyp,
  ukladam,
  onZmenHodnotu,
  onZmenTyp,
}: {
  draftId: string;
  bonusHodnota: number | null;
  bonusTyp: TypBonusuKombinace;
  ukladam: boolean;
  onZmenHodnotu: (v: number | null) => void;
  onZmenTyp: (v: TypBonusuKombinace) => void;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--hut-border)]/80 bg-[var(--hut-bg-elevated)]/25 p-3 sm:p-4 lg:p-2.5">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--hut-lime)] lg:mb-1.5">
        Bonus
      </p>
      <p className={`${labelClass} mb-2 lg:mb-1.5`}>Hodnota a typ bonusu</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3 lg:gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={`nb-bonus-hod-${draftId}`} className={labelClass}>
            Hodnota
          </label>
          <input
            id={`nb-bonus-hod-${draftId}`}
            type="number"
            step="any"
            inputMode="decimal"
            disabled={ukladam}
            value={bonusHodnota === null ? "" : bonusHodnota}
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (raw === "" || raw === "-") {
                onZmenHodnotu(null);
                return;
              }
              const n = Number(raw);
              onZmenHodnotu(Number.isFinite(n) ? n : null);
            }}
            className={`mt-1 ${selectClass} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
          />
        </div>
        <div className="min-w-0 shrink-0 sm:w-28">
          <label htmlFor={`nb-bonus-typ-${draftId}`} className={labelClass}>
            Typ
          </label>
          <select
            id={`nb-bonus-typ-${draftId}`}
            className={`mt-1 ${selectClass}`}
            value={bonusTyp}
            disabled={ukladam}
            onChange={(e) => onZmenTyp(e.target.value as TypBonusuKombinace)}
          >
            {TYPY_BONUSU_KOMBINACE.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export function NastaveniBonusu() {
  const { user, loading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const narodnostiVolby = useMemo(() => vsechnyNarodnostiCS(), []);
  const { typyKaret: hutdbTypyKaret, aliasMapZBaze, refreshDynamic } = useMergedTypyKaret();
  const typKartyMetaOpts = useMemo<NajdiMetaTypuKartyOpts>(
    () => ({ radky: hutdbTypyKaret, aliasMapZBaze }),
    [hutdbTypyKaret, aliasMapZBaze],
  );

  const [typKombinace, setTypKombinace] = useState<TypKombinaceBonusu>("utocna");
  const [draft, setDraft] = useState<RadekBonusKombinaceUi>(() => novyRadekBonusu());
  const [payload, setPayload] = useState<Payload>({ utocna: [], obranna: [] });
  const [nacitamNastaveni, setNacitamNastaveni] = useState(false);
  const [nastaveniChyba, setNastaveniChyba] = useState<string | null>(null);
  const [ukladam, setUkladam] = useState(false);
  const [ulozChyba, setUlozChyba] = useState<string | null>(null);
  const [ulozenoOk, setUlozenoOk] = useState(false);
  const [vyberChyba, setVyberChyba] = useState<string | null>(null);
  /** Rychlý filtr náhledu uložených řádků podle typu bonusu (PLAT / CLK / BS). */
  const [nahledFiltrBonusTyp, setNahledFiltrBonusTyp] = useState<
    "vse" | TypBonusuKombinace
  >("vse");
  const [nahledFiltrVyhledani, setNahledFiltrVyhledani] = useState<BonusKombinaceParametr>(
    () => prazdnyFiltrNahled(),
  );
  const [nahledFiltrParamAplikovany, setNahledFiltrParamAplikovany] = useState(false);
  const [nahledFiltrChyba, setNahledFiltrChyba] = useState<string | null>(null);
  const [syncTypyBezi, setSyncTypyBezi] = useState(false);
  const [syncTypyChyba, setSyncTypyChyba] = useState<string | null>(null);
  const [syncTypyVysledek, setSyncTypyVysledek] = useState<string | null>(null);
  const [importHbBezi, setImportHbBezi] = useState(false);
  const [importHbChyba, setImportHbChyba] = useState<string | null>(null);
  const [importHbLog, setImportHbLog] = useState<string | null>(null);
  const importHbAbortRef = useRef<AbortController | null>(null);

  const pristup = jeBonusAdmin(user?.email);

  useEffect(() => {
    if (!user?.id || !pristup) {
      setNacitamNastaveni(false);
      return;
    }

    let zruseno = false;
    startTransition(() => {
      setNacitamNastaveni(true);
      setNastaveniChyba(null);
    });

    void (async () => {
      let utocna: RadekBonusKombinaceUi[] = [];
      let obranna: RadekBonusKombinaceUi[] = [];
      let loadError: string | null = null;

      const first = await nactiBonusKombinaceSdilene(supabase);
      if (first.error) {
        loadError = first.error.message;
      } else {
        utocna = first.utocna;
        obranna = first.obranna;
        if (user?.id) {
          const mig = await migrujLegacyBonusTypyVSdileneTabulce(supabase, user.id);
          if (mig.error) {
            loadError = mig.error.message;
          } else if (mig.provedeno) {
            const again = await nactiBonusKombinaceSdilene(supabase);
            if (again.error) {
              loadError = again.error.message;
            } else {
              utocna = again.utocna;
              obranna = again.obranna;
            }
          }
        }
      }

      if (zruseno) return;
      startTransition(() => {
        setNacitamNastaveni(false);
        if (loadError) {
          setNastaveniChyba(loadError);
          return;
        }
        setPayload({ utocna, obranna });
        setDraft(novyRadekBonusu());
      });
    })();

    return () => {
      zruseno = true;
    };
  }, [user?.id, pristup, supabase]);

  const zmenDruhSlotu = useCallback(
    (slot: 1 | 2 | 3, druh: BonusKombinaceParametrTyp) => {
      setDraft((d) =>
        nastavParametr(d, slot, novyParametrPrazdny(druh)),
      );
      setUlozenoOk(false);
      setVyberChyba(null);
    },
    [],
  );

  const zmenParamSlotu = useCallback((slot: 1 | 2 | 3, p: BonusKombinaceParametr) => {
    setDraft((d) => nastavParametr(d, slot, p));
    setUlozenoOk(false);
    setVyberChyba(null);
  }, []);

  const zmenBonusHodnotu = useCallback((v: number | null) => {
    setDraft((d) => ({ ...d, bonusHodnota: v }));
    setUlozenoOk(false);
    setVyberChyba(null);
  }, []);

  const zmenBonusTyp = useCallback((v: TypBonusuKombinace) => {
    setDraft((d) => ({ ...d, bonusTyp: v }));
    setUlozenoOk(false);
    setVyberChyba(null);
  }, []);

  const persistPayload = useCallback(
    async (next: Payload): Promise<{ error: string | null; ulozeno: Payload }> => {
      const deduped = deduplikujPayloadBonusu(next);
      if (!user?.id) return { error: "Nejsi přihlášen.", ulozeno: deduped };
      const u = await ulozBonusKombinaciSdilenou(
        supabase,
        user.id,
        "utocna",
        deduped.utocna,
      );
      if (u.error) return { error: u.error.message, ulozeno: deduped };
      const o = await ulozBonusKombinaciSdilenou(
        supabase,
        user.id,
        "obranna",
        deduped.obranna,
      );
      if (o.error) return { error: o.error.message, ulozeno: deduped };
      return { error: null, ulozeno: deduped };
    },
    [supabase, user?.id],
  );

  const synchronizujTypyKaretZHutbuilder = useCallback(async () => {
    setSyncTypyBezi(true);
    setSyncTypyChyba(null);
    setSyncTypyVysledek(null);
    setUlozChyba(null);
    try {
      const res = await fetch("/api/admin/sync-typy-karet", { method: "POST" });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        pocet?: number;
        novych_v_db?: number;
        aktualizovano?: number;
      };
      if (!res.ok) {
        setSyncTypyChyba(j.error ?? `HTTP ${res.status}`);
        return;
      }
      const pocet = j.pocet ?? 0;
      const novych = j.novych_v_db ?? 0;
      const upd = j.aktualizovano ?? 0;
      setSyncTypyVysledek(
        `Z Combo Finderu: ${pocet} typů. V databázi nových řádků: ${novych}, aktualizovaných (už byl stejný klíč hodnota_filtru): ${upd}.`,
      );
      await refreshDynamic();
      setUlozenoOk(true);
      setTimeout(() => setUlozenoOk(false), 4000);
    } catch (e) {
      setSyncTypyChyba(String(e instanceof Error ? e.message : e));
    } finally {
      setSyncTypyBezi(false);
    }
  }, [refreshDynamic]);

  const zrusImportHutbuilder = useCallback(() => {
    importHbAbortRef.current?.abort();
  }, []);

  const importujKombinaceZHutbuilder = useCallback(async () => {
    if (!user?.id) return;
    const ok = window.confirm(
      "Stáhnout předgenerované řádky z NHL HUT Builderu a připojit je ke sdíleným kombinacím?\n\n" +
        "• Útok / obrana / brankáři — sloty synergy: typ karty i tým (národnost zatím ne).\n" +
        "• Hut Builder SAL → PLAT, AP → BS, OVR → CLK.\n" +
        "• Duplicity se sloučí s už uloženými řádky.\n" +
        "• Může to trvat několik minut (sekvenční stahování stránek z Hut Builderu).\n" +
        "• Při timeoutu se stránka automaticky zkusí znovu (až 4×).\n" +
        "• Dva průchody Hut Builderu: výchozí žebříček (PLAT/BS) + režim „overall“ kvůli OVR → CLK.\n" +
        "• Jakmile v průchodu začne API opakovat jen duplicitní line_id, daný průchod u typu řady končí.",
    );
    if (!ok) return;

    importHbAbortRef.current?.abort();
    importHbAbortRef.current = new AbortController();
    const sig = importHbAbortRef.current.signal;

    setImportHbBezi(true);
    setImportHbChyba(null);
    setImportHbLog("Začínám…");
    setUlozChyba(null);
    setUlozenoOk(false);

    const noveUt: RadekBonusKombinaceUi[] = [];
    const noveOb: RadekBonusKombinaceUi[] = [];

    /** Každá stránka jde zvlášť — limit ~52 s kvůli reverse proxy (Synology/nginx ~60 s). */
    const PRUCHODY_IMPORTU: {
      optimizeFor: string | null;
      timeoutMs: number;
      popisek: string;
    }[] = [
      { optimizeFor: null, timeoutMs: 50_000, popisek: "žebříček" },
      { optimizeFor: "overall", timeoutMs: 50_000, popisek: "overall (CLK)" },
    ];

    try {
      for (const lt of ["forwards", "defense", "goalie"] as const) {
        for (const pr of PRUCHODY_IMPORTU) {
          let page = 1;
          let perPage = 20;
          const seenLineIds = new Set<number>();
          for (;;) {
            if (sig.aborted) {
              throw new DOMException("Zrušeno uživatelem.", "AbortError");
            }
            const paramOptimize =
              pr.optimizeFor === null
                ? ""
                : `&optimizeFor=${encodeURIComponent(pr.optimizeFor)}`;
            setImportHbLog(`${lt} — ${pr.popisek} — stránka ${page} (stahuji…)`);
            const chunk = await fetchJsonHutbuilderAdminPage(
              `/api/admin/hutbuilder-page?lineType=${encodeURIComponent(lt)}&page=${page}&timeoutMs=${pr.timeoutMs}${paramOptimize}`,
              sig,
              (pokus, max) => {
                setImportHbLog(
                  `${lt} — ${pr.popisek} — stránka ${page} — opakuji ${pokus}/${max}…`,
                );
              },
            );

            const lines = Array.isArray(chunk.lines) ? chunk.lines : [];
            if (lines.length === 0) break;

            if (typeof chunk.per_page === "number") perPage = chunk.per_page;

            /** Řádky bez nového line_id přeskočíme; když je celá stránka jen duplicity, API často pořád vrací „plnou“ stránku — bez ukončení by import běžel stovky requestů zbytečně (viz skript stahni-hutbuilder-kombinace.mjs). */
            let zpracovanoRadku = 0;
            for (const row of lines) {
              const line = row as { line_id?: number };
              const lid = line.line_id;
              if (lid != null && seenLineIds.has(lid)) continue;
              if (lid != null) seenLineIds.add(lid);
              zpracovanoRadku += 1;
              const { utocna: u, obranna: o } = radkyZRadekHutbuilder(
                row as HutbuilderImportedLine,
              );
              noveUt.push(...u);
              noveOb.push(...o);
            }

            setImportHbLog(
              `${lt} — ${pr.popisek} — stránka ${page} (${zpracovanoRadku} nových řádků API / ${seenLineIds.size} unikát. line_id v průchodu)`,
            );

            if (lines.length > 0 && zpracovanoRadku === 0) break;

            if (chunk.has_more === false) break;
            if (lines.length < perPage) break;
            page += 1;
            if (page > 650) break;
            await new Promise((r) => setTimeout(r, 280));
          }
        }
      }

      const merged: Payload = {
        utocna: deduplikujRadkyBonusu([...payload.utocna, ...noveUt], "utocna"),
        obranna: deduplikujRadkyBonusu([...payload.obranna, ...noveOb], "obranna"),
      };
      const deduped = deduplikujPayloadBonusu(merged);

      setImportHbLog(
        `Ukládám (${deduped.utocna.length} útok / ${deduped.obranna.length} obrana)…`,
      );
      setUkladam(true);
      const saveRes = await persistPayload(deduped);
      setUkladam(false);

      if (saveRes.error) {
        setImportHbChyba(saveRes.error);
        setImportHbLog(null);
        return;
      }
      setPayload(saveRes.ulozeno);
      setImportHbLog(
        `Hotovo — útok ${saveRes.ulozeno.utocna.length} řádků, obrana ${saveRes.ulozeno.obranna.length}.`,
      );
      setUlozenoOk(true);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setImportHbChyba("Import zrušen.");
      } else {
        setImportHbChyba(String(e instanceof Error ? e.message : e));
      }
      setImportHbLog(null);
    } finally {
      setImportHbBezi(false);
      importHbAbortRef.current = null;
    }
  }, [user?.id, payload, persistPayload]);

  const ulozKombinaci = useCallback(async () => {
    if (!user?.id) return;
    if (!jeKompletniRadek(draft, typKombinace)) {
      setVyberChyba(
        typKombinace === "obranna"
          ? "Vyplň oba parametry (národnost / tým / typ karty), zadej číselnou hodnotu bonusu a zvol typ PLAT, CLK nebo BS."
          : "Vyplň všechny tři parametry (národnost / tým / typ karty), zadej číselnou hodnotu bonusu a zvol typ PLAT, CLK nebo BS.",
      );
      return;
    }
    setVyberChyba(null);
    const kopieBase = radkaZKopii(draft);
    const kopie: RadekBonusKombinaceUi =
      typKombinace === "obranna"
        ? { ...kopieBase, param3: novyParametrPrazdny("narodnost") }
        : kopieBase;
    if (
      payload[typKombinace].some((r) => jsouRadkyBonusuDuplicitni(r, kopie, typKombinace))
    ) {
      setVyberChyba(
        "Tato kombinace už v seznamu je (stejné parametry, hodnota bonusu a typ PLAT / CLK / BS).",
      );
      return;
    }
    const newPayload: Payload = {
      ...payload,
      [typKombinace]: [...payload[typKombinace], kopie],
    };
    setUkladam(true);
    setUlozChyba(null);
    setUlozenoOk(false);
    const res = await persistPayload(newPayload);
    setUkladam(false);
    if (res.error) {
      setUlozChyba(res.error);
      return;
    }
    setPayload(res.ulozeno);
    setDraft(novyRadekBonusu());
    setUlozenoOk(true);
  }, [draft, typKombinace, payload, user?.id, persistPayload]);

  const vymazatFormularKombinace = useCallback(() => {
    setDraft(() => {
      const base = novyRadekBonusu();
      return typKombinace === "obranna"
        ? { ...base, param3: novyParametrPrazdny("narodnost") }
        : base;
    });
    setVyberChyba(null);
    setUlozChyba(null);
    setUlozenoOk(false);
  }, [typKombinace]);

  const odeberKombinaci = useCallback(
    async (typ: TypKombinaceBonusu, id: string) => {
      if (!user?.id) return;
      const newPayload: Payload = {
        ...payload,
        [typ]: payload[typ].filter((r) => r.id !== id),
      };
      setUkladam(true);
      setUlozChyba(null);
      setUlozenoOk(false);
      const res = await persistPayload(newPayload);
      setUkladam(false);
      if (res.error) {
        setUlozChyba(res.error);
        return;
      }
      setPayload(res.ulozeno);
      setUlozenoOk(true);
    },
    [payload, user?.id, persistPayload],
  );

  const zmenNahledFiltrDruh = useCallback((druh: BonusKombinaceParametrTyp) => {
    setNahledFiltrVyhledani(novyParametrPrazdny(druh));
    setNahledFiltrChyba(null);
  }, []);

  const zmenNahledFiltrParam = useCallback((p: BonusKombinaceParametr) => {
    setNahledFiltrVyhledani(p);
    setNahledFiltrChyba(null);
  }, []);

  const aplikujFiltrNahled = useCallback(() => {
    if (!jeKompletniParametr(nahledFiltrVyhledani)) {
      setNahledFiltrChyba(
        "Vyber druh (národnost, tým nebo typ karty) a vyplň konkrétní hodnotu.",
      );
      return;
    }
    setNahledFiltrChyba(null);
    setNahledFiltrParamAplikovany(true);
  }, [nahledFiltrVyhledani]);

  const zrusFiltrNahled = useCallback(() => {
    setNahledFiltrParamAplikovany(false);
    setNahledFiltrChyba(null);
  }, []);

  const vynulujKriteriaFiltruNahled = useCallback(() => {
    setNahledFiltrVyhledani(prazdnyFiltrNahled());
    setNahledFiltrChyba(null);
    setNahledFiltrParamAplikovany(false);
  }, []);

  const utocnaNahled = useMemo(() => {
    const list = payload.utocna.filter((r) =>
      radekJeVNahledu(
        r,
        nahledFiltrBonusTyp,
        nahledFiltrParamAplikovany,
        nahledFiltrVyhledani,
        "utocna",
      ),
    );
    return seradKombinacePodleBonusuDesc(list);
  }, [
    nahledFiltrBonusTyp,
    nahledFiltrParamAplikovany,
    nahledFiltrVyhledani,
    payload.utocna,
  ]);
  const obrannaNahled = useMemo(() => {
    const list = payload.obranna.filter((r) =>
      radekJeVNahledu(
        r,
        nahledFiltrBonusTyp,
        nahledFiltrParamAplikovany,
        nahledFiltrVyhledani,
        "obranna",
      ),
    );
    return seradKombinacePodleBonusuDesc(list);
  }, [
    nahledFiltrBonusTyp,
    nahledFiltrParamAplikovany,
    nahledFiltrVyhledani,
    payload.obranna,
  ]);

  const pocetKombinaciPodleFiltru = useMemo(() => {
    const nu = payload.utocna.filter((r) =>
      radekJeVNahledu(
        r,
        nahledFiltrBonusTyp,
        nahledFiltrParamAplikovany,
        nahledFiltrVyhledani,
        "utocna",
      ),
    ).length;
    const no = payload.obranna.filter((r) =>
      radekJeVNahledu(
        r,
        nahledFiltrBonusTyp,
        nahledFiltrParamAplikovany,
        nahledFiltrVyhledani,
        "obranna",
      ),
    ).length;
    return { utocna: nu, obranna: no, celkem: nu + no };
  }, [
    nahledFiltrBonusTyp,
    nahledFiltrParamAplikovany,
    nahledFiltrVyhledani,
    payload.obranna,
    payload.utocna,
  ]);

  const nahledJeFiltrovany =
    nahledFiltrParamAplikovany || nahledFiltrBonusTyp !== "vse";

  const smazatVsechnyPodleFiltru = useCallback(async () => {
    if (!user?.id) return;
    const { celkem, utocna: nu, obranna: no } = pocetKombinaciPodleFiltru;
    if (celkem < 1) return;

    const castiFiltru: string[] = [];
    if (nahledFiltrBonusTyp !== "vse") {
      castiFiltru.push(`typ bonusu ${nahledFiltrBonusTyp}`);
    }
    if (nahledFiltrParamAplikovany) {
      castiFiltru.push("zadaná hodnota ve vyhledávání");
    }
    const filtrTxt =
      castiFiltru.length > 0
        ? ` Podmínky: ${castiFiltru.join(", ")}.`
        : " Mazou se všechny kombinace (zvoleno „Vše“ a vyhledávání je vypnuté).";

    const rozpad =
      nu > 0 && no > 0
        ? `${nu} útočných a ${no} obranných`
        : nu > 0
          ? `${nu} útočných`
          : `${no} obranných`;

    if (
      !window.confirm(
        `Opravdu trvale smazat ${rozpad} kombinací?${filtrTxt} Tuto akci nelze vrátit zpět.`,
      )
    ) {
      return;
    }

    const newPayload: Payload = {
      utocna: payload.utocna.filter(
        (r) =>
          !radekJeVNahledu(
            r,
            nahledFiltrBonusTyp,
            nahledFiltrParamAplikovany,
            nahledFiltrVyhledani,
            "utocna",
          ),
      ),
      obranna: payload.obranna.filter(
        (r) =>
          !radekJeVNahledu(
            r,
            nahledFiltrBonusTyp,
            nahledFiltrParamAplikovany,
            nahledFiltrVyhledani,
            "obranna",
          ),
      ),
    };

    setUkladam(true);
    setUlozChyba(null);
    setUlozenoOk(false);
    const res = await persistPayload(newPayload);
    setUkladam(false);
    if (res.error) {
      setUlozChyba(res.error);
      return;
    }
    setPayload(res.ulozeno);
    setUlozenoOk(true);
  }, [
    user?.id,
    pocetKombinaciPodleFiltru,
    nahledFiltrBonusTyp,
    nahledFiltrParamAplikovany,
    nahledFiltrVyhledani,
    payload,
    persistPayload,
  ]);

  const upravKombinaci = useCallback((typ: TypKombinaceBonusu, r: RadekBonusKombinaceUi) => {
    setTypKombinace(typ);
    setDraft(radkaZKopii(r));
    setPayload((p) => ({
      ...p,
      [typ]: p[typ].filter((x) => x.id !== r.id),
    }));
    setUlozenoOk(false);
    setVyberChyba(null);
    setUlozChyba(null);
    queueMicrotask(() => {
      document
        .getElementById("bonus-kombinace-filtr")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const obsah = (
    <TypKartyMetaOptsProvider value={typKartyMetaOpts}>
      {loading ? (
    <p className="text-sm text-[var(--hut-muted)]">Načítám účet…</p>
  ) : !pristup ? (
    <div className="rounded-xl border border-[var(--hut-border)] bg-[var(--hut-surface)]/80 p-8">
      <h2 className="text-xl font-semibold text-white">Přístup zamítnut</h2>
      <p className="mt-3 text-sm leading-relaxed text-[var(--hut-muted)]">
        Tato stránka je vyhrazena pro správce. Přihlas se účtem s oprávněním nebo pokračuj v{" "}
        <Link href="/" className="font-medium text-[var(--hut-lime)] underline-offset-2 hover:underline">
          Můj inventář
        </Link>
        .
      </p>
    </div>
  ) : (
    <div className="w-full">
      <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Nastavení bonusů</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--hut-muted)] sm:text-[15px]">
        Úprava <span className="font-medium text-zinc-300">sdílených kombinací</span> v databázi (útok =
        trojice symbolů, obrana = dvojice; bonus PLAT / CLK / BS). První blok synchronizuje{" "}
        <span className="font-medium text-zinc-300">typy karet</span> z NHL HUT Builderu do Supabase; druhý
        načte jejich <span className="font-medium text-zinc-300">chemii (jen typ karty)</span> a připojí řádky
        k už uloženým. Statický katalog v kódu (
        <code className="rounded bg-black/30 px-1 font-mono text-[11px] text-zinc-300">
          lib/hutdbTypKaret.ts
        </code>
        ) zůstává základem — dynamické řádky ho doplňují.
      </p>

      {nastaveniChyba ? (
        <p
          className="mt-4 rounded-lg border border-amber-500/35 bg-amber-950/30 px-3 py-2 text-sm text-amber-100"
          role="alert"
        >
          Nepodařilo se načíst uložené nastavení: {nastaveniChyba}
        </p>
      ) : null}

      {nacitamNastaveni ? (
        <p className="mt-8 text-sm text-[var(--hut-muted)]">Načítám nastavení…</p>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start lg:gap-5">
            <section
              id="bonus-nastroje-typy-karet"
              className="rounded-xl border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]/35 p-4 sm:p-5"
              aria-labelledby="bonus-hlavicka-typy-karet"
            >
              <h3
                id="bonus-hlavicka-typy-karet"
                className="text-[11px] font-semibold uppercase tracking-wider text-[var(--hut-lime)]"
              >
                1 — Typy karet (Supabase)
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[var(--hut-muted)] sm:text-sm">
                Stáhne výčet sad z NHL HUT Builder (Combo Finder) a uloží ho do tabulky{" "}
                <code className="rounded bg-black/35 px-1.5 py-0.5 font-mono text-[11px] text-zinc-200">
                  hut_typy_karet_dynamic
                </code>
                . Aplikace je sloučí se statickým{" "}
                <code className="rounded bg-black/35 px-1.5 py-0.5 font-mono text-[11px] text-zinc-200">
                  hutdbTypKaret.ts
                </code>
                . Ikony se berou z CDN / případně z{" "}
                <code className="rounded bg-black/35 px-1.5 py-0.5 font-mono text-[11px] text-zinc-200">
                  public/logos/hut-typy-karet/
                </code>{" "}
                — lokálně můžeš doplnit soubory přes{" "}
                <code className="font-mono text-[11px] text-zinc-300">npm run loga:typy-karet</code>. Po syncu se
                pod tlačítkem zobrazí, kolik řádků bylo nových vs. jen přepsaných (
                <code className="font-mono text-[11px] text-zinc-300">hodnota_filtru</code>).
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={syncTypyBezi || importHbBezi || ukladam}
                  onClick={() => void synchronizujTypyKaretZHutbuilder()}
                  className="rounded-full border border-zinc-600 bg-[var(--hut-btn)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:border-zinc-500 hover:bg-[var(--hut-btn-hover)] disabled:opacity-45"
                >
                  {syncTypyBezi ? "Synchronizuji…" : "Synchronizovat typy karet"}
                </button>
              </div>
              {syncTypyChyba ? (
                <p className="mt-3 text-xs text-amber-200" role="alert">
                  {syncTypyChyba}
                </p>
              ) : null}
              {syncTypyVysledek ? (
                <p className="mt-3 text-xs leading-relaxed text-[var(--hut-lime)]" role="status">
                  {syncTypyVysledek}
                </p>
              ) : null}
            </section>

            <section
              id="bonus-nastroje-hutbuilder"
              className="rounded-xl border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]/35 p-4 sm:p-5"
              aria-labelledby="bonus-hlavicka-hutbuilder"
            >
              <h3
                id="bonus-hlavicka-hutbuilder"
                className="text-[11px] font-semibold uppercase tracking-wider text-[var(--hut-lime)]"
              >
                2 — Kombinace z Hut Builderu → databáze
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[var(--hut-muted)] sm:text-sm">
                Projede předgenerované útoky, obranu i brankáře na Hut Builderu a{" "}
                <span className="font-medium text-zinc-400">připojí</span> řádky ke stávajícím v této tabulce
                (nezahazuje ruční úpravy). Sloty synergy se berou v pořadí: typ karty i tým — BS (AP) je často
                kombinace obojího. Neznámý název týmu v našem seznamu lig se přeskočí. Import běží dvakrát za řadu:
                výchozí žebříček (hlavně PLAT + BS) a pak režim „overall“, kde Hut Builder doplní synergii s{" "}
                <span className="font-medium text-zinc-400">OVR → CLK</span>.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={importHbBezi || syncTypyBezi || ukladam}
                  onClick={() => void importujKombinaceZHutbuilder()}
                  className="rounded-full border border-zinc-600 bg-[var(--hut-btn)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:border-zinc-500 hover:bg-[var(--hut-btn-hover)] disabled:opacity-45"
                >
                  {importHbBezi ? "Importuji…" : "Načíst kombinace z Hut Builderu"}
                </button>
                {importHbBezi ? (
                  <button
                    type="button"
                    onClick={zrusImportHutbuilder}
                    className={`${btnUpravitClass} border-red-500/40 text-red-100`}
                  >
                    Zrušit import
                  </button>
                ) : null}
              </div>
              {importHbLog ? (
                <p className="mt-3 font-mono text-[11px] text-[var(--hut-muted)]">{importHbLog}</p>
              ) : null}
              {importHbChyba ? (
                <p className="mt-2 text-xs text-amber-200" role="alert">
                  {importHbChyba}
                </p>
              ) : null}
            </section>
          </div>

          <p className="mt-10 text-[11px] font-semibold uppercase tracking-wider text-[var(--hut-muted)]">
            Kombinace v databázi
          </p>
          <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-[var(--hut-muted)] sm:text-sm">
            U <span className="font-medium text-zinc-400">Útok</span> vyplň tři parametry (národnost / tým /
            typ karty), u <span className="font-medium text-zinc-400">Obrana</span> dva.{" "}
            <span className="font-medium text-zinc-400">Uložit</span> zapíše řádek; stejná kombinace se
            dvakrát uložit nedá. Smazání v náhledu se uloží hned.
          </p>

          <fieldset className="mt-5 min-w-0 border-0 p-0">
            <legend className="px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--hut-lime)]">
              Kam přidat kombinaci
            </legend>
            <div
              className="mt-3 flex flex-wrap gap-2"
              role="group"
              aria-label="Typ kombinace"
            >
              {(
                [
                  { id: "utocna" as const, label: "Útok" },
                  { id: "obranna" as const, label: "Obrana" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setTypKombinace(opt.id);
                    if (opt.id === "obranna") {
                      setDraft((d) => ({
                        ...d,
                        param3: novyParametrPrazdny("narodnost"),
                      }));
                    }
                    setUlozChyba(null);
                    setVyberChyba(null);
                  }}
                  className={[
                    "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    typKombinace === opt.id
                      ? "border-[var(--hut-focus)]/60 bg-[var(--hut-focus)]/15 text-white"
                      : "border-[var(--hut-border)] text-[var(--hut-muted)] hover:border-zinc-500 hover:text-zinc-200",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div
            id="bonus-kombinace-filtr"
            className="sticky top-[max(0.5rem,env(safe-area-inset-top))] z-20 mt-8 scroll-mt-4 rounded-xl border border-[var(--hut-border)] bg-[color-mix(in_srgb,var(--hut-surface)_92%,transparent)] p-3 shadow-lg shadow-black/20 backdrop-blur-md supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--hut-surface)_85%,transparent)] sm:top-4 sm:p-4"
          >
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--hut-muted)] lg:mb-2">
              Nová kombinace
            </p>
            <div
              className={
                typKombinace === "obranna"
                  ? "grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-3"
                  : "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3"
              }
            >
              {(typKombinace === "obranna" ? ([1, 2] as const) : ([1, 2, 3] as const)).map(
                (slot) => (
                  <SloupecParametru
                    key={slot}
                    slot={slot}
                    draftId={draft.id}
                    param={parametrZRadek(draft, slot)}
                    narodnostiVolby={narodnostiVolby}
                    hutdbTypyKaret={hutdbTypyKaret}
                    ukladam={ukladam}
                    onZmenDruh={(druh) => zmenDruhSlotu(slot, druh)}
                    onZmenParam={(p) => zmenParamSlotu(slot, p)}
                  />
                ),
              )}
              <SloupecBonusu
                draftId={draft.id}
                bonusHodnota={draft.bonusHodnota}
                bonusTyp={draft.bonusTyp}
                ukladam={ukladam}
                onZmenHodnotu={zmenBonusHodnotu}
                onZmenTyp={zmenBonusTyp}
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void ulozKombinaci()}
                disabled={ukladam}
                className="rounded-full border border-zinc-600 bg-[var(--hut-btn)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:border-zinc-500 hover:bg-[var(--hut-btn-hover)] disabled:opacity-45"
              >
                {ukladam ? "Ukládám…" : "Uložit"}
              </button>
              <button
                type="button"
                onClick={vymazatFormularKombinace}
                disabled={ukladam}
                className="rounded-full border border-[var(--hut-border-strong)] bg-transparent px-5 py-2.5 text-sm font-medium text-[var(--hut-muted)] transition-colors hover:border-zinc-500 hover:text-white disabled:opacity-45"
              >
                Smazat formulář
              </button>
            </div>

            {vyberChyba ? (
              <p className="mt-3 text-sm text-amber-200" role="alert">
                {vyberChyba}
              </p>
            ) : null}
          </div>

          <div className="mt-10">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--hut-lime)]">
              3 — Náhled uložených kombinací
            </h3>

            <div
              id="bonus-nahled-filtr"
              className="mt-5 rounded-xl border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]/25 p-3 sm:p-4"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--hut-muted)]">
                Vyhledávání v kombinacích
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--hut-muted)]">
                Zvol národnost, tým nebo typ karty a vyplň jednu hodnotu — po kliknutí na Filtruj se zobrazí řádky,
                kde tato hodnota sedí na libovolné pozici (1., 2. nebo u útoku i 3. parametr). U obranných kombinací
                se hledá jen mezi prvními dvěma symboly.
              </p>
              <div className="mt-4 max-w-md">
                <SloupecParametru
                  slot={1}
                  popisekSlotu="Hodnota k vyhledání"
                  draftId="nahled-filtr-vyhledani"
                  param={nahledFiltrVyhledani}
                  narodnostiVolby={narodnostiVolby}
                  hutdbTypyKaret={hutdbTypyKaret}
                  ukladam={ukladam}
                  onZmenDruh={zmenNahledFiltrDruh}
                  onZmenParam={zmenNahledFiltrParam}
                />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void aplikujFiltrNahled()}
                  disabled={ukladam}
                  className="rounded-full border border-[var(--hut-focus)]/50 bg-[var(--hut-focus)]/15 px-5 py-2 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[var(--hut-focus)]/25 disabled:opacity-45"
                >
                  Filtruj
                </button>
                <button
                  type="button"
                  onClick={zrusFiltrNahled}
                  disabled={ukladam || !nahledFiltrParamAplikovany}
                  className="rounded-full border border-[var(--hut-border)] px-4 py-2 text-sm font-medium text-[var(--hut-muted)] transition-colors hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-40"
                >
                  Zrušit vyhledávání
                </button>
                <button
                  type="button"
                  onClick={vynulujKriteriaFiltruNahled}
                  disabled={ukladam}
                  className="rounded-full border border-[var(--hut-border)] px-4 py-2 text-sm font-medium text-[var(--hut-muted)] transition-colors hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-40"
                >
                  Vynulovat kritéria
                </button>
                {nahledFiltrParamAplikovany ? (
                  <span className="text-xs font-medium text-[var(--hut-lime)]">Vyhledávání je zapnuté</span>
                ) : null}
              </div>
              {nahledFiltrChyba ? (
                <p className="mt-3 text-sm text-amber-200" role="alert">
                  {nahledFiltrChyba}
                </p>
              ) : null}
            </div>

            <div
              className="mt-5 flex flex-wrap items-center gap-2"
              role="group"
              aria-label="Filtrovat náhled podle typu bonusu"
            >
              <span className="text-xs font-medium text-[var(--hut-muted)]">Typ bonusu</span>
              {(
                [
                  { id: "vse" as const, label: "Vše" },
                  ...TYPY_BONUSU_KOMBINACE.map((t) => ({ id: t, label: t })),
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setNahledFiltrBonusTyp(opt.id)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors",
                    nahledFiltrBonusTyp === opt.id
                      ? "border-[var(--hut-focus)]/60 bg-[var(--hut-focus)]/15 text-white"
                      : "border-[var(--hut-border)] text-[var(--hut-muted)] hover:border-zinc-500 hover:text-zinc-200",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={ukladam || pocetKombinaciPodleFiltru.celkem < 1}
                onClick={() => void smazatVsechnyPodleFiltru()}
                title="Smaže všechny řádky, které odpovídají aktuálnímu náhledu (typ bonusu a zapnuté vyhledávání)."
                className={`${btnSmazatClass} disabled:opacity-40`}
              >
                Smazat všechny
                {pocetKombinaciPodleFiltru.celkem > 0
                  ? ` (${pocetKombinaciPodleFiltru.celkem})`
                  : ""}
              </button>
              <span className="max-w-xl text-xs leading-relaxed text-[var(--hut-muted)]">
                Maže útočné i obranné řádky viditelné v náhledu podle zvoleného typu bonusu (PLAT / CLK / BS) a podle
                zapnutého vyhledávání.
              </span>
            </div>
            <div className="mt-4 grid gap-8 lg:grid-cols-2 lg:gap-10">
              <div className="min-w-0">
                <h4 className="mb-3 text-sm font-semibold text-white">Útočné kombinace</h4>
                <ul className="space-y-2">
                  {payload.utocna.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-[var(--hut-border)] px-3 py-6 text-center text-sm text-[var(--hut-muted)]">
                      Zatím žádné — zvol „Útok“, nastav tři parametry, bonus a klikni Uložit.
                    </li>
                  ) : utocnaNahled.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-[var(--hut-border)] px-3 py-6 text-center text-sm text-[var(--hut-muted)]">
                      {nahledJeFiltrovany
                        ? "Žádná útočná kombinace neodpovídá zvoleným filtrům — zkus „Vše“, zrušit vyhledávání nebo upravit hodnotu."
                        : "Pro zvolený typ bonusu tu nic není — zkus „Vše“ nebo jiný typ."}
                    </li>
                  ) : (
                    utocnaNahled.map((r) => (
                      <li
                        key={r.id}
                        className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]/40 px-3 py-2.5"
                      >
                        <RadekKombinaceIkony r={r} narodnostiVolby={narodnostiVolby} />
                        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={ukladam}
                            onClick={() => upravKombinaci("utocna", r)}
                            className={`${btnUpravitClass} disabled:opacity-45`}
                          >
                            Upravit
                          </button>
                          <button
                            type="button"
                            disabled={ukladam}
                            onClick={() => void odeberKombinaci("utocna", r.id)}
                            className={`${btnSmazatClass} disabled:opacity-45`}
                          >
                            Smazat
                          </button>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="min-w-0">
                <h4 className="mb-3 text-sm font-semibold text-white">Obranné kombinace</h4>
                <ul className="space-y-2">
                  {payload.obranna.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-[var(--hut-border)] px-3 py-6 text-center text-sm text-[var(--hut-muted)]">
                      Zatím žádné — zvol „Obrana“, nastav dva parametry, bonus a klikni Uložit.
                    </li>
                  ) : obrannaNahled.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-[var(--hut-border)] px-3 py-6 text-center text-sm text-[var(--hut-muted)]">
                      {nahledJeFiltrovany
                        ? "Žádná obranná kombinace neodpovídá zvoleným filtrům — zkus „Vše“, zrušit vyhledávání nebo upravit hodnotu."
                        : "Pro zvolený typ bonusu tu nic není — zkus „Vše“ nebo jiný typ."}
                    </li>
                  ) : (
                    obrannaNahled.map((r) => (
                      <li
                        key={r.id}
                        className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]/40 px-3 py-2.5"
                      >
                        <RadekKombinaceIkony
                          r={r}
                          narodnostiVolby={narodnostiVolby}
                          parametryPocet={2}
                        />
                        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={ukladam}
                            onClick={() => upravKombinaci("obranna", r)}
                            className={`${btnUpravitClass} disabled:opacity-45`}
                          >
                            Upravit
                          </button>
                          <button
                            type="button"
                            disabled={ukladam}
                            onClick={() => void odeberKombinaci("obranna", r.id)}
                            className={`${btnSmazatClass} disabled:opacity-45`}
                          >
                            Smazat
                          </button>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </div>

          {ulozChyba ? (
            <p
              className="mt-4 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200"
              role="alert"
            >
              {ulozChyba}
            </p>
          ) : null}

          {ulozenoOk ? (
            <p className="mt-3 text-sm font-medium text-[var(--hut-lime)]">
              Změny uloženy do databáze.
            </p>
          ) : null}

          <p className="mt-8 text-xs text-[var(--hut-muted)]/80">
            Útočných: {payload.utocna.length}, obranných: {payload.obranna.length}.
          </p>
        </>
      )}
    </div>
      )}
    </TypKartyMetaOptsProvider>
  );

  return (
    <HutShell
      headerSectionLabel="Nastavení bonusů"
      mainStyle={HUT_FORM_PAGE_BG}
      mainInnerClassName="relative z-0 mx-auto max-w-7xl"
    >
      {obsah}
    </HutShell>
  );
}
