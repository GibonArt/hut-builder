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

  useEffect(() => {
    const auth = createAuthClient();
    const data = createDataClient(sezona);
    setDataClient(data);

    const syncSession = async () => {
      const { data: sess } = await auth.auth.getSession();
      if (sess.session) {
        await data.auth.setSession({
          access_token: sess.session.access_token,
          refresh_token: sess.session.refresh_token,
        });
      } else {
        await data.auth.signOut();
      }
    };

    void syncSession();
    const {
      data: { subscription },
    } = auth.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        if (session) {
          await data.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });
        } else {
          await data.auth.signOut();
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, [sezona]);

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
