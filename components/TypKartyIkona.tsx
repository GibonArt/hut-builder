"use client";

import { useEffect, useState } from "react";
import {
  najdiMetaTypuKarty,
  urlLogaTypuKarty,
  zobrazitelnyNazevTypuKarty,
} from "@/lib/hutdbTypKaret";

/**
 * Ikona typu karty (lokální / Supabase combos) — čtverec jako na hutdb chemistry.
 */
export function TypKartyIkonaVCtverci({
  comboSoubor,
  nazev,
  velikost = "rada",
  zlatyOkraj = false,
}: {
  comboSoubor: string | null;
  nazev: string;
  velikost?: "rada" | "mrizka" | "seznam" | "kombinace";
  zlatyOkraj?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const url = urlLogaTypuKarty(comboSoubor);

  useEffect(() => {
    setBroken(false);
  }, [comboSoubor]);
  const box =
    velikost === "kombinace"
      ? "h-11 w-11"
      : velikost === "mrizka"
        ? "h-11 w-11 sm:h-12 sm:w-12"
        : velikost === "seznam"
          ? "h-7 w-7"
          : "h-9 w-9 sm:h-10 sm:w-10";
  const okraj = zlatyOkraj
    ? "border-[color-mix(in_srgb,var(--hut-gold)_55%,transparent)] ring-2 ring-[color-mix(in_srgb,var(--hut-gold)_35%,transparent)] shadow-[0_0_14px_rgba(212,175,55,0.12)]"
    : "border-[var(--hut-border)]";

  return (
    <span
      className={`group inline-flex shrink-0 ${box} items-center justify-center overflow-hidden rounded-lg border bg-gradient-to-b from-zinc-900/95 to-black ${okraj}`}
      title={nazev}
    >
      {url && !broken ? (
        <img
          src={url}
          alt=""
          className={`block h-full w-full min-h-0 min-w-0 object-contain transition-opacity ${
            velikost === "seznam" ? "p-1" : "p-1.5"
          } ${
            zlatyOkraj
              ? "opacity-100"
              : "opacity-90 hover:opacity-100 group-hover:opacity-100"
          }`}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
      ) : comboSoubor === null ? (
        <span
          className="line-clamp-3 max-h-full w-full overflow-hidden px-0.5 text-center text-[6px] font-semibold leading-[1.1] tracking-tight text-zinc-400 break-words hyphens-auto"
          title={nazev}
        >
          {nazev}
        </span>
      ) : (
        <span className="px-0.5 text-center text-[7px] font-semibold uppercase leading-tight tracking-tight text-zinc-500">
          {nazev.slice(0, 4)}
        </span>
      )}
    </span>
  );
}

export function TypKartyMiniLogo({
  ulozeno,
  velikost = "rada",
}: {
  ulozeno: string;
  /** `seznam` = menší čtverec (např. řádek karty vedle vlajky a loga týmu). `kombinace` = stejný čtverec jako náhled bonusů (11×11). */
  velikost?: "rada" | "seznam" | "mrizka" | "kombinace";
}) {
  const meta = najdiMetaTypuKarty(ulozeno);
  return (
    <TypKartyIkonaVCtverci
      comboSoubor={meta?.comboSoubor ?? null}
      nazev={zobrazitelnyNazevTypuKarty(ulozeno)}
      velikost={velikost}
    />
  );
}
