"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { nactiNapoveduHracu } from "@/lib/eaRatingsDb";
import type { EaNhl26Hrac } from "@/lib/eaNhl26Ratings";

type Props = {
  id?: string;
  value: string;
  onChange: (jmeno: string) => void;
  /** Po výběru z nápovědy (EA nebo karta z DB) — stejné chování jako dřív „Hledat hráče“. */
  onVybratHrace: (h: EaNhl26Hrac) => void;
  disabled?: boolean;
  userId: string | null;
  /** Po uložení karty znovu načte seznam z EA + RPC. */
  inventarPocet: number;
  inputClassName?: string;
  required?: boolean;
  placeholder?: string;
};

function shoda(h: EaNhl26Hrac, dotaz: string): boolean {
  const q = dotaz.trim().toLowerCase();
  if (!q) return false;
  const hay = `${h.jmeno} ${h.tym}`.toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((t) => hay.includes(t));
}

const MAX_VYSLEDKU = 14;

export function JmenoKartyNapoveda({
  id: idProp,
  value,
  onChange,
  onVybratHrace,
  disabled,
  userId,
  inventarPocet,
  inputClassName,
  required,
  placeholder = "např. McDavid, Oilers…",
}: Props) {
  const generatedId = useId();
  const inputId = idProp ?? generatedId;
  const supabase = useMemo(() => createClient(), []);
  const rootRef = useRef<HTMLDivElement>(null);

  const [hraci, setHraci] = useState<EaNhl26Hrac[]>([]);
  const [nacitam, setNacitam] = useState(false);
  const [fetchChyba, setFetchChyba] = useState<string | null>(null);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [otevreno, setOtevreno] = useState(false);
  const [vybranyIdx, setVybranyIdx] = useState(0);

  const nactiSeznam = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!userId) {
        setHraci([]);
        return;
      }
      const silent = options?.silent === true;
      if (!silent) {
        setNacitam(true);
        setFetchChyba(null);
      }
      const { data, syncedAt: st, error } = await nactiNapoveduHracu(supabase, {
        nacistAgregaciZeVsechKaret: true,
      });
      if (!silent) setNacitam(false);
      if (error) {
        if (!silent) {
          setFetchChyba(error.message);
          setHraci([]);
        }
      } else {
        setHraci(data);
        setSyncedAt(st);
        if (!silent) setFetchChyba(null);
      }
    },
    [supabase, userId],
  );

  useEffect(() => {
    void nactiSeznam();
  }, [nactiSeznam, inventarPocet]);

  useEffect(() => {
    if (!userId) return;
    const tichyRefresh = () => {
      void nactiSeznam({ silent: true });
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

  const prazdny = !nacitam && !fetchChyba && hraci.length === 0;
  const maNapovedu = Boolean(userId) && !prazdny && !fetchChyba;

  const vysledky = useMemo(() => {
    if (!maNapovedu || nacitam || !value.trim()) return [];
    const out: EaNhl26Hrac[] = [];
    for (const h of hraci) {
      if (shoda(h, value)) {
        out.push(h);
        if (out.length >= MAX_VYSLEDKU) break;
      }
    }
    return out;
  }, [value, maNapovedu, nacitam, hraci]);

  useEffect(() => {
    setVybranyIdx(0);
  }, [value, vysledky.length]);

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

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!otevreno || vysledky.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setVybranyIdx((i) => (i + 1) % vysledky.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setVybranyIdx((i) => (i - 1 + vysledky.length) % vysledky.length);
    } else if (e.key === "Enter" && vysledky[vybranyIdx]) {
      e.preventDefault();
      aplikuj(vysledky[vybranyIdx]!);
    } else if (e.key === "Escape") {
      setOtevreno(false);
    }
  };

  const syncLabel = syncedAt ? syncedAt.slice(0, 10) : "—";
  const pocetEa = hraci.filter((x) => x.source === "ea").length;
  const pocetDb = hraci.filter((x) => x.source === "card").length;

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
      {nacitam ? (
        <p className="mt-1 text-[10px] text-[var(--hut-muted)]">Načítám jména (EA + databáze)…</p>
      ) : fetchChyba ? (
        <p className="mt-1 text-[10px] text-red-300/90">Nápověda: {fetchChyba}</p>
      ) : prazdny ? (
        <p className="mt-1 text-[10px] text-amber-200/90">
          Nápověda prázdná — spusť v Supabase{" "}
          <code className="font-mono">ea_hraci_napoveda.sql</code> a{" "}
          <code className="font-mono">napoveda_jmena_z_cards_rpc.sql</code>, pak{" "}
          <code className="font-mono">npm run ea-ratings</code>.
        </p>
      ) : null}
      {otevreno && vysledky.length > 0 ? (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-lg border border-[var(--hut-border)] bg-[var(--hut-surface)] py-1 shadow-xl"
        >
          {vysledky.map((h, idx) => (
            <li key={h.key} role="option" aria-selected={idx === vybranyIdx}>
              <button
                type="button"
                className={[
                  "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition-colors",
                  idx === vybranyIdx
                    ? "bg-[var(--hut-surface-raised)] text-white"
                    : "text-zinc-200 hover:bg-[var(--hut-surface-raised)]/70",
                ].join(" ")}
                onMouseEnter={() => setVybranyIdx(idx)}
                onClick={() => aplikuj(h)}
              >
                <span className="flex w-full items-baseline justify-between gap-2">
                  <span className="font-medium">{h.jmeno}</span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--hut-muted)]">
                    {h.source === "ea" ? "EA" : "DB"}
                  </span>
                </span>
                <span className="text-xs text-[var(--hut-muted)]">{h.tym}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {maNapovedu && !nacitam ? (
        <p className="mt-1 text-[10px] leading-snug text-[var(--hut-muted)]/75">
          Nápověda: EA ({pocetEa}) + karty v DB ({pocetDb}) · sync {syncLabel}. Výběr z listu doplní údaje (u EA jen
          pozici/tým; u DB i OVR, plat…). U řádku <span className="text-zinc-400">DB</span> údaje zkontroluj.
        </p>
      ) : null}
    </div>
  );
}

