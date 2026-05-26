"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  kartaNaNapoveduZInventare,
  nactiNapoveduHracu,
  normKlicJmenoTym,
} from "@/lib/eaRatingsDb";
import type { EaNhl26Hrac } from "@/lib/eaNhl26Ratings";
import { HUT_POZICE_ZKRATKA } from "@/lib/hutPozice";
import type { HutCard } from "@/types";

type Props = {
  id?: string;
  value: string;
  onChange: (jmeno: string) => void;
  /** Po výběru z nápovědy (EA, komunita nebo vlastní karta z inventáře). */
  onVybratHrace: (h: EaNhl26Hrac) => void;
  disabled?: boolean;
  userId: string | null;
  /** Po uložení karty znovu načte seznam z EA + RPC. */
  inventarPocet: number;
  /** Karty přihlášeného uživatele — zobrazí se v nápovědě zvýrazněné. */
  inventarKarty?: readonly HutCard[];
  /** Při úpravě karty ji v nápovědě „moje“ neukazovat. */
  vyloucitKartuSlug?: string | null;
  /** Při přidávání nové karty neumožní výběr položek z vlastního inventáře. */
  blokovatVlastniKarty?: boolean;
  inputClassName?: string;
  required?: boolean;
  placeholder?: string;
};

function shodaHrace(h: EaNhl26Hrac, dotaz: string): boolean {
  const q = dotaz.trim().toLowerCase();
  if (!q) return false;
  const hay = [
    h.jmeno,
    h.tym,
    h.positionShort,
    h.napovedaTypKarty ?? "",
    h.napovedaOvr != null ? String(h.napovedaOvr) : "",
    h.hutPozice ? HUT_POZICE_ZKRATKA[h.hutPozice] : "",
  ]
    .join(" ")
    .toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((t) => hay.includes(t));
}

function shodaKartaInventar(k: HutCard, dotaz: string): boolean {
  const q = dotaz.trim().toLowerCase();
  if (!q) return false;
  const hay = `${k.jmeno} ${k.tym} ${k.typKarty} ${k.ovr} ${HUT_POZICE_ZKRATKA[k.pozice]}`.toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((t) => hay.includes(t));
}

const MAX_VYSLEDKU = 18;
const MAX_MINE = 10;

function popisekZdroje(h: EaNhl26Hrac, duplicitni: boolean): string {
  if (duplicitni) return "Duplicitní";
  if (h.source === "mine") return "V inventáři";
  if (h.source === "ea") return "EA";
  return "Komunita";
}

function podtitulRadku(h: EaNhl26Hrac): string {
  const casti = [h.tym];
  if (h.napovedaOvr != null) casti.push(`${h.napovedaOvr} OVR`);
  if (h.hutPozice) casti.push(HUT_POZICE_ZKRATKA[h.hutPozice]);
  if (h.napovedaTypKarty) casti.push(h.napovedaTypKarty);
  return casti.join(" · ");
}

