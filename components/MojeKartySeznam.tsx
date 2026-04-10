"use client";

import { useCallback, useEffect, useMemo, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import type { HutCard, Pozice } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import {
  nactiKartyUzivatele,
  smazKartuPodleSlug,
} from "@/lib/cardsDb";
import { createClient } from "@/lib/supabase/client";
import { vsechnyNarodnostiCS } from "@/lib/narodnosti";
import { HUT_POZICE, HUT_POZICE_ZKRATKA } from "@/lib/hutPozice";
import { HutShell } from "@/components/HutShell";
import { InventarKartaPolozka } from "@/components/InventarKartaPolozka";
import { HUT_FORM_PAGE_BG } from "@/lib/hutFormBackground";
import { seraditKarty, type RazeniKaret } from "@/lib/hutRazeniKaret";
import { useRazeniKaret } from "@/lib/useRazeniKaret";

type FiltrPozice = Pozice | "vse";

function textPocetKaret(n: number): string {
  if (n === 1) return "1 karta";
  if (n >= 2 && n <= 4) return `${n} karty`;
  return `${n} karet`;
}

export function MojeKartySeznam() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [karty, setKarty] = useState<HutCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [filtrPozice, setFiltrPozice] = useState<FiltrPozice>("vse");
  const [razeniKaret, nastavRazeniKaret] = useRazeniKaret();
  const [mazuId, setMazuId] = useState<string | null>(null);

  const narodnostiVolby = useMemo(() => vsechnyNarodnostiCS(), []);

  useEffect(() => {
    if (!user?.id) {
      startTransition(() => {
        setKarty([]);
        setLoading(false);
        setChyba(null);
      });
      return;
    }

    let zruseno = false;
    startTransition(() => {
      setLoading(true);
      setChyba(null);
    });

    nactiKartyUzivatele(supabase, user.id).then(({ data, error }) => {
      if (zruseno) return;
      startTransition(() => {
        setLoading(false);
        if (error) {
          setChyba(error.message);
          setKarty([]);
          return;
        }
        setKarty(data);
      });
    });

    return () => {
      zruseno = true;
    };
  }, [user?.id, supabase]);

  const filtrovane = useMemo(() => {
    if (filtrPozice === "vse") return karty;
    return karty.filter((k) => k.pozice === filtrPozice);
  }, [karty, filtrPozice]);

  const filtrovaneSerazene = useMemo(
    () => seraditKarty(filtrovane, razeniKaret),
    [filtrovane, razeniKaret],
  );

  const editovat = useCallback(
    (k: HutCard) => {
      router.push(`/?edit=${encodeURIComponent(k.id)}`);
    },
    [router],
  );

  const smazat = useCallback(
    async (idKarty: string) => {
      if (!user?.id) return;
      setMazuId(idKarty);
      const { error } = await smazKartuPodleSlug(supabase, user.id, idKarty);
      setMazuId(null);
      if (error) {
        setChyba(error.message);
        return;
      }
      setKarty((prev) => prev.filter((k) => k.id !== idKarty));
    },
    [user?.id, supabase],
  );

  const formZakazany = !user || authLoading || mazuId !== null;

  return (
    <HutShell
      headerSectionLabel="Moje karty"
      mainStyle={HUT_FORM_PAGE_BG}
      mainInnerClassName="relative z-0 mx-auto max-w-6xl"
    >
      <div className="flex min-h-full w-full flex-col">
        <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Moje karty</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--hut-muted)] sm:text-[15px]">
          Všechny uložené karty. Filtr podle pozice a řazení podle OVR nebo pořadí přidání.
        </p>

        <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2">
          <div
            className="flex min-w-0 flex-wrap items-center gap-2"
            role="group"
            aria-label="Řazení karet"
          >
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--hut-muted)]">
              Řazení
            </span>
            {(
              [
                ["pridani", "Podle přidání"] as const,
                ["ovr-asc", "OVR ↑ nejnižší"] as const,
                ["ovr-desc", "OVR ↓ nejvyšší"] as const,
              ] satisfies readonly (readonly [RazeniKaret, string])[]
            ).map(([hodnota, label]) => (
              <button
                key={hodnota}
                type="button"
                onClick={() => nastavRazeniKaret(hodnota)}
              className={[
                "touch-manipulation rounded-full border px-3 py-2 text-xs font-medium transition-colors sm:py-1.5",
                razeniKaret === hodnota
                    ? "border-[var(--hut-focus)]/60 bg-[var(--hut-focus)]/15 text-white"
                    : "border-[var(--hut-border)] text-[var(--hut-muted)] hover:border-zinc-500 hover:text-zinc-200",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            className="flex min-w-0 flex-wrap items-center gap-2"
            role="group"
            aria-label="Filtr podle pozice"
          >
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--hut-muted)]">
              Pozice
            </span>
            <button
              type="button"
              onClick={() => setFiltrPozice("vse")}
              className={[
                "touch-manipulation rounded-full border px-3 py-2 text-xs font-medium transition-colors sm:py-1.5",
                filtrPozice === "vse"
                  ? "border-[var(--hut-focus)]/60 bg-[var(--hut-focus)]/15 text-white"
                  : "border-[var(--hut-border)] text-[var(--hut-muted)] hover:border-zinc-500 hover:text-zinc-200",
              ].join(" ")}
            >
              Všechny
            </button>
            {HUT_POZICE.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setFiltrPozice(p)}
                className={[
                  "min-h-11 min-w-[2.75rem] touch-manipulation rounded-full border px-2.5 py-2 font-mono text-xs font-semibold tabular-nums transition-colors sm:min-h-0 sm:py-1.5",
                  filtrPozice === p
                    ? "border-[var(--hut-focus)]/60 bg-[var(--hut-focus)]/15 text-white"
                    : "border-[var(--hut-border)] text-[var(--hut-muted)] hover:border-zinc-500 hover:text-zinc-200",
                ].join(" ")}
                title={p}
              >
                {HUT_POZICE_ZKRATKA[p]}
              </button>
            ))}
          </div>
          {user ? (
            <p
              className="shrink-0 text-sm font-medium tabular-nums text-white sm:ml-auto"
              aria-live="polite"
              aria-atomic="true"
            >
              {loading ? (
                <span className="text-[var(--hut-muted)]">…</span>
              ) : (
                textPocetKaret(filtrovaneSerazene.length)
              )}
            </p>
          ) : null}
        </div>

        {chyba ? (
          <p
            className="mt-6 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200"
            role="alert"
          >
            {chyba}
          </p>
        ) : null}

        {!user ? (
          <p className="mt-8 rounded-xl border border-dashed border-[var(--hut-border)] bg-[var(--hut-surface)]/50 px-6 py-12 text-center text-sm text-[var(--hut-muted)]">
            Po přihlášení se tu zobrazí karty.
          </p>
        ) : loading ? (
          <p className="mt-8 rounded-xl border border-dashed border-[var(--hut-border)] bg-[var(--hut-surface)]/50 px-6 py-12 text-center text-sm text-[var(--hut-muted)]">
            Načítám karty…
          </p>
        ) : filtrovaneSerazene.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-[var(--hut-border)] bg-[var(--hut-surface)]/50 px-6 py-12 text-center text-sm text-[var(--hut-muted)]">
            {karty.length === 0
              ? "Zatím žádné karty. Přidej je v sekci Můj Inventář."
              : "Žádná karta pro zvolenou pozici."}
          </p>
        ) : (
          <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-3">
            {filtrovaneSerazene.map((k) => (
              <InventarKartaPolozka
                key={k.id}
                mrizkaCtvrtiny
                karta={k}
                narodnostiVolby={narodnostiVolby}
                onEditovat={editovat}
                onSmazat={smazat}
                formZakazany={formZakazany}
              />
            ))}
          </ul>
        )}
      </div>
    </HutShell>
  );
}
