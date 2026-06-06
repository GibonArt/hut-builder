"use client";

import {
  forwardRef,
  useImperativeHandle,
  useState,
  startTransition,
  type ChangeEvent,
} from "react";
import { parseOvrVolitelne, parsePocetVolitelne } from "@/lib/optimalizatorFormaci";

export type TurnajFiltrySnapshot = {
  turnajPragOvrStr: string;
  turnajMaxUtokVeFormaciStr: string;
  turnajMaxUtokCelkemStr: string;
  turnajMaxObranaVeFormaciStr: string;
  turnajMaxObranaCelkemStr: string;
};

export const PRAZDNY_TURNAJ_FILTR: TurnajFiltrySnapshot = {
  turnajPragOvrStr: "",
  turnajMaxUtokVeFormaciStr: "",
  turnajMaxUtokCelkemStr: "",
  turnajMaxObranaVeFormaciStr: "",
  turnajMaxObranaCelkemStr: "",
};

export const TURNAJ_PRESET_95: TurnajFiltrySnapshot = {
  turnajPragOvrStr: "95",
  turnajMaxUtokVeFormaciStr: "1",
  turnajMaxUtokCelkemStr: "4",
  turnajMaxObranaVeFormaciStr: "2",
  turnajMaxObranaCelkemStr: "3",
};

export function jeNeplatnyTurnajovyVstup(s: TurnajFiltrySnapshot): boolean {
  const prag = parseOvrVolitelne(s.turnajPragOvrStr);
  const maLimit =
    s.turnajMaxUtokVeFormaciStr.trim() !== "" ||
    s.turnajMaxUtokCelkemStr.trim() !== "" ||
    s.turnajMaxObranaVeFormaciStr.trim() !== "" ||
    s.turnajMaxObranaCelkemStr.trim() !== "";
  return (
    (s.turnajPragOvrStr.trim() !== "" && prag === null) ||
    (maLimit && s.turnajPragOvrStr.trim() === "") ||
    (s.turnajMaxUtokVeFormaciStr.trim() !== "" && parsePocetVolitelne(s.turnajMaxUtokVeFormaciStr) === null) ||
    (s.turnajMaxUtokCelkemStr.trim() !== "" && parsePocetVolitelne(s.turnajMaxUtokCelkemStr) === null) ||
    (s.turnajMaxObranaVeFormaciStr.trim() !== "" && parsePocetVolitelne(s.turnajMaxObranaVeFormaciStr) === null) ||
    (s.turnajMaxObranaCelkemStr.trim() !== "" && parsePocetVolitelne(s.turnajMaxObranaCelkemStr) === null)
  );
}

export function maNastavenyTurnajovyFiltr(s: TurnajFiltrySnapshot): boolean {
  return (
    s.turnajPragOvrStr.trim() !== "" ||
    s.turnajMaxUtokVeFormaciStr.trim() !== "" ||
    s.turnajMaxUtokCelkemStr.trim() !== "" ||
    s.turnajMaxObranaVeFormaciStr.trim() !== "" ||
    s.turnajMaxObranaCelkemStr.trim() !== ""
  );
}

export function stejneTurnajoveFiltry(a: TurnajFiltrySnapshot, b: TurnajFiltrySnapshot): boolean {
  return (
    a.turnajPragOvrStr === b.turnajPragOvrStr &&
    a.turnajMaxUtokVeFormaciStr === b.turnajMaxUtokVeFormaciStr &&
    a.turnajMaxUtokCelkemStr === b.turnajMaxUtokCelkemStr &&
    a.turnajMaxObranaVeFormaciStr === b.turnajMaxObranaVeFormaciStr &&
    a.turnajMaxObranaCelkemStr === b.turnajMaxObranaCelkemStr
  );
}

export type LimityTurnajeFiltrHandle = {
  getSnapshot: () => TurnajFiltrySnapshot;
  setSnapshot: (s: TurnajFiltrySnapshot) => void;
  clear: () => void;
};

type Props = {
  inputClass: string;
  labelClass: string;
  onDraftChange?: () => void;
};

