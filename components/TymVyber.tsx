"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Liga } from "@/types";
import { urlLogaTymu } from "@/lib/tymLoga";
import { TymLogoOblast } from "@/components/TymLogo";

type Props = {
  id: string;
  liga: Liga;
  tymy: readonly string[];
  value: string;
  onChange: (tym: string) => void;
  disabled?: boolean;
  describedBy?: string;
};

export function TymVyber({
  id,
  liga,
  tymy,
  value,
  onChange,
  disabled,
  describedBy,
}: Props) {
  const listId = useId();
  const [otevreno, setOtevreno] = useState(false);
  const [filtr, setFiltr] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const filtrovane = useMemo(() => {
    const q = filtr.trim().toLowerCase();
    if (!q) return [...tymy];
    return tymy.filter((t) => t.toLowerCase().includes(q));
  }, [tymy, filtr]);

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

  useEffect(() => {
    if (!otevreno) setFiltr("");
  }, [otevreno]);

  const logoUrlVybraneho = value ? urlLogaTymu(value, liga) : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={otevreno}
        aria-controls={listId}
        aria-describedby={describedBy}
        onClick={() => !disabled && setOtevreno((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOtevreno(false);
        }}
        className="flex h-14 min-h-14 w-full items-center gap-3 rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] px-3 py-0 text-left text-sm text-white outline-none transition-[border-color,box-shadow] focus:border-[var(--hut-focus)]/70 focus:ring-2 focus:ring-[var(--hut-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <TymLogoOblast
          size={32}
          url={logoUrlVybraneho}
          nazevTymu={value || "?"}
        />
        <span className="min-w-0 flex-1 truncate">
          {value || "Vyberte tým z nabídky"}
        </span>
        <span className="shrink-0 text-[var(--hut-muted)]" aria-hidden>
          {otevreno ? "▲" : "▼"}
        </span>
      </button>

      {otevreno ? (
        <div
          className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-hidden rounded-xl border border-[var(--hut-border)] bg-[var(--hut-surface-raised)] py-2 shadow-xl shadow-black/50"
          role="listbox"
          id={listId}
        >
          <div className="border-b border-[var(--hut-border)] px-2 pb-2">
            <input
              type="search"
              value={filtr}
              onChange={(e) => setFiltr(e.target.value)}
              placeholder="Hledat tým…"
              className="w-full rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg)] px-2 py-1.5 text-sm text-white placeholder:text-[var(--hut-muted)]/50 focus:border-[var(--hut-focus)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--hut-focus-ring)]"
              autoFocus
            />
          </div>
          <ul className="max-h-52 overflow-y-auto px-1 pt-1">
            {filtrovane.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--hut-muted)]">
                Žádný tým neodpovídá filtru.
              </li>
            ) : (
              filtrovane.map((t) => {
                const u = urlLogaTymu(t, liga);
                const vybrany = t === value;
                return (
                  <li key={t} role="option" aria-selected={vybrany}>
                    <button
                      type="button"
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                        vybrany
                          ? "bg-[var(--hut-focus)]/15 text-white"
                          : "text-zinc-200 hover:bg-[var(--hut-bg)]"
                      }`}
                      onClick={() => {
                        onChange(t);
                        setOtevreno(false);
                      }}
                    >
                      <TymLogoOblast size={28} url={u} nazevTymu={t} />
                      <span className="min-w-0 flex-1 truncate">{t}</span>
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
