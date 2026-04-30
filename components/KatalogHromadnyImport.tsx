"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ceskaZpravaKopieKarty,
  katalogRadkaKHutCard,
  kopirujKartuZKatalogu,
  nactiGlobalniKatalogKaret,
  shodnaKartaJizVInventari,
  type GlobalniKatalogRadkaDb,
} from "@/lib/cardsDb";
import { vygenerujIdKarty } from "@/lib/vygenerujIdKarty";
import { vsechnyNarodnostiCS, vlajkaZeme } from "@/lib/narodnosti";
import { urlLogaTymu } from "@/lib/tymLoga";
import { najdiMetaTypuKarty } from "@/lib/hutdbTypKaret";
import type { HutCard } from "@/types";
import { TypKartyMiniLogo } from "@/components/TypKartyIkona";
import { TymLogo } from "@/components/TymLogo";
import { formatovatPlatVMil } from "@/lib/platMiliony";
import { HUT_POZICE_ZKRATKA } from "@/lib/hutPozice";
import { ceskaZpravaAuthNeboDb } from "@/lib/supabaseChybyCs";
import { toast } from "sonner";

type Polozka = { dbId: string; karta: HutCard };

type Props = {
  userId: string | null;
  /** Aktuální inventář — pro kontrolu duplicit a unikátní slug. */
  stavajiciKarty: readonly HutCard[];
  disabled?: boolean;
  onKartyPridany: (nove: HutCard[]) => void;
};

const btnDruhClass =
  "touch-manipulation rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-45";

