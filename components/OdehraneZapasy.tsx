"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  startTransition,
} from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { FloatingZpetNahoru } from "@/components/FloatingZpetNahoru";
import { HutShell } from "@/components/HutShell";
import { HUT_FORM_PAGE_BG } from "@/lib/hutFormBackground";
import {
  formatujDatumCs,
  formatujZapasyProExport,
  kopirujTextDoSchranky,
  nazevSouboruExportuZapasu,
  stahniTextovySoubor,
  type FormatExportuZapasu,
} from "@/lib/exportZapasy";
import {
  dnesIsoDatum,
  normalizujZapasZFormulare,
  nactiUlozeneZapasy,
  seraditZapasyPodleData,
  smazUlozeneZapasy,
  ulozZapasy,
  type OdehranyZapas,
} from "@/lib/zapasyStorage";

const inputClass =
  "box-border w-full min-h-11 rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] px-3 py-2.5 text-base text-white outline-none transition-[border-color,box-shadow] placeholder:text-[var(--hut-muted)]/60 focus:border-[var(--hut-focus)]/70 focus:ring-2 focus:ring-[var(--hut-focus-ring)] sm:min-h-10 sm:text-sm";

const labelClass =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[var(--hut-muted)]";

const btnPrimaryClass =
  "touch-manipulation rounded-full border border-[var(--hut-lime)]/55 bg-[var(--hut-lime)]/15 px-5 py-2.5 text-sm font-semibold text-[var(--hut-lime)] transition-colors hover:bg-[var(--hut-lime)]/25 disabled:cursor-not-allowed disabled:opacity-45";

const btnSecondaryClass =
  "touch-manipulation rounded-lg border border-[var(--hut-border)] px-3 py-2 text-xs font-medium text-[var(--hut-muted)] transition-colors hover:border-zinc-500 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-45";

const btnDangerClass =
  "touch-manipulation rounded-lg border border-red-500/35 px-2.5 py-1.5 text-xs font-medium text-red-200/90 transition-colors hover:border-red-400/55 hover:bg-red-950/30";

function textPocetZapasu(n: number): string {
  if (n === 1) return "1 zápas";
  if (n >= 2 && n <= 4) return `${n} zápasy`;
  return `${n} zápasů`;
}

