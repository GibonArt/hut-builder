"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RAZENI_KARET_SEZNAM_STORAGE_KEY,
  parseRazeniSeznamZeStorage,
  type RazeniKaretSeznam,
} from "@/lib/hutRazeniKaret";

/** Persistované řazení pro režim Seznam na /moje-karty. */
export function useRazeniKaretSeznam(): [RazeniKaretSeznam, (r: RazeniKaretSeznam) => void] {
  const [razeni, setRazeni] = useState<RazeniKaretSeznam>("ovr-desc");

  useEffect(() => {
    try {
      const v = parseRazeniSeznamZeStorage(
        localStorage.getItem(RAZENI_KARET_SEZNAM_STORAGE_KEY),
      );
      if (v) setRazeni(v);
    } catch {
      /* ignore */
    }
  }, []);

  const nastav = useCallback((r: RazeniKaretSeznam) => {
    setRazeni(r);
    try {
      localStorage.setItem(RAZENI_KARET_SEZNAM_STORAGE_KEY, r);
    } catch {
      /* ignore */
    }
  }, []);

  return [razeni, nastav];
}
