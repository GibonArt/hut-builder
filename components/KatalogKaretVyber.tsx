"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  katalogRadkaKHutCard,
  nactiGlobalniKatalogKaret,
  type GlobalniKatalogRadkaDb,
} from "@/lib/cardsDb";
import { vsechnyNarodnostiCS, vlajkaZeme } from "@/lib/narodnosti";
import { urlLogaTymu } from "@/lib/tymLoga";
import { najdiMetaTypuKarty } from "@/lib/hutdbTypKaret";
import type { HutCard } from "@/types";
import { TypKartyMiniLogo } from "@/components/TypKartyIkona";
import { TymLogo } from "@/components/TymLogo";
import { formatovatPlatVMil } from "@/lib/platMiliony";
import { HUT_POZICE_ZKRATKA } from "@/lib/hutPozice";
import { ceskaZpravaAuthNeboDb } from "@/lib/supabaseChybyCs";

type Polozka = { dbId: string; karta: HutCard };

type Props = {
  userId: string | null;
  disabled?: boolean;
  onVybrat: (dbId: string, karta: HutCard) => void;
};

const btnClass =
  "touch-manipulation w-full rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] px-3 py-2 text-left text-sm text-white outline-none transition-[border-color,box-shadow] hover:border-zinc-500 focus:border-[var(--hut-focus)]/70 focus:ring-2 focus:ring-[var(--hut-focus-ring)]";

export function KatalogKaretVyber({ userId, disabled, onVybrat }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const narodnostiVolby = useMemo(() => vsechnyNarodnostiCS(), []);
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [otevreno, setOtevreno] = useState(false);
  const [nacitam, setNacitam] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [radky, setRadky] = useState<Polozka[]>([]);
  const [filtr, setFiltr] = useState("");
  const [vybranyLabel, setVybranyLabel] = useState<string | null>(null);

  const nacti = useCallback(async () => {
    if (!userId) {
      setRadky([]);
      return;
    }
    setNacitam(true);
    setChyba(null);
    const { data, error } = await nactiGlobalniKatalogKaret(supabase);
    setNacitam(false);
    if (error) {
      setChyba(ceskaZpravaAuthNeboDb(error.message));
      setRadky([]);
      return;
    }
    const polozky: Polozka[] = [];
    for (const r of data as GlobalniKatalogRadkaDb[]) {
      const k = katalogRadkaKHutCard(r);
      if (k) polozky.push({ dbId: r.card_id, karta: k });
    }
    setRadky(polozky);
  }, [supabase, userId]);

  useEffect(() => {
    void nacti();
  }, [nacti]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOtevreno(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtrovane = useMemo(() => {
    const q = filtr.trim().toLowerCase();
    if (!q) return radky;
    return radky.filter(({ karta: k }) => {
      const hay = `${k.jmeno} ${k.tym} ${k.liga} ${k.typKarty} ${HUT_POZICE_ZKRATKA[k.pozice]} ${k.ovr}`
        .toLowerCase();
      return q.split(/\s+/).every((t) => t && hay.includes(t));
    });
  }, [radky, filtr]);

  const vyber = (p: Polozka) => {
    onVybrat(p.dbId, p.karta);
    setVybranyLabel(`${p.karta.jmeno} · ${p.karta.ovr} OVR`);
    setOtevreno(false);
    setFiltr("");
  };

  return (
    <div ref={rootRef} className="relative min-w-0">
      <p className="mb-1.5 block text-xs font-medium text-[var(--hut-muted)]">
        Existující karta z databáze (všichni uživatelé)
      </p>
      <p className="mb-2 text-[11px] leading-snug text-[var(--hut-muted)]">
        Vyber řádek — předvyplní se celý formulář. Po kontrole ulož přes{" "}
        <span className="font-medium text-zinc-300">Přidat mezi mé karty</span>, pokud se údaje shodují
        se vzorkem.
      </p>
      <button
        type="button"
        disabled={disabled || !userId || nacitam}
        aria-haspopup="listbox"
        aria-expanded={otevreno}
        aria-controls={listId}
        onClick={() => !disabled && userId && setOtevreno((o) => !o)}
        className={`${btnClass} flex min-h-14 items-center justify-between gap-2`}
      >
        <span className="min-w-0 truncate text-left">
          {nacitam
            ? "Načítám katalog…"
            : vybranyLabel ?? "— Vyber kartu z databáze —"}
        </span>
        <span className="shrink-0 text-[var(--hut-muted)]" aria-hidden>
          {otevreno ? "▲" : "▼"}
        </span>
      </button>

      {chyba ? (
        <p className="mt-2 text-xs text-amber-200/90" role="alert">
          {chyba}
        </p>
      ) : null}

      {!nacitam && userId && radky.length === 0 && !chyba ? (
        <p className="mt-2 text-xs text-[var(--hut-muted)]">
          Žádné karty jiných uživatelů — katalog je prázdný (nebo jsi jediný s uloženými kartami).
        </p>
      ) : null}

      {otevreno && userId ? (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-[min(22rem,70vh)] overflow-hidden rounded-xl border border-[var(--hut-border)] bg-[var(--hut-surface-raised)] py-2 shadow-xl shadow-black/50"
        >
          <div className="border-b border-[var(--hut-border)] px-2 pb-2">
            <input
              type="search"
              value={filtr}
              onChange={(e) => setFiltr(e.target.value)}
              placeholder="Filtrovat jméno, tým, OVR…"
              className="w-full rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg)] px-2 py-1.5 text-sm text-white placeholder:text-[var(--hut-muted)]/50 focus:border-[var(--hut-focus)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--hut-focus-ring)]"
              autoComplete="off"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto px-1 pt-1">
            {filtrovane.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--hut-muted)]">Žádná shoda.</li>
            ) : (
              filtrovane.map((p) => (
                <li key={p.dbId} className="px-1 py-0.5">
                  <button
                    type="button"
                    role="option"
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-zinc-200 transition-colors hover:bg-[var(--hut-bg)] sm:text-[13px]"
                    onClick={() => vyber(p)}
                  >
                    <span className="shrink-0">
                      <TypKartyMiniLogo ulozeno={p.karta.typKarty} velikost="seznam" />
                    </span>
                    <span className="flex h-8 w-9 shrink-0 items-center justify-center text-lg leading-none">
                      {(() => {
                        const kod =
                          narodnostiVolby.find((n) => n.label === p.karta.narodnost.trim())
                            ?.code ?? "";
                        return kod ? vlajkaZeme(kod) : "—";
                      })()}
                    </span>
                    <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] p-0.5">
                      <TymLogo
                        url={urlLogaTymu(p.karta.tym, p.karta.liga)}
                        nazevTymu={p.karta.tym}
                        fill
                        className="max-h-full max-w-full object-contain"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-white">{p.karta.jmeno}</span>
                      <span className="block truncate text-[11px] text-[var(--hut-muted)]">
                        {HUT_POZICE_ZKRATKA[p.karta.pozice]} · {p.karta.ovr} OVR · {p.karta.tym} ·{" "}
                        {formatovatPlatVMil(p.karta.plat)}
                        {(() => {
                          const meta = najdiMetaTypuKarty(p.karta.typKarty);
                          return meta ? ` · ${meta.jmenoCs}` : "";
                        })()}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
