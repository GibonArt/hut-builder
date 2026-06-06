"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useMergedTypyKaret } from "@/hooks/useMergedTypyKaret";
import type { HutDbTypKarty } from "@/lib/hutdbTypKaret";

/** Dispatched after card-type sync so listeners reload the catalog from Supabase. */
export const HUT_TYPY_KARET_SYNC_EVENT = "hut:typy-karet-sync";

export function signalizujSyncTypuKaret(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(HUT_TYPY_KARET_SYNC_EVENT));
}

type TypyKaretContextValue = {
  typyKaret: HutDbTypKarty[];
  aliasMapZBaze: Record<string, string>;
  refreshDynamic: () => Promise<{ error: string | null }>;
};

const TypyKaretContext = createContext<TypyKaretContextValue | null>(null);

export function TypyKaretProvider({ children }: { children: ReactNode }) {
  const { typyKaret, aliasMapZBaze, refreshDynamic } = useMergedTypyKaret();

  useEffect(() => {
    const obnovit = () => {
      void refreshDynamic();
    };
    window.addEventListener(HUT_TYPY_KARET_SYNC_EVENT, obnovit);
    return () => window.removeEventListener(HUT_TYPY_KARET_SYNC_EVENT, obnovit);
  }, [refreshDynamic]);

  const value = useMemo(
    () => ({ typyKaret, aliasMapZBaze, refreshDynamic }),
    [typyKaret, aliasMapZBaze, refreshDynamic],
  );

  return <TypyKaretContext.Provider value={value}>{children}</TypyKaretContext.Provider>;
}

/** Merged card-type catalog (static + Supabase) shared across the app. */
export function useTypyKaret(): TypyKaretContextValue {
  const ctx = useContext(TypyKaretContext);
  if (!ctx) {
    throw new Error("useTypyKaret requires TypyKaretProvider in app/layout.tsx.");
  }
  return ctx;
}

/** Alias for useTypyKaret().refreshDynamic */
export function useObnovitTypyKaret(): () => Promise<{ error: string | null }> {
  const { refreshDynamic } = useTypyKaret();
  return useCallback(() => refreshDynamic(), [refreshDynamic]);
}
