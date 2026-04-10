"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { NarodnostVolba } from "@/lib/narodnosti";
import { vlajkaZeme } from "@/lib/narodnosti";

type Props = {
  id: string;
  volby: readonly NarodnostVolba[];
  value: string;
  onChange: (kod: string) => void;
  disabled?: boolean;
  describedBy?: string;
};

export function NarodnostVyber({
  id,
  volby,
  value,
  onChange,
  disabled,
  describedBy,
}: Props) {
  const listId = useId();
  const [otevreno, setOtevreno] = useState(false);
  const [filtr, setFiltr] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const vybrany = useMemo(
    () => volby.find((v) => v.code === value) ?? null,
    [volby, value],
  );

  const filtrovane = useMemo(() => {
    const q = filtr.trim().toLowerCase();
    if (!q) return [...volby];
    return volby.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q),
    );
  }, [volby, filtr]);

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

  const jeVSeznamu = volby.some((v) => v.code === value);
  const nacitam = volby.length === 0;

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
        <span
          className="flex h-9 w-10 shrink-0 items-center justify-center text-2xl leading-none"
          aria-hidden
        >
          {nacitam
            ? "…"
            : jeVSeznamu && vybrany
              ? vlajkaZeme(vybrany.code)
              : "—"}
        </span>
        <span className="min-w-0 flex-1 truncate">
          {nacitam
            ? "Načítám seznam států…"
            : jeVSeznamu && vybrany
              ? vybrany.label
              : value.trim()
                ? value
                : "Vyberte stát"}
        </span>
        <span className="shrink-0 text-[var(--hut-muted)]" aria-hidden>
          {otevreno ? "▲" : "▼"}
        </span>
      </button>

      {otevreno ? (
        <div
          className="absolute left-0 right-0 z-50 mt-1 max-h-80 overflow-hidden rounded-xl border border-[var(--hut-border)] bg-[var(--hut-surface-raised)] py-2 shadow-xl shadow-black/50"
          role="listbox"
          id={listId}
        >
          <div className="border-b border-[var(--hut-border)] px-2 pb-2">
            <input
              type="search"
              value={filtr}
              onChange={(e) => setFiltr(e.target.value)}
              placeholder="Hledat stát…"
              className="w-full rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg)] px-2 py-1.5 text-sm text-white placeholder:text-[var(--hut-muted)]/50 focus:border-[var(--hut-focus)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--hut-focus-ring)]"
              autoFocus
            />
          </div>
          <ul className="max-h-56 overflow-y-auto px-1 pt-1">
            <li role="option" aria-selected={!value.trim()}>
              <button
                type="button"
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                  !value.trim()
                    ? "bg-[var(--hut-focus)]/15 text-white"
                    : "text-zinc-200 hover:bg-[var(--hut-bg)]"
                }`}
                onClick={() => {
                  onChange("");
                  setOtevreno(false);
                }}
              >
                <span className="flex h-7 w-8 shrink-0 items-center justify-center text-[var(--hut-muted)]">
                  —
                </span>
                <span className="min-w-0 flex-1 truncate text-[var(--hut-muted)]">
                  Vyberte stát
                </span>
              </button>
            </li>
            {filtrovane.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--hut-muted)]">
                Žádný stát neodpovídá filtru.
              </li>
            ) : (
              filtrovane.map((r) => {
                const vybranyRadek = r.code === value;
                return (
                  <li key={r.code} role="option" aria-selected={vybranyRadek}>
                    <button
                      type="button"
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                        vybranyRadek
                          ? "bg-[var(--hut-focus)]/15 text-white"
                          : "text-zinc-200 hover:bg-[var(--hut-bg)]"
                      }`}
                      onClick={() => {
                        onChange(r.code);
                        setOtevreno(false);
                      }}
                    >
                      <span
                        className="flex h-7 w-8 shrink-0 items-center justify-center text-xl leading-none"
                        aria-hidden
                      >
                        {vlajkaZeme(r.code)}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{r.label}</span>
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
