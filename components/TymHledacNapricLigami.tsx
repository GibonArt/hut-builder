"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Liga } from "@/types";
import {
  LIGA_ZOBRAZENI,
  hledejTymyNapricLigami,
} from "@/lib/tymyPodleLigy";
import { urlLogaTymu } from "@/lib/tymLoga";
import { TymLogoOblast } from "@/components/TymLogo";

const inputClass =
  "box-border h-14 min-h-14 w-full rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] px-3 py-0 text-sm text-white outline-none transition-[border-color,box-shadow] focus:border-[var(--hut-focus)]/70 focus:ring-2 focus:ring-[var(--hut-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

type Props = {
  id: string;
  disabled?: boolean;
  onVybrat: (liga: Liga, tym: string) => void;
};

export function TymHledacNapricLigami({ id, disabled, onVybrat }: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [dotaz, setDotaz] = useState("");
  const [otevreno, setOtevreno] = useState(false);

  const nabidka = useMemo(() => hledejTymyNapricLigami(dotaz, 35), [dotaz]);

  useEffect(() => {
    if (!otevreno) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOtevreno(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [otevreno]);

  const zobrazPanel = otevreno && dotaz.trim().length > 0;

  return (
    <div ref={rootRef} className="relative">
      <input
        id={id}
        type="search"
        autoComplete="off"
        disabled={disabled}
        value={dotaz}
        onChange={(e) => {
          setDotaz(e.target.value);
          setOtevreno(true);
        }}
        onFocus={() => setOtevreno(true)}
        placeholder="Hledat název napříč všemi ligami…"
        aria-autocomplete="list"
        aria-expanded={zobrazPanel}
        aria-controls={zobrazPanel ? listId : undefined}
        className={inputClass}
      />

      {zobrazPanel ? (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-hidden rounded-xl border border-[var(--hut-border)] bg-[var(--hut-surface-raised)] py-1 shadow-xl shadow-black/50"
        >
          <ul className="max-h-60 overflow-y-auto px-1">
            {nabidka.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-[var(--hut-muted)]">
                Žádný tým neodpovídá — zkus jiný text.
              </li>
            ) : (
              nabidka.map(({ liga, tym }) => {
                const u = urlLogaTymu(tym, liga);
                return (
                  <li key={`${liga}-${tym}`} role="option">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-zinc-200 transition-colors hover:bg-[var(--hut-bg)]"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onVybrat(liga, tym);
                        setDotaz("");
                        setOtevreno(false);
                      }}
                    >
                      <TymLogoOblast size={28} url={u} nazevTymu={tym} />
                      <span className="min-w-0 flex-1 truncate">{tym}</span>
                      <span
                        className="shrink-0 rounded-md border border-[var(--hut-border)] bg-[var(--hut-bg)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--hut-muted)]"
                        title={LIGA_ZOBRAZENI[liga]}
                      >
                        {liga}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
