"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { nactiDynamickeTypyKaret } from "@/lib/hutdbTypKaretDynamicDb";
import type { HutDbTypKarty } from "@/lib/hutdbTypKaret";
import { hutdbTypyKaretVTriPoradi } from "@/lib/hutdbTypKaret";
import {
  aliasMapZDynamickychRadku,
  sloucitStaticADynamickeTypy,
} from "@/lib/hutdbTypKaretMerge";

function seradTypyKaret(rows: readonly HutDbTypKarty[]): HutDbTypKarty[] {
  return [...rows].sort((a, b) => a.jmenoCs.localeCompare(b.jmenoCs, "cs"));
}

export function useMergedTypyKaret() {
  const { user, session, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const staticRadky = useMemo<HutDbTypKarty[]>(() => hutdbTypyKaretVTriPoradi(), []);

  const [typyKaret, setTypyKaret] = useState<HutDbTypKarty[]>(staticRadky);
  const [aliasMapZBaze, setAliasMapZBaze] = useState<Record<string, string>>({});

  const nactiDynamicke = useCallback(async () => {
    if (authLoading) return { error: null as string | null };
    if (!user || !session) {
      setTypyKaret(staticRadky);
      setAliasMapZBaze({});
      return { error: null };
    }

    let lastError: string | null = null;
    for (let pokus = 0; pokus < 2; pokus++) {
      if (pokus > 0) {
        await new Promise((r) => window.setTimeout(r, 600));
      }
      const { data, error } = await nactiDynamickeTypyKaret(supabase);
      if (!error) {
        setTypyKaret(seradTypyKaret(sloucitStaticADynamickeTypy(staticRadky, data)));
        setAliasMapZBaze(aliasMapZDynamickychRadku(data));
        return { error: null };
      }
      lastError = error;
      console.warn(`hut_typy_karet_dynamic (pokus ${pokus + 1}):`, error);
    }

    setTypyKaret(staticRadky);
    setAliasMapZBaze({});
    return { error: lastError };
  }, [supabase, staticRadky, authLoading, user, session]);

  useEffect(() => {
    void nactiDynamicke();
  }, [nactiDynamicke]);

  const refreshDynamic = useCallback(async () => {
    return nactiDynamicke();
  }, [nactiDynamicke]);

  return { typyKaret, aliasMapZBaze, refreshDynamic };
}
