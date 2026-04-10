"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { nactiNapoveduHracu } from "@/lib/eaRatingsDb";
import type { EaNhl26Hrac } from "@/lib/eaNhl26Ratings";

type Props = {
  /** Při přihlášení načte agregovaná jména ze všech řádků `cards` (RPC). */
  userId: string | null;
  /** Znovu načte seznam po změně inventáře (nové jméno v DB). */
  inventarPocet: number;
  onVybrat: (h: EaNhl26Hrac) => void;
  disabled?: boolean;
  /**
   * Inkrementuj při úplném resetu formuláře (např. po uložení karty) — vyčistí pole vyhledávání a zavře nápovědu.
   */
  vycisteniDotazuVerze?: number;
};

function shoda(h: EaNhl26Hrac, dotaz: string): boolean {
  const q = dotaz.trim().toLowerCase();
  if (!q) return false;
  const hay = `${h.jmeno} ${h.tym}`.toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((t) => hay.includes(t));
}

const MAX_VYSLEDKU = 14;

export function EaHracNapoveda({
  userId,
  inventarPocet,
  onVybrat,
  disabled,
  vycisteniDotazuVerze = 0,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const listId = useId();
  const [hraci, setHraci] = useState<EaNhl26Hrac[]>([]);
  const [nacitam, setNacitam] = useState(true);
  const [fetchChyba, setFetchChyba] = useState<string | null>(null);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [otevreno, setOtevreno] = useState(false);
  const [dotaz, setDotaz] = useState("");
  const [vybranyIdx, setVybranyIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let zruseno = false;
    (async () => {
      setNacitam(true);
      setFetchChyba(null);
      const { data, syncedAt: st, error } = await nactiNapoveduHracu(supabase, {
        nacistAgregaciZeVsechKaret: Boolean(userId),
      });
      if (zruseno) return;
      if (error) {
        setFetchChyba(error.message);
        setHraci([]);
      } else {
        setHraci(data);
        setSyncedAt(st);
      }
      setNacitam(false);
    })();
    return () => {
      zruseno = true;
    };
  }, [supabase, userId, inventarPocet]);

  const prazdny = !nacitam && !fetchChyba && hraci.length === 0;

  const vysledky = useMemo(() => {
    if (prazdny || nacitam || !dotaz.trim()) return [];
    const out: EaNhl26Hrac[] = [];
    for (const h of hraci) {
      if (shoda(h, dotaz)) {
        out.push(h);
        if (out.length >= MAX_VYSLEDKU) break;
      }
    }
    return out;
  }, [dotaz, prazdny, nacitam, hraci]);

  useEffect(() => {
    setVybranyIdx(0);
  }, [dotaz, vysledky.length]);

  useEffect(() => {
    if (vycisteniDotazuVerze === 0) return;
    setDotaz("");
    setOtevreno(false);
    setVybranyIdx(0);
  }, [vycisteniDotazuVerze]);

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
      onVybrat(h);
      setDotaz(h.jmeno);
      setOtevreno(false);
    },
    [onVybrat],
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
      aplikuj(vysledky[vybranyIdx]);
    } else if (e.key === "Escape") {
      setOtevreno(false);
    }
  };

  const syncLabel = syncedAt ? syncedAt.slice(0, 10) : "—";

  return (
    <div ref={rootRef} className="sm:col-span-2">
      <label htmlFor={listId} className="mb-1.5 block text-xs font-medium text-[var(--hut-muted)]">
        Hledat hráče (EA + karty všech uživatelů)
      </label>
      {nacitam ? (
        <p className="rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]/50 px-3 py-2 text-xs text-[var(--hut-muted)]">
          Načítám seznam hráčů…
        </p>
      ) : fetchChyba ? (
        <p className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-xs text-red-200">
          Nepodařilo se načíst nápovědu: {fetchChyba}
        </p>
      ) : prazdny ? (
        <p className="rounded-lg border border-amber-500/25 bg-amber-950/20 px-3 py-2 text-xs text-amber-100/95">
          Tabulka nápovědy je prázdná nebo chybí RPC. V Supabase spusť{" "}
          <code className="font-mono">ea_hraci_napoveda.sql</code>,{" "}
          <code className="font-mono">napoveda_jmena_z_cards_rpc.sql</code>, pak{" "}
          <code className="font-mono">npm run ea-ratings</code> (service role + URL v{" "}
          <code className="font-mono">.env.local</code>).
        </p>
      ) : (
        <>
          <div className="relative">
            <input
              id={listId}
              type="search"
              autoComplete="off"
              disabled={disabled}
              placeholder="např. McDavid, Oilers…"
              value={dotaz}
              onChange={(e) => {
                setDotaz(e.target.value);
                setOtevreno(true);
              }}
              onFocus={() => dotaz.trim() && setOtevreno(true)}
              onKeyDown={onKeyDown}
              className="min-h-11 w-full rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] px-3 py-2.5 text-base text-white placeholder:text-[var(--hut-muted)]/50 outline-none transition-[border-color,box-shadow] focus:border-[var(--hut-focus)]/70 focus:ring-2 focus:ring-[var(--hut-focus-ring)] disabled:opacity-45 sm:min-h-0 sm:py-2 sm:text-sm"
            />
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
          </div>
          <p className="mt-1 text-[10px] text-[var(--hut-muted)]/80">
            EA ({hraci.filter((x) => x.source === "ea").length}) + z karet DB (
            {hraci.filter((x) => x.source === "card").length}) · sync {syncLabel}. OVR doplň ručně. U řádků z karet se
            doplní pozice a liga z posledního záznamu v databázi.
          </p>
        </>
      )}
    </div>
  );
}