export const LimityTurnajeFiltr = forwardRef<LimityTurnajeFiltrHandle, Props>(
  function LimityTurnajeFiltr({ inputClass, labelClass, onDraftChange }, ref) {
    const [draft, setDraft] = useState<TurnajFiltrySnapshot>(PRAZDNY_TURNAJ_FILTR);

    const notifyParent = () => {
      startTransition(() => onDraftChange?.());
    };

    const patch = (partial: Partial<TurnajFiltrySnapshot>) => {
      setDraft((prev) => ({ ...prev, ...partial }));
      notifyParent();
    };

    useImperativeHandle(
      ref,
      () => ({
        getSnapshot: () => draft,
        setSnapshot: (s) => {
          setDraft(s);
          notifyParent();
        },
        clear: () => {
          setDraft(PRAZDNY_TURNAJ_FILTR);
          notifyParent();
        },
      }),
      [draft, onDraftChange],
    );

    const prag = parseOvrVolitelne(draft.turnajPragOvrStr);
    const maxUtokForm = parsePocetVolitelne(draft.turnajMaxUtokVeFormaciStr);
    const maxUtokCelkem = parsePocetVolitelne(draft.turnajMaxUtokCelkemStr);
    const maxObranaForm = parsePocetVolitelne(draft.turnajMaxObranaVeFormaciStr);
    const maxObranaCelkem = parsePocetVolitelne(draft.turnajMaxObranaCelkemStr);

    const onPrag = (e: ChangeEvent<HTMLInputElement>) => patch({ turnajPragOvrStr: e.target.value });

    return (
      <div className="mt-5 rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={labelClass}>Limity turnaje (počet hráčů s OVR ≥ práh)</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--hut-muted)]/95">
              Např. strop 95 OVR: max. 1× na útočnou formaci a 4× celkem v útoku, max. 3× v obraně. Počítá se
              každý hráč ve formaci s OVR ≥ práh (ne jen přesně rovno). Limity se aplikují až po kliknutí na Hledat.
            </p>
          </div>
          <button
            type="button"
            className="touch-manipulation shrink-0 rounded-lg border border-[var(--hut-border)] px-3 py-1.5 text-xs font-medium text-[var(--hut-muted)] transition-colors hover:border-zinc-500 hover:text-zinc-200"
            onClick={() => patch(TURNAJ_PRESET_95)}
          >
            Předvolba 95 OVR
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="min-w-0">
            <label htmlFor="opt-turnaj-prag" className="mb-1 block text-[10px] text-[var(--hut-muted)]">
              Práh OVR
            </label>
            <input
              id="opt-turnaj-prag"
              type="text"
              inputMode="numeric"
              placeholder="např. 95"
              value={draft.turnajPragOvrStr}
              onChange={onPrag}
              className={`${inputClass} sm:max-w-none`}
              aria-invalid={draft.turnajPragOvrStr.trim() !== "" && prag === null}
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="opt-turnaj-utok-form" className="mb-1 block text-[10px] text-[var(--hut-muted)]">
              Útok — max. ve formaci
            </label>
            <input
              id="opt-turnaj-utok-form"
              type="text"
              inputMode="numeric"
              placeholder="—"
              value={draft.turnajMaxUtokVeFormaciStr}
              onChange={(e) => patch({ turnajMaxUtokVeFormaciStr: e.target.value })}
              className={`${inputClass} sm:max-w-none`}
              aria-invalid={draft.turnajMaxUtokVeFormaciStr.trim() !== "" && maxUtokForm === null}
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="opt-turnaj-utok-celkem" className="mb-1 block text-[10px] text-[var(--hut-muted)]">
              Útok — max. v soupisce
            </label>
            <input
              id="opt-turnaj-utok-celkem"
              type="text"
              inputMode="numeric"
              placeholder="—"
              value={draft.turnajMaxUtokCelkemStr}
              onChange={(e) => patch({ turnajMaxUtokCelkemStr: e.target.value })}
              className={`${inputClass} sm:max-w-none`}
              aria-invalid={draft.turnajMaxUtokCelkemStr.trim() !== "" && maxUtokCelkem === null}
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="opt-turnaj-obrana-form" className="mb-1 block text-[10px] text-[var(--hut-muted)]">
              Obrana — max. ve formaci
            </label>
            <input
              id="opt-turnaj-obrana-form"
              type="text"
              inputMode="numeric"
              placeholder="—"
              value={draft.turnajMaxObranaVeFormaciStr}
              onChange={(e) => patch({ turnajMaxObranaVeFormaciStr: e.target.value })}
              className={`${inputClass} sm:max-w-none`}
              aria-invalid={draft.turnajMaxObranaVeFormaciStr.trim() !== "" && maxObranaForm === null}
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="opt-turnaj-obrana-celkem" className="mb-1 block text-[10px] text-[var(--hut-muted)]">
              Obrana — max. v soupisce
            </label>
            <input
              id="opt-turnaj-obrana-celkem"
              type="text"
              inputMode="numeric"
              placeholder="—"
              value={draft.turnajMaxObranaCelkemStr}
              onChange={(e) => patch({ turnajMaxObranaCelkemStr: e.target.value })}
              className={`${inputClass} sm:max-w-none`}
              aria-invalid={draft.turnajMaxObranaCelkemStr.trim() !== "" && maxObranaCelkem === null}
            />
          </div>
        </div>
      </div>
    );
  },
);
