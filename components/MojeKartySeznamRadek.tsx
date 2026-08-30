"use client";

import { celeJmenoHrace, type HutCard } from "@/types";
import { formatovatPlatVMil } from "@/lib/platMiliony";
import { useTypKartyMetaOpts } from "@/components/TypKartyMetaOptsContext";
import { zobrazitelnyNazevTypuKarty } from "@/lib/hutdbTypKaret";
import { HUT_POZICE_ZKRATKA } from "@/lib/hutPozice";

/** Sdílená mřížka hlavičky i řádků — sloupce zarovnané. */
export const MOJE_KARTY_SEZNAM_GRID =
  "grid grid-cols-[2.25rem_minmax(7rem,1.25fr)_2rem_1.75rem_3.25rem_3.5rem_minmax(4.5rem,1fr)_minmax(4rem,0.9fr)_4.75rem_auto] items-center gap-x-2 sm:gap-x-3";

const bunkaClass = "min-w-0 truncate text-xs text-zinc-200 sm:text-[13px]";

const btnClass =
  "rounded border px-2 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45";

type Props = {
  karta: HutCard;
  onEditovat: (k: HutCard) => void;
  onDuplikovat: (k: HutCard) => void;
  onSmazat: (id: string) => void;
  onProdanoChange: (k: HutCard, prodano: boolean) => void;
  meniProdanoId: string | null;
  mazuId: string | null;
  formZakazany: boolean;
};

export function MojeKartySeznamRadek({
  karta: k,
  onEditovat,
  onDuplikovat,
  onSmazat,
  onProdanoChange,
  meniProdanoId,
  mazuId,
  formZakazany,
}: Props) {
  const typKartyMetaOpts = useTypKartyMetaOpts();
  const prodanoUklada = meniProdanoId === k.id;
  const mazeSe = mazuId === k.id;
  const typLabel = zobrazitelnyNazevTypuKarty(k.typKarty, typKartyMetaOpts ?? undefined);
  const pozice = HUT_POZICE_ZKRATKA[k.pozice] ?? k.pozice;

  return (
    <li
      className={`${MOJE_KARTY_SEZNAM_GRID} border-b border-[var(--hut-border)]/60 px-2 py-1.5 last:border-0 hover:bg-white/[0.03] sm:px-3 sm:py-2 ${
        k.prodano ? "opacity-75" : ""
      }`}
    >
      <span
        className="text-center text-sm font-bold tabular-nums text-white"
        title="OVR"
      >
        {k.ovr}
      </span>

      <span className={bunkaClass} title={celeJmenoHrace(k)}>
        {celeJmenoHrace(k)}
      </span>

      <span className={`${bunkaClass} font-mono tabular-nums`} title="Pozice">
        {pozice}
      </span>

      <span className={`${bunkaClass} font-mono uppercase`} title="Preferovaná ruka">
        {k.preferovanaRuka}
      </span>

      <span className={`${bunkaClass} tabular-nums`} title="Plat">
        {formatovatPlatVMil(k.plat)}
      </span>

      <span className={bunkaClass} title="Národnost">
        {k.narodnost || "—"}
      </span>

      <span className={bunkaClass} title="Tým">
        {k.tym || "—"}
      </span>

      <span className={bunkaClass} title="Typ karty">
        {typLabel}
      </span>

      <label
        className={`flex cursor-pointer items-center gap-1 ${
          prodanoUklada ? "opacity-60" : ""
        }`}
        title="Prodáno — nepočítá se v optimalizátoru"
      >
        <span className="sr-only">Prodáno</span>
        <input
          type="checkbox"
          className="h-3.5 w-3.5 shrink-0 rounded border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] text-[var(--hut-lime)] focus:ring-[var(--hut-focus-ring)]"
          checked={k.prodano === true}
          disabled={formZakazany || prodanoUklada || mazeSe}
          onChange={(e) => onProdanoChange(k, e.target.checked)}
        />
        <span className="hidden text-[11px] text-zinc-300 xl:inline">Prodáno</span>
      </label>

      <div className="flex flex-wrap items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => onEditovat(k)}
          disabled={formZakazany || mazeSe}
          className={`${btnClass} border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]/80 text-zinc-200 hover:border-zinc-500 hover:text-white`}
        >
          Editovat
        </button>
        <button
          type="button"
          onClick={() => onDuplikovat(k)}
          disabled={formZakazany || mazeSe}
          className={`${btnClass} border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]/80 text-zinc-200 hover:border-zinc-500 hover:text-white`}
        >
          Duplikovat
        </button>
        <button
          type="button"
          onClick={() => onSmazat(k.id)}
          disabled={formZakazany || mazeSe}
          className={`${btnClass} border-red-500/35 bg-red-950/30 text-red-200 hover:border-red-400/50 hover:bg-red-950/50`}
        >
          {mazeSe ? "Mažu…" : "Smazat"}
        </button>
      </div>
    </li>
  );
}

/** Hlavička sloupců pro tabulkové zobrazení seznamu. */
export function MojeKartySeznamHlava() {
  return (
    <div
      className={`${MOJE_KARTY_SEZNAM_GRID} border-b border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]/50 px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--hut-muted)] sm:px-3`}
      aria-hidden
    >
      <span className="text-center">OVR</span>
      <span>Jméno</span>
      <span>Poz</span>
      <span>Ruka</span>
      <span>Plat</span>
      <span>Nár</span>
      <span>Tým</span>
      <span>Typ</span>
      <span>Prodáno</span>
      <span className="text-right">Akce</span>
    </div>
  );
}
