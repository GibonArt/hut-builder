"use client";

import { useCallback, useEffect, useState } from "react";

const VYCHOZI_MIN_SKROLL = 280;

type Props = {
  /** Po kolika pixelech skrolu se tlačítko zobrazí. */
  minScrollY?: number;
};

/**
 * Plovoucí tlačítko pro hladký skrol na začátek stránky (okno).
 */
export function FloatingZpetNahoru({ minScrollY = VYCHOZI_MIN_SKROLL }: Props) {
  const [viditelne, setViditelne] = useState(false);

  const aktualizuj = useCallback(() => {
    setViditelne(
      typeof window !== "undefined" &&
        (window.scrollY || document.documentElement.scrollTop) > minScrollY,
    );
  }, [minScrollY]);

  useEffect(() => {
    aktualizuj();
    window.addEventListener("scroll", aktualizuj, { passive: true });
    return () => window.removeEventListener("scroll", aktualizuj);
  }, [aktualizuj]);

  if (!viditelne) return null;

  return (
    <button
      type="button"
      className="fixed bottom-5 right-5 z-[60] touch-manipulation rounded-full border border-[var(--hut-lime)]/45 bg-[var(--hut-bg-elevated)]/95 px-4 py-2.5 text-xs font-semibold text-[var(--hut-lime)] shadow-lg shadow-black/30 backdrop-blur-sm transition-colors hover:border-[var(--hut-lime)]/70 hover:bg-[var(--hut-lime)]/12 sm:bottom-6 sm:right-6 sm:py-2"
      onClick={() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      aria-label="Zpět nahoru"
    >
      Zpět nahoru
    </button>
  );
}