export function JmenoKartyNapoveda({
  id: idProp,
  value,
  onChange,
  onVybratHrace,
  disabled,
  userId,
  inventarPocet,
  inventarKarty = [],
  vyloucitKartuSlug = null,
  blokovatVlastniKarty = false,
  inputClassName,
  required,
  placeholder = "např. McDavid, Oilers…",
}: Props) {
  const generatedId = useId();
  const inputId = idProp ?? generatedId;
  const supabase = useMemo(() => createClient(), []);
  const rootRef = useRef<HTMLDivElement>(null);

  const [hraci, setHraci] = useState<EaNhl26Hrac[]>([]);
  const [otevreno, setOtevreno] = useState(false);
  const [vybranyIdx, setVybranyIdx] = useState(0);

  const nactiSeznam = useCallback(async () => {
    if (!userId) {
      setHraci([]);
      return;
    }
    const { data, error } = await nactiNapoveduHracu(supabase, {
      nacistAgregaciZeVsechKaret: true,
    });
    if (!error) setHraci(data);
  }, [supabase, userId]);

  useEffect(() => {
    void nactiSeznam();
  }, [nactiSeznam, inventarPocet]);

  useEffect(() => {
    if (!userId) return;
    const tichyRefresh = () => {
      void nactiSeznam();
    };
    const intervalId = window.setInterval(tichyRefresh, 120_000);
    const priViditelnosti = () => {
      if (document.visibilityState === "visible") tichyRefresh();
    };
    window.addEventListener("focus", tichyRefresh);
    document.addEventListener("visibilitychange", priViditelnosti);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", tichyRefresh);
      document.removeEventListener("visibilitychange", priViditelnosti);
    };
  }, [userId, nactiSeznam]);

  const vysledky = useMemo(() => {
    if (!userId || !value.trim()) return [];

    const mine: EaNhl26Hrac[] = [];
    for (const k of inventarKarty) {
      if (vyloucitKartuSlug && k.id === vyloucitKartuSlug) continue;
      if (!shodaKartaInventar(k, value)) continue;
      const h = kartaNaNapoveduZInventare(k, mine.length);
      if (h) mine.push(h);
      if (mine.length >= MAX_MINE) break;
    }

    const mineKliceJmenoTym = new Set(
      mine.map((h) => normKlicJmenoTym(h.jmeno, h.tym)),
    );

    const ostatni: EaNhl26Hrac[] = [];
    for (const h of hraci) {
      if (!shodaHrace(h, value)) continue;
      if (
        h.source === "card" &&
        mineKliceJmenoTym.has(normKlicJmenoTym(h.jmeno, h.tym))
      ) {
        continue;
      }
      ostatni.push(h);
    }

    return [...mine, ...ostatni].slice(0, MAX_VYSLEDKU);
  }, [value, userId, hraci, inventarKarty, vyloucitKartuSlug]);

  const jeDuplicitni = useCallback(
    (h: EaNhl26Hrac) => blokovatVlastniKarty && h.source === "mine",
    [blokovatVlastniKarty],
  );

  const lzeVybrat = useCallback(
    (h: EaNhl26Hrac) => !jeDuplicitni(h),
    [jeDuplicitni],
  );

  useEffect(() => {
    const first = vysledky.findIndex(lzeVybrat);
    setVybranyIdx(first >= 0 ? first : 0);
  }, [value, vysledky, lzeVybrat]);

  useEffect(() => {
    if (!otevreno) return;
    const zavrit = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOtevreno(false);
      }
    };
    document.addEventListener("mousedown", zavrit);
    return () => document.removeEventListener("mousedown", zavrit);
  }, [otevreno]);

  const aplikuj = useCallback(
    (h: EaNhl26Hrac) => {
      onVybratHrace(h);
      onChange(h.jmeno);
      setOtevreno(false);
    },
    [onVybratHrace, onChange],
  );

  const dalsiVybratelnyIdx = useCallback(
    (from: number, dir: 1 | -1) => {
      if (vysledky.length === 0) return 0;
      let i = from;
      for (let n = 0; n < vysledky.length; n++) {
        i = (i + dir + vysledky.length) % vysledky.length;
        if (lzeVybrat(vysledky[i]!)) return i;
      }
      return from;
    },
    [vysledky, lzeVybrat],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!otevreno || vysledky.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setVybranyIdx((i) => dalsiVybratelnyIdx(i, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setVybranyIdx((i) => dalsiVybratelnyIdx(i, -1));
    } else if (e.key === "Enter") {
      const h = vysledky[vybranyIdx];
      if (h && lzeVybrat(h)) {
        e.preventDefault();
        aplikuj(h);
      }
    } else if (e.key === "Escape") {
      setOtevreno(false);
    }
  };

  if (!userId) {
    return (
      <input
        id={inputId}
        type="text"
        required={required}
        disabled={disabled}
        className={inputClassName}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Connor McDavid"
        autoComplete="name"
      />
    );
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <input
        id={inputId}
        type="search"
        required={required}
        disabled={disabled}
        autoComplete="off"
        className={inputClassName}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOtevreno(true);
        }}
        onFocus={() => value.trim() && setOtevreno(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-expanded={otevreno && vysledky.length > 0}
        aria-autocomplete="list"
      />
      {otevreno && vysledky.length > 0 ? (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-lg border border-[var(--hut-border)] bg-[var(--hut-surface)] py-1 shadow-xl"
        >
          {vysledky.map((h, idx) => {
            const duplicitni = jeDuplicitni(h);
            return (
              <li
                key={h.key}
                role="option"
                aria-selected={idx === vybranyIdx}
                aria-disabled={duplicitni}
              >
                <button
                  type="button"
                  disabled={duplicitni}
                  title={
                    duplicitni
                      ? "Tato karta už je v inventáři — nelze přidat duplicitu"
                      : undefined
                  }
                  className={[
                    "flex w-full flex-col items-start gap-0.5 border-l-2 px-3 py-2 text-left text-sm transition-colors",
                    duplicitni
                      ? "cursor-not-allowed border-red-500/80 bg-red-950/30 text-red-200/90"
                      : idx === vybranyIdx
                        ? "border-transparent bg-[var(--hut-surface-raised)] text-white"
                        : "border-transparent text-zinc-200 hover:bg-[var(--hut-surface-raised)]/70",
                  ].join(" ")}
                  onMouseEnter={() => {
                    if (!duplicitni) setVybranyIdx(idx);
                  }}
                  onClick={() => {
                    if (!duplicitni) aplikuj(h);
                  }}
                >
                  <span className="flex w-full items-baseline justify-between gap-2">
                    <span className="font-medium">{h.jmeno}</span>
                    <span
                      className={[
                        "shrink-0 text-[10px] font-semibold uppercase tracking-wide",
                        duplicitni ? "text-red-400" : "text-[var(--hut-muted)]",
                      ].join(" ")}
                    >
                      {popisekZdroje(h, duplicitni)}
                    </span>
                  </span>
                  <span
                    className={[
                      "text-xs",
                      duplicitni ? "text-red-400/85" : "text-[var(--hut-muted)]",
                    ].join(" ")}
                  >
                    {podtitulRadku(h)}
                    {duplicitni ? " · už v inventáři" : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
