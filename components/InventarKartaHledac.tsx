"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { HutCard } from "@/types";
import { HUT_POZICE_ZKRATKA } from "@/lib/hutPozice";

const MAX_VYSLEDKU = 20;

const inputClass =
  "box-border min-h-11 w-full min-w-0 max-w-full rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] px-3 py-2.5 text-base text-white outline-none transition-[border-color,box-shadow] focus:border-[var(--hut-focus)]/70 focus:ring-2 focus:ring-[var(--hut-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:py-2 sm:text-sm";

function popisekKarty(k: HutCard): string {
  return `${k.jmeno} · ${k.ovr} OVR · ${HUT_POZICE_ZKRATKA[k.pozice]} · ${k.tym}`;
}

function shodaKarta(k: HutCard, dotaz: string): boolean {
  const q = dotaz.trim().toLowerCase();
  if (!q) return true;
  const hay = `${k.jmeno} ${k.tym} ${HUT_POZICE_ZKRATKA[k.pozice]} ${k.ovr}`.toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((t) => hay.includes(t));
}

type Props = {
  id: string;
  karty: readonly HutCard[];
  value: string;
  onChange: (kartaId: string) => void;
  disabled?: boolean;
};

export function InventarKartaHledac({ id, karty, value, onChange, disabled }: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [dotaz, setDotaz] = useState("");
  const [otevreno, setOtevreno] = useState(false);

  const vybrana = useMemo(
    () => (value ? (karty.find((k) => k.id === value) ?? null) : null),
    [karty, value],
  );

  const filtrovane = useMemo(() => {
    const q = dotaz.trim();
    const out: HutCard[] = [];
    for (const k of karty) {
      if (!shodaKarta(k, q)) continue;
      out.push(k);
      if (out.length >= MAX_VYSLEDKU) break;
    }
    return out;
  }, [karty, dotaz]);

  const zobrazPanel = otevreno && dotaz.trim().length > 0;

  useEffect(() => {
    if (!otevreno) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOtevreno(false);
        if (vybrana) setDotaz(popisekKarty(vybrana));
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [otevreno, vybrana]);

  useEffect(() => {
    if (vybrana) {
      setDotaz(popisekKarty(vybrana));
    } else {
      setDotaz("");
    }
  }, [vybrana]);

  const vyber = (kartaId: string) => {
    onChange(kartaId);
    if (!kartaId) {
      setDotaz("");
    } else {
      const k = karty.find((c) => c.id === kartaId);
      setDotaz(k ? popisekKarty(k) : "");
    }
    setOtevreno(false);
  };

  const zrusitVyber = () => {
    vyber("");
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <input
        id={id}
        type="search"
        autoComplete="off"
        disabled={disabled}
        value={dotaz}
        onChange={(e) => {
          const v = e.target.value;
          setDotaz(v);
          setOtevreno(true);
          if (!v.trim()) {
            onChange("");
            return;
          }
          if (value) onChange("");
        }}
        onFocus={() => {
          setOtevreno(true);
          if (vybrana && dotaz === popisekKarty(vybrana)) {
            setDotaz("");
          }
        }}
        placeholder={
          karty.length === 0
            ? "Inventář je prázdný"
            : "Hledat jméno, tým, OVR, pozici…"
        }
        aria-autocomplete="list"
        aria-expanded={zobrazPanel}
        aria-controls={zobrazPanel ? listId : undefined}
        className={[inputClass, value && !disabled ? "pr-10" : ""].filter(Boolean).join(" ")}
      />

      {value && !disabled ? (
        <button
          type="button"
          title="Odstranit výběr hráče"
          aria-label="Odstranit výběr hráče"
          onClick={zrusitVyber}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 touch-manipulation items-center justify-center rounded-md text-lg leading-none text-[var(--hut-muted)] transition-colors hover:bg-white/10 hover:text-white"
        >
          ×
        </button>
      ) : null}

      {zobrazPanel ? (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-hidden rounded-xl border border-[var(--hut-border)] bg-[var(--hut-surface-raised)] py-1 shadow-xl shadow-black/50"
        >
          <ul className="max-h-60 overflow-y-auto px-1">
            <li role="option">
              <button
                type="button"
                className={[
                  "flex w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                  !value
                    ? "bg-[var(--hut-focus)]/15 font-medium text-white"
                    : "text-zinc-200 hover:bg-[var(--hut-bg)]",
                ].join(" ")}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => vyber("")}
              >
                Všichni hráči
              </button>
            </li>
            {filtrovane.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-[var(--hut-muted)]">
                Žádná shoda — zkus jiný text.
              </li>
            ) : (
              filtrovane.map((k) => (
                <li key={k.id} role="option">
                  <button
                    type="button"
                    className={[
                      "flex w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                      k.id === value
                        ? "bg-[var(--hut-focus)]/15 font-medium text-white"
                        : "text-zinc-200 hover:bg-[var(--hut-bg)]",
                    ].join(" ")}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => vyber(k.id)}
                  >
                    {popisekKarty(k)}
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
