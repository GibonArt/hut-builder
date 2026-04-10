"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
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
  formatujBonusVRadkuNahled,
  jeKompletniRadek,
  migrujLegacyBonusTypyVSdileneTabulce,
  nactiBonusKombinaceSdilene,
  novyParametrPrazdny,
  novyRadekBonusu,
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
import { hutdbTypyKaretVTriPoradi } from "@/lib/hutdbTypKaret";
import { vsechnyNarodnostiCS, vlajkaZeme } from "@/lib/narodnosti";
import { urlLogaTymu } from "@/lib/tymLoga";

const labelClass = "mb-1.5 block text-xs font-medium text-[var(--hut-muted)]";

const selectClass =
  "box-border h-14 min-h-14 w-full cursor-pointer rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] px-3 py-0 text-sm text-white outline-none transition-[border-color,box-shadow] focus:border-[var(--hut-focus)]/70 focus:ring-2 focus:ring-[var(--hut-focus-ring)]";

const DRUH_VOLBY: { id: BonusKombinaceParametrTyp; label: string }[] = [
  { id: "narodnost", label: "Národnost" },
  { id: "tym", label: "Tým" },
  { id: "typ_karty", label: "Typ karty" },
];

type Payload = {
  utocna: RadekBonusKombinaceUi[];
  obranna: RadekBonusKombinaceUi[];
};

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
}: {
  slot: 1 | 2 | 3;
  draftId: string;
  param: BonusKombinaceParametr;
  narodnostiVolby: readonly { code: string; label: string }[];
  hutdbTypyKaret: ReturnType<typeof hutdbTypyKaretVTriPoradi>;
  ukladam: boolean;
  onZmenDruh: (druh: BonusKombinaceParametrTyp) => void;
  onZmenParam: (p: BonusKombinaceParametr) => void;
}) {
  const tymy = param.typ === "tym" ? tymyProLigu(param.liga) : [];

  return (
    <div className="min-w-0 rounded-lg border border-[var(--hut-border)]/80 bg-[var(--hut-bg-elevated)]/25 p-3 sm:p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--hut-lime)]">
        Parametr {slot}
      </p>
      <p className={labelClass}>Druh hodnoty</p>
      <div
        className="mt-1.5 flex flex-wrap gap-1.5"
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
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:text-[13px]",
              param.typ === opt.id
                ? "border-[var(--hut-focus)]/60 bg-[var(--hut-focus)]/15 text-white"
                : "border-[var(--hut-border)] text-[var(--hut-muted)] hover:border-zinc-500 hover:text-zinc-200",
            ].join(" ")}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
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
              />
            </div>
          </>
        ) : null}

        {param.typ === "tym" ? (
          <div className="space-y-3">
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
    <div className="min-w-0 rounded-lg border border-[var(--hut-border)]/80 bg-[var(--hut-bg-elevated)]/25 p-3 sm:p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--hut-lime)]">
        Bonus
      </p>
      <p className={`${labelClass} mb-2`}>Hodnota a typ bonusu</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3">
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
  const hutdbTypyKaret = useMemo(() => hutdbTypyKaretVTriPoradi(), []);

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
    async (next: Payload): Promise<string | null> => {
      if (!user?.id) return "Nejsi přihlášen.";
      const u = await ulozBonusKombinaciSdilenou(
        supabase,
        user.id,
        "utocna",
        next.utocna,
      );
      if (u.error) return u.error.message;
      const o = await ulozBonusKombinaciSdilenou(
        supabase,
        user.id,
        "obranna",
        next.obranna,
      );
      if (o.error) return o.error.message;
      return null;
    },
    [supabase, user?.id],
  );

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
    const newPayload: Payload = {
      ...payload,
      [typKombinace]: [...payload[typKombinace], kopie],
    };
    setUkladam(true);
    setUlozChyba(null);
    setUlozenoOk(false);
    const err = await persistPayload(newPayload);
    setUkladam(false);
    if (err) {
      setUlozChyba(err);
      return;
    }
    setPayload(newPayload);
    setDraft(novyRadekBonusu());
    setUlozenoOk(true);
  }, [draft, typKombinace, payload, user?.id, persistPayload]);

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
      const err = await persistPayload(newPayload);
      setUkladam(false);
      if (err) {
        setUlozChyba(err);
        return;
      }
      setPayload(newPayload);
      setUlozenoOk(true);
    },
    [payload, user?.id, persistPayload],
  );

  const utocnaNahled = useMemo(() => {
    const filtrovane =
      nahledFiltrBonusTyp === "vse"
        ? payload.utocna
        : payload.utocna.filter((r) => r.bonusTyp === nahledFiltrBonusTyp);
    return seradKombinacePodleBonusuDesc(filtrovane);
  }, [nahledFiltrBonusTyp, payload.utocna]);
  const obrannaNahled = useMemo(() => {
    const filtrovane =
      nahledFiltrBonusTyp === "vse"
        ? payload.obranna
        : payload.obranna.filter((r) => r.bonusTyp === nahledFiltrBonusTyp);
    return seradKombinacePodleBonusuDesc(filtrovane);
  }, [nahledFiltrBonusTyp, payload.obranna]);

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

  const obsah = loading ? (
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
        U volby <span className="font-medium text-zinc-300">Útok</span> zadej tři parametry (národnost,
        tým nebo typ karty), u <span className="font-medium text-zinc-300">Obrana</span> stačí dva. Ve
        sloupci <span className="font-medium text-zinc-300">Bonus</span> zadej číslo a typ (PLAT, CLK,
        BS). Klikni <span className="font-medium text-zinc-300">Uložit</span> — kombinace se zapíše do
        databáze a formulář se vyprázdní. Smazání řádku v náhledu se také hned uloží.
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
          <fieldset className="mt-8 min-w-0 border-0 p-0">
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
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-[var(--hut-muted)]">
              Filtr kombinace
            </p>
            <div
              className={
                typKombinace === "obranna"
                  ? "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
                  : "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-4"
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
            </div>

            {vyberChyba ? (
              <p className="mt-3 text-sm text-amber-200" role="alert">
                {vyberChyba}
              </p>
            ) : null}
          </div>

          <div className="mt-10">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--hut-lime)]">
              Náhled kombinací
            </h3>
            <div
              className="mt-3 flex flex-wrap items-center gap-2"
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
                      Pro zvolený typ bonusu tu nic není — zkus „Vše“ nebo jiný typ.
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
                      Pro zvolený typ bonusu tu nic není — zkus „Vše“ nebo jiný typ.
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
