"use client";

import { useCallback, useEffect, useMemo, useState, startTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { HutCard, Pozice } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import {
  aktualizujKartu,
  nactiKartyUzivatele,
  smazKartuPodleSlug,
} from "@/lib/cardsDb";
import { createClient } from "@/lib/supabase/client";
import { vsechnyNarodnostiCS } from "@/lib/narodnosti";
import { HUT_POZICE, HUT_POZICE_ZKRATKA } from "@/lib/hutPozice";
import { FloatingZpetNahoru } from "@/components/FloatingZpetNahoru";
import { HutShell } from "@/components/HutShell";
import { InventarKartaPolozka } from "@/components/InventarKartaPolozka";
import { useTypyKaret } from "@/components/TypyKaretProvider";
import type { NajdiMetaTypuKartyOpts } from "@/lib/hutdbTypKaret";
import { HUT_FORM_PAGE_BG } from "@/lib/hutFormBackground";
import { seraditKarty, type RazeniKaret } from "@/lib/hutRazeniKaret";
import {
  filtrujKartyPodleOvr,
  parseOvrVolitelne,
} from "@/lib/optimalizatorFormaci";
import { useRazeniKaret } from "@/lib/useRazeniKaret";
import { ceskaZpravaAuthNeboDb } from "@/lib/supabaseChybyCs";

type FiltrPozice = Pozice | "vse";
type FiltrProdano = "vse" | "neprodane" | "prodane";

const ovrInputClass =
  "box-border min-h-9 w-[4.25rem] max-w-full rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] px-2 py-1.5 text-base tabular-nums text-white outline-none transition-[border-color,box-shadow] focus:border-[var(--hut-focus)]/70 focus:ring-2 focus:ring-[var(--hut-focus-ring)] sm:min-h-8 sm:text-sm";

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
  const [filtrProdano, setFiltrProdano] = useState<FiltrProdano>("neprodane");
  const [minOvrStr, setMinOvrStr] = useState("");
  const [maxOvrStr, setMaxOvrStr] = useState("");
  const [razeniKaret, nastavRazeniKaret] = useRazeniKaret();
  const [mazuId, setMazuId] = useState<string | null>(null);
  const [meniProdanoId, setMeniProdanoId] = useState<string | null>(null);

  const { typyKaret, aliasMapZBaze } = useTypyKaret();
  const typKartyMetaOpts = useMemo<NajdiMetaTypuKartyOpts>(
    () => ({ radky: typyKaret, aliasMapZBaze }),
    [typyKaret, aliasMapZBaze],
  );

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
          setChyba(ceskaZpravaAuthNeboDb(error.message));
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

  const minOvr = useMemo(() => parseOvrVolitelne(minOvrStr), [minOvrStr]);
  const maxOvr = useMemo(() => parseOvrVolitelne(maxOvrStr), [maxOvrStr]);
  const chybaOvrRozsah =
    minOvr !== null && maxOvr !== null && minOvr > maxOvr
      ? "Minimální OVR nesmí být vyšší než maximální."
      : null;
  const neplatnyVstupOvr =
    (minOvrStr.trim() !== "" && minOvr === null) ||
    (maxOvrStr.trim() !== "" && maxOvr === null);

  const filtrovane = useMemo(() => {
    let rows = karty;
    if (filtrPozice !== "vse") {
      rows = rows.filter((k) => k.pozice === filtrPozice);
    }
    if (filtrProdano === "neprodane") {
      rows = rows.filter((k) => k.prodano !== true);
    } else if (filtrProdano === "prodane") {
      rows = rows.filter((k) => k.prodano === true);
    }
    rows = filtrujKartyPodleOvr(rows, minOvr, maxOvr);
    return rows;
  }, [karty, filtrPozice, filtrProdano, minOvr, maxOvr]);

  const filtrovaneSerazene = useMemo(
    () => seraditKarty(filtrovane, razeniKaret),
    [filtrovane, razeniKaret],
  );

  const editovat = useCallback(
    (k: HutCard) => {
      router.push(
        `/?edit=${encodeURIComponent(k.id)}&from=moje-karty`,
      );
    },
    [router],
  );

  const duplikovat = useCallback(
    (k: HutCard) => {
      router.push(
        `/?duplicate=${encodeURIComponent(k.id)}&from=moje-karty`,
      );
    },
    [router],
  );

  const exportovatJson = useCallback(() => {
    if (karty.length === 0) {
      toast.message("Žádné karty k exportu.");
      return;
    }
    const blob = new Blob([JSON.stringify(karty, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const a = document.createElement("a");
    const d = new Date().toISOString().slice(0, 10);
    a.href = URL.createObjectURL(blob);
    a.download = `hut-moje-karty-${d}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Soubor JSON byl stažen.");
  }, [karty]);

  const smazat = useCallback(
    async (idKarty: string) => {
      if (!user?.id) return;
      if (
        !window.confirm(
          "Opravdu smazat tuto kartu? Akce je nevratná.",
        )
      ) {
        return;
      }
      setMazuId(idKarty);
      const { error } = await smazKartuPodleSlug(supabase, user.id, idKarty);
      setMazuId(null);
      if (error) {
        setChyba(ceskaZpravaAuthNeboDb(error.message));
        return;
      }
      setKarty((prev) => prev.filter((k) => k.id !== idKarty));
      toast.success("Karta byla smazána.");
    },
    [user?.id, supabase],
  );

  const zmenProdano = useCallback(
    async (k: HutCard, prodano: boolean) => {
      if (!user?.id) return;
      const predchozi = k.prodano === true;
      if (predchozi === prodano) return;

      const aktualizovana: HutCard = { ...k };
      if (prodano) aktualizovana.prodano = true;
      else delete aktualizovana.prodano;

      setMeniProdanoId(k.id);
      setKarty((prev) =>
        prev.map((c) => (c.id === k.id ? aktualizovana : c)),
      );

      const { error } = await aktualizujKartu(
        supabase,
        user.id,
        k.id,
        aktualizovana,
        k,
        { typKartyMeta: typKartyMetaOpts, inventarFallback: karty },
      );

      setMeniProdanoId(null);
      if (error) {
        setKarty((prev) =>
          prev.map((c) => (c.id === k.id ? k : c)),
        );
        setChyba(ceskaZpravaAuthNeboDb(error.message));
        return;
      }
      toast.success(prodano ? "Karta označena jako prodaná." : "Karta znovu aktivní v optimalizátoru.");
    },
    [user?.id, supabase, typKartyMetaOpts, karty],
  );

  const formZakazany = !user || authLoading || mazuId !== null || meniProdanoId !== null;

  return (
    <HutShell
      headerSectionLabel="Moje karty"
      mainStyle={HUT_FORM_PAGE_BG}
      mainInnerClassName="relative z-0 mx-auto max-w-6xl"
    >
      <>
      <div className="flex min-h-full w-full flex-col">
        <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Moje karty</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--hut-muted)] sm:text-[15px]">
          Všechny uložené karty. Filtr podle OVR, pozice a prodaných karet; řazení podle OVR nebo pořadí přidání.
        </p>

        {user ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportovatJson}
              disabled={loading || karty.length === 0}
              className="touch-manipulation rounded-full border border-[var(--hut-border)] px-4 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              Exportovat JSON
            </button>
          </div>
        ) : null}

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
          <div
            className="flex min-w-0 flex-wrap items-center gap-2"
            role="group"
            aria-label="Filtr podle OVR"
          >
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--hut-muted)]">
              OVR
            </span>
            <label className="sr-only" htmlFor="mk-min-ovr">
              Minimální OVR
            </label>
            <input
              id="mk-min-ovr"
              type="text"
              inputMode="numeric"
              placeholder="min"
              value={minOvrStr}
              onChange={(e) => setMinOvrStr(e.target.value)}
              className={ovrInputClass}
              aria-invalid={minOvrStr.trim() !== "" && minOvr === null}
            />
            <span className="text-xs text-[var(--hut-muted)]" aria-hidden>
              –
            </span>
            <label className="sr-only" htmlFor="mk-max-ovr">
              Maximální OVR
            </label>
            <input
              id="mk-max-ovr"
              type="text"
              inputMode="numeric"
              placeholder="max"
              value={maxOvrStr}
              onChange={(e) => setMaxOvrStr(e.target.value)}
              className={ovrInputClass}
              aria-invalid={maxOvrStr.trim() !== "" && maxOvr === null}
            />
          </div>
          <div
            className="flex min-w-0 flex-wrap items-center gap-2"
            role="group"
            aria-label="Filtr podle stavu (prodané karty)"
          >
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--hut-muted)]">
              Prodáno
            </span>
            {(
              [
                ["vse", "Všechny"] as const,
                ["neprodane", "Aktivní"] as const,
                ["prodane", "Prodané"] as const,
              ] satisfies readonly (readonly [FiltrProdano, string])[]
            ).map(([hodnota, label]) => (
              <button
                key={hodnota}
                type="button"
                onClick={() => setFiltrProdano(hodnota)}
                title={
                  hodnota === "vse"
                    ? "Včetně prodaných i neprodaných"
                    : hodnota === "neprodane"
                      ? "Jen karty, které nejsou označené jako prodané"
                      : "Jen karty označené jako prodané"
                }
                className={[
                  "touch-manipulation rounded-full border px-3 py-2 text-xs font-medium transition-colors sm:py-1.5",
                  filtrProdano === hodnota
                    ? "border-[var(--hut-focus)]/60 bg-[var(--hut-focus)]/15 text-white"
                    : "border-[var(--hut-border)] text-[var(--hut-muted)] hover:border-zinc-500 hover:text-zinc-200",
                ].join(" ")}
              >
                {label}
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

        {neplatnyVstupOvr ? (
          <p className="mt-2 text-sm text-amber-200/90" role="alert">
            OVR: celé číslo 0–99. Prázdné pole = bez limitu.
          </p>
        ) : null}
        {chybaOvrRozsah ? (
          <p className="mt-2 text-sm text-red-200/90" role="alert">
            {chybaOvrRozsah}
          </p>
        ) : null}

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
          <div className="mt-8 rounded-xl border border-dashed border-[var(--hut-border)] bg-[var(--hut-surface)]/50 px-6 py-12 text-center text-sm text-[var(--hut-muted)]">
            {karty.length === 0 ? (
              <>
                <p>Zatím žádné karty.</p>
                <p className="mt-4">
                  <Link
                    href="/"
                    className="font-medium text-[var(--hut-lime)] underline underline-offset-2 decoration-[var(--hut-lime)]/35 hover:text-[var(--hut-lime-dim)]"
                  >
                    Přejít do Můj Inventář a přidat první kartu
                  </Link>
                </p>
              </>
            ) : (
              "Žádná karta pro zvolenou kombinaci filtrů (OVR, pozice, prodáno)."
            )}
          </div>
        ) : (
          <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 md:gap-3">
            {filtrovaneSerazene.map((k) => (
              <InventarKartaPolozka
                key={k.id}
                mrizkaCtvrtiny
                karta={k}
                narodnostiVolby={narodnostiVolby}
                onEditovat={editovat}
                onDuplikovat={duplikovat}
                onSmazat={smazat}
                onProdanoChange={zmenProdano}
                meniProdanoId={meniProdanoId}
                formZakazany={formZakazany}
              />
            ))}
          </ul>
        )}
      </div>
      <FloatingZpetNahoru />
      </>
    </HutShell>
  );
}
