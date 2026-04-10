"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RAZENI_KARET_STORAGE_KEY,
  parseRazeniZeStorage,
  type RazeniKaret,
} from "@/lib/hutRazeniKaret";

/** Persistované řazení (localStorage), aby sedělo inventář i seznam všech karet. */
export function useRazeniKaret(): [RazeniKaret, (r: RazeniKaret) => void] {
  const [razeni, setRazeni] = useState<RazeniKaret>("pridani");

  useEffect(() => {
    try {
      const v = parseRazeniZeStorage(localStorage.getItem(RAZENI_KARET_STORAGE_KEY));
      if (v) setRazeni(v);
    } catch {
      /* ignore */
    }
  }, []);

  const nastav = useCallback((r: RazeniKaret) => {
    setRazeni(r);
    try {
      localStorage.setItem(RAZENI_KARET_STORAGE_KEY, r);
    } catch {
      /* ignore */
    }
  }, []);

  return [razeni, nastav];
}
