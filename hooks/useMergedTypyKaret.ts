"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { nactiDynamickeTypyKaret } from "@/lib/hutdbTypKaretDynamicDb";
import type { HutDbTypKarty } from "@/lib/hutdbTypKaret";
import { hutdbTypyKaretVTriPoradi } from "@/lib/hutdbTypKaret";
import {
  aliasMapZDynamickychRadku,
  sloucitStaticADynamickeTypy,
  type DynamicTypKartyDbRow,
} from "@/lib/hutdbTypKaretMerge";

export function useMergedTypyKaret() {
  const supabase = useMemo(() => createClient(), []);
  const staticRadky = useMemo<HutDbTypKarty[]>(() => hutdbTypyKaretVTriPoradi(), []);

  const [typyKaret, setTypyKaret] = useState<HutDbTypKarty[]>(staticRadky);
  const [aliasMapZBaze, setAliasMapZBaze] = useState<Record<string, string>>({});

  const nactiDynamicke = useCallback(async () => {
    const { data, error } = await nactiDynamickeTypyKaret(supabase);
    if (error) {
      console.warn("hut_typy_karet_dynamic:", error);
      setTypyKaret(staticRadky);
      setAliasMapZBaze({});
      return { error };
    }
    const rows = data;
    setTypyKaret(sloucitStaticADynamickeTypy(staticRadky, rows));
    setAliasMapZBaze(aliasMapZDynamickychRadku(rows));
    return { error: null as string | null };
  }, [supabase, staticRadky]);

  useEffect(() => {
    void nactiDynamicke();
  }, [nactiDynamicke]);

  const refreshDynamic = useCallback(async () => {
    return nactiDynamicke();
  }, [nactiDynamicke]);

  return { typyKaret, aliasMapZBaze, refreshDynamic };
}