export function KatalogHromadnyImport({
  userId,
  stavajiciKarty,
  disabled,
  onKartyPridany,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const narodnostiVolby = useMemo(() => vsechnyNarodnostiCS(), []);
  const baseId = useId();
  const [otevreno, setOtevreno] = useState(false);
  /** První načtení katalogu až po rozbalení; při změně uživatele znovu. */
  const katalogNactenProUser = useRef<string | null>(null);
  const [nacitam, setNacitam] = useState(false);
  const [pridavam, setPridavam] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [radky, setRadky] = useState<Polozka[]>([]);
  const [filtr, setFiltr] = useState("");
  const [vybrano, setVybrano] = useState<Set<string>>(() => new Set());

  const nacti = useCallback(async () => {
    if (!userId) {
      setRadky([]);
      return;
    }
    setNacitam(true);
    setChyba(null);
    const { data, error } = await nactiGlobalniKatalogKaret(supabase);
    setNacitam(false);
    if (error) {
      setChyba(ceskaZpravaAuthNeboDb(error.message));
      setRadky([]);
      katalogNactenProUser.current = null;
      return;
    }
    const polozky: Polozka[] = [];
    for (const r of data as GlobalniKatalogRadkaDb[]) {
      const k = katalogRadkaKHutCard(r);
      if (k) polozky.push({ dbId: r.card_id, karta: k });
    }
    setRadky(polozky);
    setVybrano(new Set());
  }, [supabase, userId]);

  useEffect(() => {
    katalogNactenProUser.current = null;
    setRadky([]);
    setVybrano(new Set());
    setChyba(null);
  }, [userId]);

  useEffect(() => {
    if (!userId || !otevreno) return;
    if (katalogNactenProUser.current === userId) return;
    katalogNactenProUser.current = userId;
    void nacti();
  }, [otevreno, userId, nacti]);

  const filtrovane = useMemo(() => {
    const q = filtr.trim().toLowerCase();
    if (!q) return radky;
    return radky.filter(({ karta: k }) => {
      const hay = `${k.jmeno} ${k.tym} ${k.liga} ${k.typKarty} ${HUT_POZICE_ZKRATKA[k.pozice]} ${k.ovr}`
        .toLowerCase();
      return q.split(/\s+/).every((t) => t && hay.includes(t));
    });
  }, [radky, filtr]);

  const muzuPridat = (p: Polozka) => !shodnaKartaJizVInventari(p.karta, stavajiciKarty);

  const prekliknout = (dbId: string) => {
    if (disabled) return;
    setVybrano((prev) => {
      const next = new Set(prev);
      if (next.has(dbId)) next.delete(dbId);
      else next.add(dbId);
      return next;
    });
  };

  const vyberViditelne = () => {
    const m = new Set(
      filtrovane.filter((p) => muzuPridat(p)).map((p) => p.dbId),
    );
    setVybrano(m);
  };

  const zrusitVyber = () => setVybrano(new Set());

  const pocetKPridani = useMemo(() => {
    let n = 0;
    for (const id of vybrano) {
      const p = radky.find((x) => x.dbId === id);
      if (p && !shodnaKartaJizVInventari(p.karta, stavajiciKarty)) n += 1;
    }
    return n;
  }, [vybrano, radky, stavajiciKarty]);

  const pridatVseNajednou = async () => {
    if (!userId || pridavam) return;
    const kPridani: Polozka[] = [];
    for (const p of radky) {
      if (!vybrano.has(p.dbId) || !muzuPridat(p)) continue;
      kPridani.push(p);
    }
    if (kPridani.length === 0) {
      toast.message("Nic k přidání — vyber karty, které ještě nemáš, nebo uprav filtr.");
      return;
    }
    setPridavam(true);
    setChyba(null);
    let pracovni: HutCard[] = [...stavajiciKarty];
    const uspesne: HutCard[] = [];
    const preskoceno: string[] = [];

    for (const p of kPridani) {
      if (shodnaKartaJizVInventari(p.karta, pracovni)) {
        preskoceno.push(p.karta.jmeno);
        continue;
      }
      const slug = vygenerujIdKarty(p.karta.jmeno, p.karta.ovr, pracovni);
      const { error } = await kopirujKartuZKatalogu(supabase, p.dbId, slug);
      if (error) {
        preskoceno.push(
          `${p.karta.jmeno} (${ceskaZpravaKopieKarty(error.message)})`,
        );
        continue;
      }
      const ulozena: HutCard = { ...p.karta, id: slug };
      pracovni = [...pracovni, ulozena];
      uspesne.push(ulozena);
    }

    setPridavam(false);
    if (uspesne.length > 0) {
      onKartyPridany(uspesne);
      setVybrano(new Set());
    }
    if (uspesne.length > 0 && preskoceno.length === 0) {
      toast.success(
        uspesne.length === 1
          ? "1 karta přidána do inventáře."
          : `Přidáno ${uspesne.length} karet.`,
      );
    } else if (uspesne.length > 0) {
      toast.success(`Přidáno ${uspesne.length} karet, přeskočeno: ${preskoceno.length}.`, {
        description: preskoceno.slice(0, 4).join("; ") + (preskoceno.length > 4 ? "…" : ""),
      });
    } else {
      toast.error("Nepodařilo se nic přidat.", {
        description: preskoceno.slice(0, 3).join("; "),
      });
    }
  };

  if (!userId) return null;

  return (
    <div className="rounded-xl border border-[var(--hut-lime)]/20 bg-[var(--hut-lime)]/[0.04] p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">Rychlý import víc karet z databáze</p>
          <p className="mt-1 max-w-2xl text-[11px] leading-snug text-[var(--hut-muted)]">
            Zaškrtni hráče z katalogu komunity (karty ostatních) a jedním tlačítkem je přidej. Nepotřebuješ vyplňovat
            formulář u každé karty.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOtevreno((o) => !o)}
          className="shrink-0 text-xs font-medium text-[var(--hut-lime)] underline-offset-2 hover:underline"
        >
          {otevreno ? "Sbalit" : "Rozbalit seznam"}
        </button>
      </div>

      {otevreno ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={filtr}
              onChange={(e) => setFiltr(e.target.value)}
              disabled={disabled || nacitam}
              placeholder="Filtrovat: jméno, tým, OVR, pozice…"
              className="min-w-[12rem] flex-1 rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] px-2.5 py-1.5 text-sm text-white placeholder:text-[var(--hut-muted)]/50"
              autoComplete="off"
            />
            <button type="button" className={btnDruhClass} disabled={disabled} onClick={() => void nacti()}>
              {nacitam ? "Načítám…" : "Obnovit seznam"}
            </button>
          </div>
          {chyba ? (
            <p className="text-xs text-amber-200/90" role="alert">
              {chyba}
            </p>
          ) : null}
          {!nacitam && radky.length === 0 && !chyba ? (
            <p className="text-xs text-[var(--hut-muted)]">
              Zatím není v databázi žádná karta od jiných hráčů – sdílej třeba první kartu ručně, pak se ostatní objeví
              tady.
            </p>
          ) : null}

          {radky.length > 0 && !chyba ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={btnDruhClass}
                  disabled={disabled || filtrovane.length === 0}
                  onClick={vyberViditelne}
                >
                  Zaškrtnout vše v tabulce
                </button>
                <button type="button" className={btnDruhClass} disabled={disabled} onClick={zrusitVyber}>
                  Zrušit zaškrtnutí
                </button>
                <button
                  type="button"
                  className="min-h-9 touch-manipulation rounded-lg border border-[var(--hut-lime)]/50 bg-[var(--hut-lime)]/15 px-3 py-1.5 text-xs font-semibold text-[var(--hut-lime)] transition-colors hover:bg-[var(--hut-lime)]/25 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={disabled || pridavam || pocetKPridani === 0}
                  onClick={() => void pridatVseNajednou()}
                >
                  {pridavam ? "Přidávám…" : `Přidat do inventáře (${pocetKPridani})`}
                </button>
              </div>
              <p className="text-[10px] text-[var(--hut-muted)]" aria-live="polite">
                {filtrovane.length} řádků v tabulce. Šedé řádky = tuto sestavu už v inventáři máš.
              </p>
              <ul
                className="max-h-[min(22rem,55vh)] overflow-y-auto rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]/40"
                aria-label="Seznam karet z katalogu"
              >
                {filtrovane.map((p) => {
                  const uzMam = !muzuPridat(p);
                  const chkId = `${baseId}-${p.dbId}`;
                  const jeZaskrtnuta = vybrano.has(p.dbId) && !uzMam;
                  return (
                    <li
                      key={p.dbId}
                      className={[
                        "flex min-h-[3rem] items-center gap-2 border-b border-[var(--hut-border)]/50 px-2 py-1.5 last:border-b-0",
                        uzMam ? "opacity-45" : "hover:bg-[var(--hut-surface-raised)]/50",
                      ].join(" ")}
                    >
                      <div className="flex shrink-0 items-center justify-center pt-0.5">
                        <input
                          id={chkId}
                          type="checkbox"
                          checked={jeZaskrtnuta}
                          disabled={disabled || uzMam}
                          onChange={() => {
                            if (!uzMam) prekliknout(p.dbId);
                          }}
                          className="h-4 w-4 rounded border-[var(--hut-border)]"
                        />
                      </div>
                      <label
                        htmlFor={chkId}
                        className={["flex min-w-0 flex-1 cursor-pointer items-center gap-2", uzMam && "cursor-not-allowed"]
                          .filter(Boolean)
                          .join(" ")}
                        title={uzMam ? "Tato sestava je už v tvém inventáři" : "Vybrat pro import"}
                      >
                        <span className="shrink-0">
                          <TypKartyMiniLogo ulozeno={p.karta.typKarty} velikost="seznam" />
                        </span>
                        <span className="flex h-7 w-8 shrink-0 items-center justify-center text-base leading-none">
                          {(() => {
                            const kod =
                              narodnostiVolby.find((n) => n.label === p.karta.narodnost.trim())?.code ?? "";
                            return kod ? vlajkaZeme(kod) : "—";
                          })()}
                        </span>
                        <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] p-0.5">
                          <TymLogo
                            url={urlLogaTymu(p.karta.tym, p.karta.liga)}
                            nazevTymu={p.karta.tym}
                            fill
                            className="max-h-full max-w-full object-contain"
                          />
                        </span>
                        <span className="min-w-0 flex-1 text-left text-xs sm:text-[13px]">
                          <span className="block font-medium text-white leading-tight">{p.karta.jmeno}</span>
                          <span className="block text-[10px] text-[var(--hut-muted)] leading-tight sm:text-[11px]">
                            {HUT_POZICE_ZKRATKA[p.karta.pozice]} · {p.karta.ovr} OVR · {p.karta.tym} ·{" "}
                            {formatovatPlatVMil(p.karta.plat)}
                            {(() => {
                              const meta = najdiMetaTypuKarty(p.karta.typKarty);
                              return meta ? ` · ${meta.jmenoCs}` : "";
                            })()}
                            {uzMam ? " · v inventáři" : ""}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
