"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createAuthClient,
  createDataClient,
} from "@/lib/supabase/client";
import {
  cestaSezony,
  labelSezony,
  type Sezona,
} from "@/lib/sezona";
import { hutbuilderConfigProSezonu, type HutbuilderSezonaConfig } from "@/lib/hutbuilderSezonaConfig";
import { jeNhl27DataNakonfigurovano } from "@/lib/supabase/env";

type SezonaContextValue = {
  sezona: Sezona;
  label: string;
  /** Datový Supabase klient pro aktuální sezónu. */
  supabase: SupabaseClient;
  hutbuilder: HutbuilderSezonaConfig;
  cesta: (path?: string) => string;
  nhl27DbChybi: boolean;
};

const SezonaContext = createContext<SezonaContextValue | null>(null);

export function SezonaProvider({
  sezona,
  children,
}: {
  sezona: Sezona;
  children: ReactNode;
}) {
  const [dataClient, setDataClient] = useState<SupabaseClient>(() =>
    createDataClient(sezona),
  );
  /** Po auth změně přegeneruj data klienta (accessToken callback čte aktuální session). */
  const [authTick, setAuthTick] = useState(0);

  useEffect(() => {
    setDataClient(createDataClient(sezona));
  }, [sezona, authTick]);

  useEffect(() => {
    const auth = createAuthClient();
    const {
      data: { subscription },
    } = auth.auth.onAuthStateChange(() => {
      setAuthTick((n) => n + 1);
    });
    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<SezonaContextValue>(
    () => ({
      sezona,
      label: labelSezony(sezona),
      supabase: dataClient,
      hutbuilder: hutbuilderConfigProSezonu(sezona),
      cesta: (path = "") => cestaSezony(sezona, path),
      nhl27DbChybi: sezona === "nhl27" && !jeNhl27DataNakonfigurovano(),
    }),
    [sezona, dataClient],
  );

  return (
    <SezonaContext.Provider value={value}>{children}</SezonaContext.Provider>
  );
}

export function useSezona(): SezonaContextValue {
  const ctx = useContext(SezonaContext);
  if (!ctx) {
    throw new Error("useSezona vyžaduje SezonaProvider (stránky pod /nhl26 nebo /nhl27).");
  }
  return ctx;
}

/** Datový klient — alias pro useSezona().supabase. */
export function useDataSupabase(): SupabaseClient {
  return useSezona().supabase;
}
