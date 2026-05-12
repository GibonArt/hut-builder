"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { HutShell } from "@/components/HutShell";
import { HUT_FORM_PAGE_BG } from "@/lib/hutFormBackground";
import {
  ELH_POCET_FAZI,
  generujElhRozvrh,
  zapasyDoCsvRadky,
  type ElhKolo,
} from "@/lib/elhRozvrh";

const labelClass = "mb-1.5 block text-xs font-medium text-[var(--hut-muted)]";

export function ElhRozvrhNastroj() {
  const rozvrh = useMemo(() => generujElhRozvrh(), []);

  const kolaPodleFaze = useMemo(() => {
    const m = new Map<number, ElhKolo[]>();
    for (const k of rozvrh.kola) {
      const arr = m.get(k.faze) ?? [];
      arr.push(k);
      m.set(k.faze, arr);
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [rozvrh.kola]);

  const stahniCsv = useCallback(() => {
    const text = zapasyDoCsvRadky(rozvrh.kola).join("\n");
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `elh-rozvrh-${ELH_POCET_FAZI}-fazi.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rozvrh.kola]);

  const stahniJson = useCallback(() => {
    const payload = {
      liga: "ELH",
      generovano: new Date().toISOString(),
      pocetFazi: ELH_POCET_FAZI,
      kolaVFazi: rozvrh.kolaVFazi,
      tymy: rozvrh.tymy,
      kola: rozvrh.kola,
    };
    const text = JSON.stringify(payload, null, 2);
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `elh-rozvrh-${ELH_POCET_FAZI}-fazi.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rozvrh]);

  return (
    <HutShell
      headerSectionLabel="ELH — rozvrh zápasů"
      mainStyle={HUT_FORM_PAGE_BG}
      mainInnerClassName="relative z-0 mx-auto max-w-5xl"
    >
      <div className="space-y-8">
        <header>
          <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Tipsport extraliga — generátor kol
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--hut-muted)] sm:text-[15px]">
            Model <span className="font-medium text-zinc-300">dvojitého kola</span>: každý tým hraje s každým{" "}
            <span className="font-medium text-zinc-300">dvakrát</span> — jednou doma, jednou venku. Kola jsou
            seřazená do <span className="font-medium text-zinc-300">pěti fází</span>, aby šlo zápasy hrát postupně
            online (cca stejný počet kol na fázi). Skutečný termínový kalendář ELH se může lišit — jde o plán pro vlastní
            soutěž / simulaci.
          </p>
          <p className="mt-3 text-sm">
            <Link href="/" className="text-[var(--hut-lime)] underline-offset-2 hover:underline">
              ← Zpět do aplikace
            </Link>
          </p>
        </header>

        <section className="rounded-xl border border-[var(--hut-border)] bg-[var(--hut-surface-raised)]/80 p-4 sm:p-5">
          <p className={labelClass}>Fáze sezóny</p>
          <p className="text-sm text-zinc-200">
            Rozvrh je rozdělen na <span className="font-semibold tabular-nums">{ELH_POCET_FAZI}</span> fází (pevně v
            aplikaci).
          </p>
          <dl className="mt-5 grid gap-2 text-sm text-[var(--hut-muted)] sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--hut-lime)]">Týmů</dt>
              <dd className="mt-0.5 text-white tabular-nums">{rozvrh.pocetTymu}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--hut-lime)]">Celkem kol</dt>
              <dd className="mt-0.5 text-white tabular-nums">{rozvrh.celkemKol}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--hut-lime)]">Celkem zápasů</dt>
              <dd className="mt-0.5 text-white tabular-nums">{rozvrh.celkemZapasu}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--hut-lime)]">Kol ve fázích</dt>
              <dd className="mt-0.5 font-mono text-xs text-zinc-200">
                {rozvrh.kolaVFazi.join(" + ")} = {rozvrh.celkemKol}
              </dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={stahniCsv}
              className="rounded-full border border-zinc-600 bg-[var(--hut-btn)] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:border-zinc-500 hover:bg-[var(--hut-btn-hover)]"
            >
              Stáhnout CSV
            </button>
            <button
              type="button"
              onClick={stahniJson}
              className="rounded-full border border-[var(--hut-border)] bg-transparent px-5 py-2 text-sm font-medium text-[var(--hut-muted)] transition-colors hover:border-zinc-500 hover:text-white"
            >
              Stáhnout JSON
            </button>
          </div>
        </section>

        {kolaPodleFaze.map(([cisloFaze, kolaVF]) => (
          <section
            key={cisloFaze}
            className="rounded-xl border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]/40 p-4 sm:p-5"
          >
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--hut-lime)]">
              Fáze {cisloFaze} — kola {kolaVF[0]?.cisloKola}–{kolaVF[kolaVF.length - 1]?.cisloKola} ({kolaVF.length}{" "}
              kol)
            </h3>
            <div className="mt-4 space-y-6">
              {kolaVF.map((kolo) => (
                <div key={kolo.cisloKola}>
                  <h4 className="text-xs font-semibold text-zinc-300">Kolo {kolo.cisloKola}</h4>
                  <div className="mt-2 overflow-x-auto rounded-lg border border-[var(--hut-border)]">
                    <table className="w-full min-w-[20rem] text-left text-sm">
                      <thead className="border-b border-[var(--hut-border)] bg-black/25 text-xs uppercase tracking-wide text-[var(--hut-muted)]">
                        <tr>
                          <th className="px-3 py-2 font-medium">Domácí</th>
                          <th className="px-3 py-2 font-medium">Hosté</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kolo.zapasy.map((z, i) => (
                          <tr
                            key={`${kolo.cisloKola}-${i}`}
                            className="border-b border-[var(--hut-border)]/60 last:border-0"
                          >
                            <td className="px-3 py-2 text-white">{z.domaci}</td>
                            <td className="px-3 py-2 text-white">{z.host}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </HutShell>
  );
}
