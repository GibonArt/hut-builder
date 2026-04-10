"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { XFactorUroven } from "@/types";
import type { XFactoryKatalogPolozka } from "@/lib/xFactoryKatalog";
import { OPTION_VLASTNI } from "@/lib/xFactoryKatalog";
import {
  X_FACTOR_DEFAULT_ICON,
  iconUrlProEaShody,
  iconUrlProEaShodyAUroven,
} from "@/lib/xFactorIconsEa";

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  polozky: readonly XFactoryKatalogPolozka[];
  /** Úroveň (barva) ikony na tlačítku po výběru — z EA / uložená na kartě; výchozí zlatá. */
  urovenNaTlacitku?: XFactorUroven;
  disabled?: boolean;
  /** Třída vnějšího wrapperu (relativní pozicování). */
  className?: string;
  /** Třída tlačítka (stejná výška jako ostatní selecty). */
  triggerClassName: string;
};

function XFactorIkona({ url }: { url: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [url]);
  const src = broken ? X_FACTOR_DEFAULT_ICON : url;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      className="h-9 w-9 shrink-0 object-contain"
      onError={() => setBroken(true)}
    />
  );
}

export function XFactorVyber({
  id,
  value,
  onChange,
  polozky,
  urovenNaTlacitku = "gold",
  disabled,
  className,
  triggerClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const vybrana = polozky.find((p) => p.klic === value);
  const jeVlastni = value === OPTION_VLASTNI;
  const jePrazdne = value === "";

  const labelTlacitka = jePrazdne
    ? "— select —"
    : jeVlastni
      ? "Custom name…"
      : (vybrana?.labelEn ?? "—");

  const ikonaTlacitka = jePrazdne
    ? null
    : jeVlastni
      ? null
      : vybrana
        ? iconUrlProEaShodyAUroven(
            vybrana.eaShody,
            urovenNaTlacitku,
            vybrana.klic,
          )
        : X_FACTOR_DEFAULT_ICON;

  return (
    <div ref={rootRef} className={className ?? "relative min-w-[14rem] flex-1"}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => {
          if (!disabled) setOpen((o) => !o);
        }}
        className={triggerClassName}
      >
        <span className="flex w-full min-w-0 items-center gap-2 text-left">
          {ikonaTlacitka ? (
            <XFactorIkona url={ikonaTlacitka} />
          ) : (
            <span className="h-9 w-9 shrink-0 rounded border border-[var(--hut-border)] bg-black/30" />
          )}
          <span className="min-w-0 flex-1 truncate">{labelTlacitka}</span>
          <span className="shrink-0 text-[var(--hut-muted)]" aria-hidden>
            {open ? "▴" : "▾"}
          </span>
        </span>
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] py-1 shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
        >
          <li role="presentation" className="px-1">
            <button
              type="button"
              role="option"
              aria-selected={jePrazdne}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-[var(--hut-muted)] hover:bg-[var(--hut-surface-raised)]"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              — select —
            </button>
          </li>
          {polozky.map((p) => (
            <li key={p.klic} role="presentation" className="px-1">
              <button
                type="button"
                role="option"
                aria-selected={value === p.klic}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-white hover:bg-[var(--hut-surface-raised)]"
                onClick={() => {
                  onChange(p.klic);
                  setOpen(false);
                }}
              >
                <XFactorIkona url={iconUrlProEaShody(p.eaShody, p.klic)} />
                <span className="min-w-0 flex-1">{p.labelEn}</span>
              </button>
            </li>
          ))}
          <li role="presentation" className="border-t border-[var(--hut-border)] px-1 pt-1">
            <button
              type="button"
              role="option"
              aria-selected={jeVlastni}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-[var(--hut-muted)] hover:bg-[var(--hut-surface-raised)] hover:text-zinc-200"
              onClick={() => {
                onChange(OPTION_VLASTNI);
                setOpen(false);
              }}
            >
              <span className="h-9 w-9 shrink-0 rounded border border-dashed border-[var(--hut-border)] bg-black/20" />
              Custom name…
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