export function OdehraneZapasy() {
  const { user, loading: authLoading } = useAuth();
  const [zapasy, setZapasy] = useState<OdehranyZapas[]>([]);
  const [nacteno, setNacteno] = useState(false);
  const [datum, setDatum] = useState(dnesIsoDatum);
  const [souper, setSouper] = useState("");
  const [skore, setSkore] = useState("");
  const [poznamka, setPoznamka] = useState("");
  const [formatExportu, setFormatExportu] = useState<FormatExportuZapasu>("radek");
  const serazene = useMemo(() => seraditZapasyPodleData(zapasy), [zapasy]);

  const exportText = useMemo(
    () => formatujZapasyProExport(serazene, formatExportu),
    [serazene, formatExportu],
  );

  useEffect(() => {
    if (!user?.id) {
      startTransition(() => {
        setZapasy([]);
        setNacteno(false);
      });
      return;
    }
    const ulozene = nactiUlozeneZapasy(user.id);
    startTransition(() => {
      setZapasy(ulozene?.zapasy ?? []);
      setNacteno(true);
    });
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !nacteno) return;
    ulozZapasy(user.id, zapasy);
  }, [user?.id, zapasy, nacteno]);

  const pridatZapas = useCallback(() => {
    const novy = normalizujZapasZFormulare({ datum, souper, skore, poznamka });
    if (!novy) {
      toast.error("Vyplň datum a skóre (např. 4-2 nebo V).");
      return;
    }
    setZapasy((prev) => [...prev, novy]);
    setSkore("");
    setPoznamka("");
    toast.success("Zápas přidán.");
  }, [datum, souper, skore, poznamka]);

  const smazatZapas = useCallback((id: string) => {
    setZapasy((prev) => prev.filter((z) => z.id !== id));
    toast.message("Zápas odebrán.");
  }, []);

  const smazatVse = useCallback(() => {
    if (zapasy.length === 0) return;
    if (!window.confirm(`Smazat všech ${zapasy.length} zápasů v tomto prohlížeči?`)) return;
    setZapasy([]);
    if (user?.id) smazUlozeneZapasy(user.id);
    toast.success("Seznam zápasů smazán.");
  }, [zapasy.length, user?.id]);

  const kopirovatExport = useCallback(async () => {
    if (!exportText) {
      toast.error("Žádné zápasy k exportu.");
      return;
    }
    try {
      await kopirujTextDoSchranky(exportText);
      toast.success("Export zkopírován do schránky.");
    } catch {
      toast.error("Kopírování se nepovedlo — použij náhled níže nebo stáhni .txt.");
    }
  }, [exportText]);

  const stahnoutExport = useCallback(() => {
    if (!exportText) {
      toast.error("Žádné zápasy k exportu.");
      return;
    }
    stahniTextovySoubor(exportText, nazevSouboruExportuZapasu());
    toast.success("Soubor stažen.");
  }, [exportText]);

  const tisknoutExport = useCallback(() => {
    if (serazene.length === 0) {
      toast.error("Žádné zápasy k tisku.");
      return;
    }
    window.print();
  }, [serazene.length]);

  const nacitani = authLoading || (Boolean(user?.id) && !nacteno);

  return (
    <HutShell
      headerSectionLabel="Odehrané zápasy"
      mainStyle={HUT_FORM_PAGE_BG}
      mainInnerClassName="relative z-0 mx-auto max-w-3xl"
    >
      <div className="print:hidden">
        <header>
          <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Odehrané zápasy
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--hut-muted)]">
            Zapisuj si výsledky (datum, soupeř, skóre). Seznam se ukládá v tomto prohlížeči a můžeš ho
            exportovat jako text pro ruční přepis, nebo vytisknout / uložit jako PDF přes dialog tisku.
          </p>
        </header>

        <section
          className="mt-8 rounded-xl border border-[var(--hut-border)] bg-[var(--hut-surface-raised)]/90 p-4 sm:p-5"
          aria-label="Přidat zápas"
        >
          <h3 className="text-sm font-semibold text-white">Nový zápas</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="zap-datum" className={labelClass}>
                Datum
              </label>
              <input
                id="zap-datum"
                type="date"
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                className={inputClass}
                disabled={!user}
              />
            </div>
            <div>
              <label htmlFor="zap-skore" className={labelClass}>
                Skóre / výsledek
              </label>
              <input
                id="zap-skore"
                type="text"
                placeholder="např. 4-2, 3-4 SO, V"
                value={skore}
                onChange={(e) => setSkore(e.target.value)}
                className={inputClass}
                disabled={!user}
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="zap-souper" className={labelClass}>
                Soupeř (volitelné)
              </label>
              <input
                id="zap-souper"
                type="text"
                placeholder="jméno / tým"
                value={souper}
                onChange={(e) => setSouper(e.target.value)}
                className={inputClass}
                disabled={!user}
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="zap-poznamka" className={labelClass}>
                Poznámka (volitelné)
              </label>
              <input
                id="zap-poznamka"
                type="text"
                placeholder="např. turnaj, rivals"
                value={poznamka}
                onChange={(e) => setPoznamka(e.target.value)}
                className={inputClass}
                disabled={!user}
                autoComplete="off"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              type="button"
              className={btnPrimaryClass}
              onClick={pridatZapas}
              disabled={!user || nacitani}
            >
              Přidat zápas
            </button>
          </div>
        </section>

        <section className="mt-8" aria-label="Seznam zápasů">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-white">
              Zapsané zápasy
              {serazene.length > 0 ? (
                <span className="ml-2 font-normal text-[var(--hut-muted)]">
                  ({textPocetZapasu(serazene.length)})
                </span>
              ) : null}
            </h3>
            {serazene.length > 0 ? (
              <button type="button" className={btnDangerClass} onClick={smazatVse}>
                Smazat vše
              </button>
            ) : null}
          </div>

          {!user ? (
            <p className="mt-6 rounded-xl border border-dashed border-[var(--hut-border)] bg-[var(--hut-surface)]/50 px-6 py-12 text-center text-sm text-[var(--hut-muted)]">
              Po přihlášení můžeš zapisovat zápasy.
            </p>
          ) : nacitani ? (
            <p className="mt-6 rounded-xl border border-dashed border-[var(--hut-border)] bg-[var(--hut-surface)]/50 px-6 py-12 text-center text-sm text-[var(--hut-muted)]">
              Načítám…
            </p>
          ) : serazene.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-[var(--hut-border)] bg-[var(--hut-surface)]/50 px-6 py-12 text-center text-sm text-[var(--hut-muted)]">
              Zatím žádný zápas — přidej první výsledek výše.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {serazene.map((z) => (
                <li
                  key={z.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]/50 px-3 py-3 sm:px-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">
                      <span className="tabular-nums">{formatujDatumCs(z.datum)}</span>
                      <span className="mx-2 text-[var(--hut-muted)]" aria-hidden>
                        ·
                      </span>
                      <span className="tabular-nums">{z.skore}</span>
                      {z.souper.trim() ? (
                        <>
                          <span className="mx-2 text-[var(--hut-muted)]" aria-hidden>
                            ·
                          </span>
                          <span>{z.souper.trim()}</span>
                        </>
                      ) : null}
                    </p>
                    {z.poznamka.trim() ? (
                      <p className="mt-1 text-xs text-[var(--hut-muted)]">{z.poznamka.trim()}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className={btnSecondaryClass}
                    onClick={() => smazatZapas(z.id)}
                  >
                    Odebrat
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className="mt-8 rounded-xl border border-[var(--hut-border)] bg-[var(--hut-surface-raised)]/90 p-4 sm:p-5"
          aria-label="Export zápasů"
        >
          <h3 className="text-sm font-semibold text-white">Export</h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--hut-muted)]">
            <strong className="font-medium text-zinc-300">Řádky</strong> — jeden zápas na řádek, vhodné pro
            copy&amp;paste. <strong className="font-medium text-zinc-300">TSV</strong> — sloupce oddělené
            tabulátorem (Excel, Google Sheets). <strong className="font-medium text-zinc-300">Tisk / PDF</strong> —
            v dialogu tisku zvol „Uložit jako PDF“.
          </p>
          <div
            className="mt-4 flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Formát exportu"
          >
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--hut-muted)]">
              Formát
            </span>
            {(
              [
                { id: "radek" as const, label: "Řádky" },
                { id: "tsv" as const, label: "TSV" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormatExportu(f.id)}
                className={[
                  "touch-manipulation rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                  formatExportu === f.id
                    ? "border-[var(--hut-focus)]/60 bg-[var(--hut-focus)]/15 text-white"
                    : "border-[var(--hut-border)] text-[var(--hut-muted)] hover:border-zinc-500 hover:text-zinc-200",
                ].join(" ")}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={btnPrimaryClass}
              onClick={() => void kopirovatExport()}
              disabled={serazene.length === 0}
            >
              Kopírovat
            </button>
            <button
              type="button"
              className={btnSecondaryClass}
              onClick={stahnoutExport}
              disabled={serazene.length === 0}
            >
              Stáhnout .txt
            </button>
            <button
              type="button"
              className={btnSecondaryClass}
              onClick={tisknoutExport}
              disabled={serazene.length === 0}
            >
              Tisk / PDF
            </button>
          </div>
          <label htmlFor="zap-export-nahled" className={`${labelClass} mt-5`}>
            Náhled exportu
          </label>
          <textarea
            id="zap-export-nahled"
            readOnly
            value={exportText}
            rows={Math.min(12, Math.max(4, serazene.length + (formatExportu === "tsv" ? 2 : 1)))}
            className={`${inputClass} font-mono text-xs leading-relaxed`}
            placeholder="Po přidání zápasů se tu zobrazí text pro kopírování…"
          />
        </section>
      </div>

      <div className="hidden print:block print:bg-white print:text-black" aria-hidden>
        <h1 className="text-lg font-bold">HUT Builder — odehrané zápasy</h1>
        <p className="mt-1 text-sm text-gray-600">
          Export {formatujDatumCs(dnesIsoDatum())} · {textPocetZapasu(serazene.length)}
        </p>
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-gray-400 px-2 py-1 text-left">Datum</th>
              <th className="border border-gray-400 px-2 py-1 text-left">Skóre</th>
              <th className="border border-gray-400 px-2 py-1 text-left">Soupeř</th>
              <th className="border border-gray-400 px-2 py-1 text-left">Poznámka</th>
            </tr>
          </thead>
          <tbody>
            {serazene.map((z) => (
              <tr key={z.id}>
                <td className="border border-gray-400 px-2 py-1 tabular-nums">
                  {formatujDatumCs(z.datum)}
                </td>
                <td className="border border-gray-400 px-2 py-1">{z.skore}</td>
                <td className="border border-gray-400 px-2 py-1">{z.souper}</td>
                <td className="border border-gray-400 px-2 py-1">{z.poznamka}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FloatingZpetNahoru />
    </HutShell>
  );
}
