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
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const staticRadky = useMemo<HutDbTypKarty[]>(() => hutdbTypyKaretVTriPoradi(), []);

  const [typyKaret, setTypyKaret] = useState<HutDbTypKarty[]>(staticRadky);
  const [aliasMapZBaze, setAliasMapZBaze] = useState<Record<string, string>>({});

  const nactiDynamicke = useCallback(async () => {
    if (authLoading) return { error: null as string | null };
    if (!user) {
      setTypyKaret(staticRadky);
      setAliasMapZBaze({});
      return { error: null };
    }

    const { data, error } = await nactiDynamickeTypyKaret(supabase);
    if (error) {
      console.warn("hut_typy_karet_dynamic:", error);
      setTypyKaret(staticRadky);
      setAliasMapZBaze({});
      return { error };
    }
    setTypyKaret(seradTypyKaret(sloucitStaticADynamickeTypy(staticRadky, data)));
    setAliasMapZBaze(aliasMapZDynamickychRadku(data));
    return { error: null };
  }, [supabase, staticRadky, authLoading, user]);

  useEffect(() => {
    void nactiDynamicke();
  }, [nactiDynamicke]);

  const refreshDynamic = useCallback(async () => {
    return nactiDynamicke();
  }, [nactiDynamicke]);

  return { typyKaret, aliasMapZBaze, refreshDynamic };
}
