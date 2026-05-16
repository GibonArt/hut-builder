"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { nactiNapoveduHracu } from "@/lib/eaRatingsDb";
import { filtrujJmenaPodleDotazu, sestavUnikatniJmena } from "@/lib/jmenaNapoveda";
import type { HutCard } from "@/types";

type Props = {
  id?: string;
  value: string;
  onChange: (jmeno: string) => void;
  disabled?: boolean;
  userId: string | null;
  vlastniKarty: readonly HutCard[];
  /** Po uložení karty znovu načte jména z DB. */
  inventarPocet: number;
  inputClassName?: string;
  required?: boolean;
  placeholder?: string;
};

export function JmenoKartyNapoveda({
  id: idProp,
  value,
  onChange,
  disabled,
  userId,
  vlastniKarty,
  inventarPocet,
  inputClassName,
  required,
  placeholder = "Connor McDavid",
}: Props) {
  const generatedId = useId();
  const inputId = idProp ?? generatedId;
  const listId = `${inputId}-list`;
  const supabase = useMemo(() => createClient(), []);
  const rootRef = useRef<HTMLDivElement>(null);

  const [zNapovedy, setZNapovedy] = useState<readonly { jmeno: string }[]>([]);
  const [nacitam, setNacitam] = useState(false);
  const [otevreno, setOtevreno] = useState(false);
  const [vybranyIdx, setVybranyIdx] = useState(0);

  const nactiJmena = useCallback(async () => {
    if (!userId) {
      setZNapovedy([]);
      return;
    }
    setNacitam(true);
    const { data, error } = await nactiNapoveduHracu(supabase, {
      nacistAgregaciZeVsechKaret: true,
    });
    setNacitam(false);
    if (!error) setZNapovedy(data);
  }, [supabase, userId]);

  useEffect(() => {
    void nactiJmena();
  }, [nactiJmena, inventarPocet]);

  const vsechnaJmena = useMemo(
    () => sestavUnikatniJmena(vlastniKarty, zNapovedy),
    [vlastniKarty, zNapovedy],
  );

  const vysledky = useMemo(
    () => filtrujJmenaPodleDotazu(vsechnaJmena, value),
    [vsechnaJmena, value],
  );

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
      onChange(vysledky[vybranyIdx]!);
      setOtevreno(false);
    } else if (e.key === "Escape") {
      setOtevreno(false);
    }
  };

  const maNapovedu = Boolean(userId) && vsechnaJmena.length > 0;

  return (
    <div ref={rootRef} className="relative min-w-0">
      <input
        id={inputId}
        type="text"
        required={required}
        disabled={disabled}
        autoComplete="off"
        list={maNapovedu && !otevreno ? listId : undefined}
        className={inputClassName}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOtevreno(true);
        }}
        onFocus={() => value.trim() && setOtevreno(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
      />
      {maNapovedu && !otevreno ? (
        <datalist id={listId}>
          {vsechnaJmena.map((j) => (
            <option key={j} value={j} />
          ))}
        </datalist>
      ) : null}
      {otevreno && vysledky.length > 0 ? (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-lg border border-[var(--hut-border)] bg-[var(--hut-surface)] py-1 shadow-xl"
        >
          {vysledky.map((j, idx) => (
            <li key={j} role="option" aria-selected={idx === vybranyIdx}>
              <button
                type="button"
                className={[
                  "w-full px-3 py-2 text-left text-sm transition-colors",
                  idx === vybranyIdx
                    ? "bg-[var(--hut-surface-raised)] text-white"
                    : "text-zinc-200 hover:bg-[var(--hut-surface-raised)]/70",
                ].join(" ")}
                onMouseEnter={() => setVybranyIdx(idx)}
                onClick={() => {
                  onChange(j);
                  setOtevreno(false);
                }}
              >
                {j}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {userId && !nacitam && vsechnaJmena.length > 0 ? (
        <p className="mt-1 text-[10px] leading-snug text-[var(--hut-muted)]/75">
          Nápověda: {vsechnaJmena.length} jmen z tvých karet a databáze (EA + komunita).
        </p>
      ) : null}
    </div>
  );
}