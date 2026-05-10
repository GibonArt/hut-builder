"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { HutDbTypKarty } from "@/lib/hutdbTypKaret";
import { hutdbTypyKaretVTriPoradi } from "@/lib/hutdbTypKaret";
import {
  sloucitStaticADynamickeTypy,
  type DynamicTypKartyDbRow,
} from "@/lib/hutdbTypKaretMerge";

export function useMergedTypyKaret() {
  const supabase = useMemo(() => createClient(), []);
  const staticRadky = useMemo<HutDbTypKarty[]>(() => hutdbTypyKaretVTriPoradi(), []);

  const [typyKaret, setTypyKaret] = useState<HutDbTypKarty[]>(staticRadky);

  const nactiDynamicke = useCallback(async () => {
    const { data, error } = await supabase
      .from("hut_typy_karet_dynamic")
      .select("hodnota_filtru,jmeno_cs,combo_soubor");
    if (error) {
      console.warn("hut_typy_karet_dynamic:", error.message);
      setTypyKaret(staticRadky);
      return { error: error.message as string };
    }
    setTypyKaret(
      sloucitStaticADynamickeTypy(staticRadky, (data ?? []) as DynamicTypKartyDbRow[]),
    );
    return { error: null as string | null };
  }, [supabase, staticRadky]);

  useEffect(() => {
    void nactiDynamicke();
  }, [nactiDynamicke]);

  const refreshDynamic = useCallback(async () => {
    await nactiDynamicke();
  }, [nactiDynamicke]);

  return { typyKaret, refreshDynamic };
}
