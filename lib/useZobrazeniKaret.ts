"use client";

import { useCallback, useEffect, useState } from "react";

export type ZobrazeniKaret = "mrizka" | "seznam";

export const ZOBRAZENI_KARET_STORAGE_KEY = "hut-zobrazeni-karet-v1";

function parseZobrazeni(raw: string | null): ZobrazeniKaret | null {
  if (raw === "mrizka" || raw === "seznam") return raw;
  return null;
}

/** Persistované zobrazení Moje karty (mřížka / seznam). */
export function useZobrazeniKaret(): [ZobrazeniKaret, (z: ZobrazeniKaret) => void] {
  const [zobrazeni, setZobrazeni] = useState<ZobrazeniKaret>("mrizka");

  useEffect(() => {
    try {
      const v = parseZobrazeni(localStorage.getItem(ZOBRAZENI_KARET_STORAGE_KEY));
      if (v) setZobrazeni(v);
    } catch {
      /* ignore */
    }
  }, []);

  const nastav = useCallback((z: ZobrazeniKaret) => {
    setZobrazeni(z);
    try {
      localStorage.setItem(ZOBRAZENI_KARET_STORAGE_KEY, z);
    } catch {
      /* ignore */
    }
  }, []);

  return [zobrazeni, nastav];
}
