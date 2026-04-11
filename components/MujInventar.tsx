"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type HutCard,
  type Liga,
  type Pozice,
  type Ruka,
  type XFactorUroven,
  type XFactorZaznam,
} from "@/types";
import { useAuth } from "@/components/AuthProvider";
import {
  aktualizujJenAtributyKarty,
  aktualizujKartu,
  nactiKartyUzivatele,
  smazKartuPodleSlug,
  vlozKartu,
} from "@/lib/cardsDb";
import { createClient } from "@/lib/supabase/client";
import { vsechnyNarodnostiCS } from "@/lib/narodnosti";
import { parsePlatVstupVMilionech } from "@/lib/platMiliony";
import {
  LIGA_ZOBRAZENI,
  LIGY_V_PORADI,
  tymyProLigu,
} from "@/lib/tymyPodleLigy";
import {
  hutdbTypyKaretVTriPoradi,
  najdiMetaTypuKarty,
} from "@/lib/hutdbTypKaret";
import { NarodnostVyber } from "@/components/NarodnostVyber";
import { TypKartyVyber } from "@/components/TypKartyVyber";
import { TymHledacNapricLigami } from "@/components/TymHledacNapricLigami";
import { TymVyber } from "@/components/TymVyber";
import { InventarKartaPolozka } from "@/components/InventarKartaPolozka";
import { EaHracNapoveda } from "@/components/EaHracNapoveda";
import {
  EA_POZICE_NA_HUT,
  najdiLiguATymPodleEa,
  type EaNhl26Hrac,
} from "@/lib/eaNhl26Ratings";
import {
  OPTION_VLASTNI,
  X_FACTORY_KATALOG,
  klicProSelect,
  obnovIkonyXeFactoryZKatalogu,
  polozkaPodleKlice,
} from "@/lib/xFactoryKatalog";
import { iconUrlProEaShody } from "@/lib/xFactorIconsEa";
import { XFactorVyber } from "@/components/XFactorVyber";
import { HUT_POZICE, HUT_POZICE_LABEL } from "@/lib/hutPozice";
import { nahledCtyriKaret, type RazeniKaret } from "@/lib/hutRazeniKaret";
import { useRazeniKaret } from "@/lib/useRazeniKaret";

const RUKY: Ruka[] = ["LR", "PR"];

const RUKA_LABEL: Record<Ruka, string> = {
  LR: "Levá (LR)",
  PR: "Pravá (PR)",
};

/** Poslední „slovo“ z celého jména — základ pro slug v ID karty (např. McDavid z Connora). */
function zakladSlugZJmena(jmeno: string): string {
  const parts = jmeno.trim().split(/\s+/).filter(Boolean);
  const token = parts.length ? parts[parts.length - 1]! : jmeno.trim();
  const ascii = token.normalize("NFD").replace(/\p{M}/gu, "");
  const slug = ascii
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "hrac";
}

/** `slug-ovr`; při kolizi s existující kartou `-2`, `-3`, … */
function vygenerujIdKarty(
  jmeno: string,
  ovr: number,
  existujici: readonly HutCard[],
): string {
  const base = `${zakladSlugZJmena(jmeno)}-${ovr}`;
  if (!existujici.some((k) => k.id === base)) return base;
  let n = 2;
  while (existujici.some((k) => k.id === `${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

const inputClass =
  "w-full rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] px-3 py-2 text-sm text-white placeholder:text-[var(--hut-muted)]/50 outline-none transition-[border-color,box-shadow] focus:border-[var(--hut-focus)]/70 focus:ring-2 focus:ring-[var(--hut-focus-ring)]";

const selectClass =
  "w-full cursor-pointer rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] px-3 py-2 text-sm text-white outline-none transition-[border-color,box-shadow] focus:border-[var(--hut-focus)]/70 focus:ring-2 focus:ring-[var(--hut-focus-ring)]";

/** Stejná výška řádku jako `TymVyber` / `TypKartyVyber` (h-14). */
const selectClassDropdown =
  "box-border h-14 min-h-14 w-full cursor-pointer rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)] px-3 text-sm leading-normal text-white outline-none transition-[border-color,box-shadow] focus:border-[var(--hut-focus)]/70 focus:ring-2 focus:ring-[var(--hut-focus-ring)]";

function triPrazdneXFactory(): XFactorZaznam[] {
  return [
    { id: "", label: "" },
    { id: "", label: "" },
    { id: "", label: "" },
  ];
}

const labelClass = "mb-1.5 block text-xs font-medium text-[var(--hut-muted)]";

function OznaPovinne() {
  return (
    <span className="text-red-400/90" aria-hidden>
      *
    </span>
  );
}

export function MujInventar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editZQueryZpracovan = useRef<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [karty, setKarty] = useState<HutCard[]>([]);
  /** Výchozí true — dokud neproběhne první fetch, je `karty` prázdné a nesmí se zpracovat `?edit=` dřív (jinak se formulář nevyplní). */
  const [kartyLoading, setKartyLoading] = useState(true);
  const [kartyChyba, setKartyChyba] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [ukladamKartu, setUkladamKartu] = useState(false);

  const [jmeno, setJmeno] = useState("");
  const [ovr, setOvr] = useState("");
  const [pozice, setPozice] = useState<Pozice>("C");
  const [preferovanaRuka, setPreferovanaRuka] = useState<Ruka>("LR");
  const [narodnostKod, setNarodnostKod] = useState("");
  const narodnostiVolby = useMemo(() => vsechnyNarodnostiCS(), []);
  const [tym, setTym] = useState("");
  const [liga, setLiga] = useState<Liga>("NHL");
  const [typKarty, setTypKarty] = useState("");
  const [plat, setPlat] = useState("");
  const [xFactory, setXFactory] = useState<XFactorZaznam[]>(triPrazdneXFactory);
  /** `card_slug` řádku v DB; při úpravě se může po uložení změnit (jméno/OVR). */
  const [editujiSlug, setEditujiSlug] = useState<string | null>(null);
  /** Inkrementace vyčistí pole „Hledat hráče“ v `EaHracNapoveda` (po uložení / zrušení). */
  const [eaNapovedaVycistit, setEaNapovedaVycistit] = useState(0);
  /** Po výběru z komunitní DB nápovědy — zobrazit upozornění k ověření údajů. */
  const [upozorneniKartovaNapoveda, setUpozorneniKartovaNapoveda] = useState(false);

  const tymyProAktualniLigu = useMemo(() => tymyProLigu(liga), [liga]);

  const hutdbTypyKaret = useMemo(() => hutdbTypyKaretVTriPoradi(), []);

  const xFactoryKatalogSerazeny = useMemo(
    () =>
      [...X_FACTORY_KATALOG].sort((a, b) =>
        a.labelEn.localeCompare(b.labelEn, "en"),
      ),
    [],
  );

  const priVyberuEaHrace = useCallback(
    (h: EaNhl26Hrac) => {
      setJmeno(h.jmeno);
      setFormError(null);

      if (h.source === "ea") {
        setUpozorneniKartovaNapoveda(false);
        if (h.hutPreferovanaRuka) setPreferovanaRuka(h.hutPreferovanaRuka);
        const p = EA_POZICE_NA_HUT[h.positionShort];
        if (p) setPozice(p);
        const lt = najdiLiguATymPodleEa(h.tym);
        if (lt) {
          setLiga(lt.liga);
          setTym(lt.tym);
        }
        return;
      }

      // Komunitní nápověda (karty v DB): kompletní předvyplnění z nejnovějšího řádku (jméno + tým)
      setOvr("");
      setPlat("");
      setNarodnostKod("");
      setTypKarty("");
      setXFactory(triPrazdneXFactory());

      if (h.hutPozice && h.hutLiga) {
        setPozice(h.hutPozice);
        setLiga(h.hutLiga);
        setTym(h.tym);
      }
      if (h.hutPreferovanaRuka) setPreferovanaRuka(h.hutPreferovanaRuka);

      if (h.napovedaOvr != null) {
        setOvr(String(h.napovedaOvr));
      }
      if (h.napovedaPlat != null) {
        const mil = h.napovedaPlat / 1_000_000;
        setPlat(
          Number.isFinite(mil)
            ? mil.toLocaleString("cs-CZ", { maximumFractionDigits: 2 })
            : "",
        );
      }
      if (h.napovedaNarodnost) {
        const kod =
          narodnostiVolby.find((n) => n.label === h.napovedaNarodnost?.trim())
            ?.code ?? "";
        if (kod) setNarodnostKod(kod);
      }
      if (h.napovedaTypKarty) {
        setTypKarty(h.napovedaTypKarty);
      }
      if (h.napovedaXFactory?.length) {
        const xf = obnovIkonyXeFactoryZKatalogu(h.napovedaXFactory) ?? [];
        setXFactory([
          xf[0] ?? { id: "", label: "" },
          xf[1] ?? { id: "", label: "" },
          xf[2] ?? { id: "", label: "" },
        ]);
      }

      setUpozorneniKartovaNapoveda(true);
    },
    [narodnostiVolby],
  );

  useEffect(() => {
    if (!user?.id) {
      startTransition(() => {
        setKarty([]);
        setKartyChyba(null);
        setKartyLoading(false);
      });
      return;
    }

    let zruseno = false;
    startTransition(() => {
      setKartyLoading(true);
      setKartyChyba(null);
    });

    nactiKartyUzivatele(supabase, user.id).then(({ data, error }) => {
      if (zruseno) return;
      startTransition(() => {
        setKartyLoading(false);
        if (error) {
          setKartyChyba(error.message);
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

  /**
   * Jednou po načtení inventáře zapisuje přepočtené X-F ikony jen do sloupce `atributy`.
   * Nesmí záviset na `karty` v deps — při každé úpravě karty by jinak běžel znovu a
   * `aktualizujKartu` se starým snapshotem přepsalo OVR/jiná pole (race s uložením).
   */
  useEffect(() => {
    if (!user?.id || kartyLoading) return;
    if (typeof window === "undefined") return;
    const ssKey = `hut-xf-ikony-db-2026-04-${user.id}`;
    if (sessionStorage.getItem(ssKey)) return;

    const sXF = karty.filter((c) => (c.xFactory?.length ?? 0) > 0);
    if (sXF.length === 0) {
      sessionStorage.setItem(ssKey, "1");
      return;
    }

    let zruseno = false;
    void (async () => {
      for (const karta of sXF) {
        if (zruseno) return;
        const { error } = await aktualizujJenAtributyKarty(
          supabase,
          user.id,
          karta.id,
          karta,
        );
        if (error) {
          console.error("[hut] synchronizace X-F ikon do DB:", karta.id, error.message);
          return;
        }
      }
      if (!zruseno) sessionStorage.setItem(ssKey, "1");
    })();

    return () => {
      zruseno = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- jen snapshot po fetchi; `karty` nesmí spouštět opakovaně
  }, [user?.id, kartyLoading, supabase]);

  const [razeniKaret, nastavRazeniKaret] = useRazeniKaret();

  const kartyKNahledu = useMemo(
    () => nahledCtyriKaret(karty, razeniKaret),
    [karty, razeniKaret],
  );

  const resetForm = useCallback(() => {
    setJmeno("");
    setOvr("");
    setPozice("C");
    setPreferovanaRuka("LR");
    setNarodnostKod("");
    setTym("");
    setLiga("NHL");
    setTypKarty("");
    setPlat("");
    setXFactory(triPrazdneXFactory());
    setEditujiSlug(null);
    setFormError(null);
    setUpozorneniKartovaNapoveda(false);
    setEaNapovedaVycistit((n) => n + 1);
  }, []);

  const naplnFormZKarty = useCallback(
    (k: HutCard) => {
      setJmeno(k.jmeno);
      setOvr(String(k.ovr));
      setPozice(k.pozice);
      setPreferovanaRuka(k.preferovanaRuka);
      const kodNar =
        narodnostiVolby.find((n) => n.label === k.narodnost)?.code ?? "";
      setNarodnostKod(kodNar);
      setLiga(k.liga);
      setTym(k.tym);
      setTypKarty(k.typKarty);
      const mil = k.plat / 1_000_000;
      setPlat(
        Number.isFinite(mil)
          ? mil.toLocaleString("cs-CZ", { maximumFractionDigits: 2 })
          : "",
      );
      const xf = obnovIkonyXeFactoryZKatalogu(k.xFactory) ?? [];
      setXFactory([
        xf[0] ?? { id: "", label: "" },
        xf[1] ?? { id: "", label: "" },
        xf[2] ?? { id: "", label: "" },
      ]);
      setEditujiSlug(k.id);
      setFormError(null);
      setUpozorneniKartovaNapoveda(false);
      requestAnimationFrame(() => {
        document
          .getElementById("form-inventar-karta")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [narodnostiVolby],
  );

  useEffect(() => {
    const slug = searchParams.get("edit");
    if (!slug) {
      editZQueryZpracovan.current = null;
      return;
    }
    if (!user?.id || kartyLoading) return;

    const k = karty.find((c) => c.id === slug);
    if (!k) {
      if (editZQueryZpracovan.current === slug) return;
      editZQueryZpracovan.current = slug;
      router.replace("/", { scroll: false });
      return;
    }

    if (editZQueryZpracovan.current === slug) return;
    editZQueryZpracovan.current = slug;
    naplnFormZKarty(k);
    router.replace("/", { scroll: false });
  }, [searchParams, user?.id, kartyLoading, karty, naplnFormZKarty, router]);

  const zmenXFactoryVyber = useCallback(
    (index: number, value: string) => {
      setXFactory((prev) => {
        const next = [...prev];
        while (next.length < 3) next.push({ id: "", label: "" });
        next.length = 3;
        const cur = next[index]!;
        if (value === "") {
          next[index] = { id: "", label: "" };
          return next;
        }
        if (value === OPTION_VLASTNI) {
          next[index] = {
            id: "vlastni",
            label: cur.label.trim() ? cur.label : "",
            imageUrl: cur.imageUrl,
            typeLabel: cur.typeLabel,
            typeIconUrl: cur.typeIconUrl,
            ...(cur.xfUroven ? { xfUroven: cur.xfUroven } : {}),
          };
          return next;
        }
        const p = polozkaPodleKlice(value);
        if (p) {
          const zlato: XFactorUroven = "gold";
          next[index] = {
            id: p.klic,
            label: p.labelEn,
            imageUrl: iconUrlProEaShody(p.eaShody, p.klic),
            typeLabel: cur.typeLabel,
            typeIconUrl: cur.typeIconUrl,
            xfUroven: zlato,
          };
        }
        return next;
      });
    },
    [],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!user?.id) {
      setFormError("Pro uložení karty se musíš přihlásit.");
      return;
    }

    if (!ovr.trim()) {
      setFormError("Vyplň OVR.");
      return;
    }
    const ovrNum = Number.parseInt(ovr, 10);
    if (Number.isNaN(ovrNum) || ovrNum < 0 || ovrNum > 99) {
      setFormError("OVR musí být celé číslo mezi 0 a 99.");
      return;
    }

    if (!plat.trim()) {
      setFormError("Vyplň plat v milionech.");
      return;
    }
    const platNum = parsePlatVstupVMilionech(plat);
    if (platNum === null) {
      setFormError("Plat zadej v milionech (např. 1,5 nebo 12).");
      return;
    }

    if (!jmeno.trim()) {
      setFormError("Vyplň jméno hráče.");
      return;
    }

    if (!narodnostKod) {
      setFormError("Vyber národnost.");
      return;
    }

    const narodnostLabel = narodnostiVolby.find((n) => n.code === narodnostKod)
      ?.label;
    if (!narodnostLabel) {
      setFormError("Neplatná národnost.");
      return;
    }

    if (!najdiMetaTypuKarty(typKarty)) {
      setFormError("Vyber typ karty.");
      return;
    }

    if (!tym.trim() || !tymyProLigu(liga).includes(tym)) {
      setFormError("Vyberte platný tým pro zvolenou ligu.");
      return;
    }

    const kartyProGenerovaniSlug = editujiSlug
      ? karty.filter((c) => c.id !== editujiSlug)
      : karty;
    const finalId = vygenerujIdKarty(
      jmeno.trim(),
      ovrNum,
      kartyProGenerovaniSlug,
    );

    const typKartyUlozit =
      najdiMetaTypuKarty(typKarty)?.hodnotaFiltru ?? typKarty.trim();

    const xfUlozit = xFactory
      .filter((x) => x.label.trim())
      .slice(0, 3)
      .map((x) => ({
        id: (x.id || x.label).trim(),
        label: x.label.trim(),
        ...(x.imageUrl ? { imageUrl: x.imageUrl } : {}),
        ...(x.typeLabel ? { typeLabel: x.typeLabel } : {}),
        ...(x.typeIconUrl ? { typeIconUrl: x.typeIconUrl } : {}),
        ...(x.xfUroven ? { xfUroven: x.xfUroven } : {}),
      }));

    const nova: HutCard = {
      id: finalId,
      jmeno: jmeno.trim(),
      ovr: ovrNum,
      pozice,
      preferovanaRuka,
      narodnost: narodnostLabel,
      tym: tym.trim(),
      liga,
      typKarty: typKartyUlozit,
      plat: platNum,
    };
    if (xfUlozit.length) nova.xFactory = xfUlozit;

    setUkladamKartu(true);
    const errUloz = editujiSlug
      ? (await aktualizujKartu(supabase, user.id, editujiSlug, nova)).error
      : (await vlozKartu(supabase, user.id, nova)).error;
    setUkladamKartu(false);

    if (errUloz) {
      const msg = errUloz.message.toLowerCase();
      if (msg.includes("duplicate") || msg.includes("unique")) {
        setFormError(
          "Karta s tímto ID (slug z jména + OVR) už existuje. Změň OVR nebo jméno.",
        );
      } else {
        setFormError(errUloz.message);
      }
      return;
    }

    if (editujiSlug) {
      setKarty((prev) =>
        prev.map((c) => (c.id === editujiSlug ? nova : c)),
      );
    } else {
      setKarty((prev) => [...prev, nova]);
    }
    resetForm();
  };

  const smazatKartu = async (idKarty: string) => {
    if (!user?.id) return;
    const { error: errSmaz } = await smazKartuPodleSlug(supabase, user.id, idKarty);
    if (errSmaz) {
      setKartyChyba(errSmaz.message);
      return;
    }
    if (editujiSlug === idKarty) {
      resetForm();
    }
    setKarty((prev) => prev.filter((k) => k.id !== idKarty));
  };

  const formZakazany = !user || authLoading || ukladamKartu;

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Můj Inventář</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--hut-muted)] sm:text-[15px]">
          Přidávej karty podle struktury{" "}
          <code className="rounded bg-[var(--hut-surface-raised)] px-1.5 py-0.5 font-mono text-xs text-[var(--hut-lime)]">
            HutCard
          </code>
          . Po přihlášení se ukládají do Supabase (tabulka <code className="font-mono text-xs">cards</code>) pod
          tvým účtem.
        </p>
      </div>

      {!authLoading && !user ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-950/25 px-4 py-3 text-sm text-amber-100/95">
          Pro práci s inventářem se musíš{" "}
          <Link href="/login" className="font-medium text-[var(--hut-lime)] underline underline-offset-2">
            přihlásit
          </Link>{" "}
          nebo{" "}
          <Link href="/register" className="font-medium text-[var(--hut-lime)] underline underline-offset-2">
            zaregistrovat
          </Link>
          .
        </div>
      ) : null}

      <form
        id="form-inventar-karta"
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[var(--hut-border)] bg-[var(--hut-surface)]/52 p-4 shadow-[0_24px_48px_rgba(0,0,0,0.45)] sm:p-6 md:p-8"
      >
        <h3 className="text-lg font-medium text-white">
          {editujiSlug ? "Upravit kartu" : "Přidat kartu"}
        </h3>
        <p className="mt-1 text-xs text-[var(--hut-muted)]">
          Kromě X-Faktorů jsou všechna pole povinná (<OznaPovinne />).
        </p>

        {formError ? (
          <p
            className="mt-4 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200"
            role="alert"
          >
            {formError}
          </p>
        ) : null}

        <fieldset
          disabled={formZakazany}
          className="mt-6 min-w-0 border-0 p-0 disabled:opacity-55 [&:disabled]:pointer-events-none"
        >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-2">
            <EaHracNapoveda
              userId={user?.id ?? null}
              inventarPocet={karty.length}
              onVybrat={priVyberuEaHrace}
              disabled={formZakazany}
              vycisteniDotazuVerze={eaNapovedaVycistit}
            />
            {upozorneniKartovaNapoveda ? (
              <p
                className="rounded-lg border border-sky-500/35 bg-sky-950/35 px-3 py-2.5 text-sm leading-snug text-sky-100/95"
                role="status"
              >
                Údaje byly doplněny z <strong className="font-semibold text-white">poslední uložené karty</strong> se
                stejným jménem a týmem v databázi (náhled z komunity). Před uložením je{" "}
                <strong className="font-semibold text-white">zkontroluj</strong> — může jít o jinou variantu karty (OVR,
                typ, X-Faktory…), která se liší třeba jen v jedné hodnotě.
              </p>
            ) : null}
          </div>
          <div className="sm:col-span-2 grid grid-cols-1 gap-5 md:grid-cols-6 md:items-end">
            <div className="min-w-0 md:col-span-2">
              <label htmlFor="inv-jmeno" className={labelClass}>
                Jméno <OznaPovinne />
              </label>
              <input
                id="inv-jmeno"
                className={inputClass}
                required
                value={jmeno}
                onChange={(e) => setJmeno(e.target.value)}
                placeholder="Connor McDavid"
                autoComplete="name"
              />
            </div>

            <div className="min-w-0 w-full max-w-[6rem] md:col-span-1 md:w-[3.75rem] md:max-w-[3.75rem] md:justify-self-start">
              <label htmlFor="inv-ovr" className={labelClass}>
                OVR <OznaPovinne />
              </label>
              <input
                id="inv-ovr"
                type="number"
                min={0}
                max={99}
                required
                className={`${inputClass} min-h-11 text-center text-base tabular-nums md:min-h-0 md:px-2 md:text-sm`}
                value={ovr}
                onChange={(e) => setOvr(e.target.value)}
                placeholder="95"
              />
            </div>

            <div className="min-w-0 md:col-span-1">
              <label htmlFor="inv-pozice" className={labelClass}>
                Pozice <OznaPovinne />
              </label>
              <select
                id="inv-pozice"
                className={`${selectClass} md:px-2`}
                required
                value={pozice}
                onChange={(e) => setPozice(e.target.value as Pozice)}
              >
                {HUT_POZICE.map((p) => (
                  <option key={p} value={p}>
                    {HUT_POZICE_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-0 md:col-span-1">
              <label htmlFor="inv-ruka" className={labelClass}>
                Preferovaná ruka <OznaPovinne />
              </label>
              <select
                id="inv-ruka"
                className={`${selectClass} md:px-2`}
                required
                value={preferovanaRuka}
                onChange={(e) => setPreferovanaRuka(e.target.value as Ruka)}
              >
                {RUKY.map((r) => (
                  <option key={r} value={r}>
                    {RUKA_LABEL[r]}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-0 md:col-span-1">
              <label htmlFor="inv-plat" className={labelClass}>
                Plat (mil.) <OznaPovinne />
              </label>
              <input
                id="inv-plat"
                type="text"
                inputMode="decimal"
                required
                className={`${inputClass} tabular-nums md:px-2.5`}
                value={plat}
                onChange={(e) => setPlat(e.target.value)}
                placeholder="1,5"
                autoComplete="off"
              />
            </div>
          </div>

          <fieldset className="sm:col-span-2 rounded-xl border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]/40 p-4">
            <legend className="px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--hut-lime)]">
              Liga a tým
            </legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="inv-liga" className={labelClass}>
                  Liga <OznaPovinne />
                </label>
                <select
                  id="inv-liga"
                  className={selectClassDropdown}
                  required
                  value={liga}
                  onChange={(e) => {
                    const nova = e.target.value as Liga;
                    setLiga(nova);
                    setTym((prev) =>
                      prev && tymyProLigu(nova).includes(prev) ? prev : "",
                    );
                  }}
                >
                  {LIGY_V_PORADI.map((l) => (
                    <option key={l} value={l}>
                      {LIGA_ZOBRAZENI[l]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="inv-tym" className={labelClass}>
                  Tým <OznaPovinne />
                </label>
                <TymVyber
                  key={liga}
                  id="inv-tym"
                  liga={liga}
                  tymy={tymyProAktualniLigu}
                  value={tym}
                  onChange={setTym}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="inv-tym-hledat" className={labelClass}>
                  Najít tým napříč ligami
                </label>
                <p className="mb-1.5 text-[11px] leading-snug text-[var(--hut-muted)]/85">
                  Nevíš, ve které lize tým je? Zadej část názvu — po výběru se nastaví liga i tým.
                </p>
                <TymHledacNapricLigami
                  id="inv-tym-hledat"
                  disabled={formZakazany}
                  onVybrat={(novaLiga, novyTym) => {
                    setLiga(novaLiga);
                    setTym(novyTym);
                  }}
                />
              </div>
            </div>
          </fieldset>

          <div className="sm:col-span-2 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="inv-narodnost" className={labelClass}>
                Národnost <OznaPovinne />
              </label>
              <div className="mt-1">
                <NarodnostVyber
                  id="inv-narodnost"
                  volby={narodnostiVolby}
                  value={narodnostKod}
                  onChange={setNarodnostKod}
                  disabled={narodnostiVolby.length === 0}
                />
              </div>
            </div>

            <div className="min-w-0">
              <label htmlFor="inv-typ" className={labelClass}>
                Typ karty <OznaPovinne />
              </label>
              <div className="mt-1">
                <TypKartyVyber
                  id="inv-typ"
                  typy={hutdbTypyKaret}
                  value={typKarty}
                  onChange={setTypKarty}
                />
              </div>
            </div>
          </div>

          <fieldset className="sm:col-span-2 rounded-xl border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]/40 p-4">
            <legend className="px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--hut-lime)]">
              X-Faktory
            </legend>
            <p className="mb-3 text-xs text-[var(--hut-muted)]">
              Tři sloty (jako ve hře). Názvy anglicky jako u EA; ikony jsou v rozbalovací nabídce.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((i) => {
                const xf = xFactory[i] ?? { id: "", label: "" };
                const sel = klicProSelect(xf);
                const vlastni = sel === OPTION_VLASTNI;
                return (
                  <div key={`xf-slot-${i}`} className="min-w-0 flex flex-col gap-1.5">
                    <span className={labelClass}>X-Factor {i + 1}</span>
                    <XFactorVyber
                      id={`inv-xf-${i}`}
                      value={sel}
                      onChange={(v) => zmenXFactoryVyber(i, v)}
                      polozky={xFactoryKatalogSerazeny}
                      urovenNaTlacitku={xf.xfUroven}
                      disabled={formZakazany}
                      className="relative min-w-0"
                      triggerClassName={`${selectClassDropdown} flex w-full min-w-0 items-center justify-start gap-2 text-left`}
                    />
                    {vlastni ? (
                      <input
                        type="text"
                        aria-label={`Vlastní název X-Faktoru ${i + 1}`}
                        className={inputClass}
                        value={xf.label}
                        onChange={(e) => {
                          const v = e.target.value;
                          setXFactory((prev) => {
                            const next = [...prev];
                            while (next.length < 3) next.push({ id: "", label: "" });
                            next.length = 3;
                            const cur = next[i];
                            if (!cur) return prev;
                            next[i] = {
                              ...cur,
                              id: "vlastni",
                              label: v,
                            };
                            return next;
                          });
                        }}
                        placeholder="Custom ability name"
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </fieldset>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="submit"
            disabled={narodnostiVolby.length === 0 || formZakazany}
            className="min-h-12 w-full touch-manipulation rounded-full border border-zinc-600 bg-[var(--hut-btn)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:border-zinc-500 hover:bg-[var(--hut-btn-hover)] disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-0 sm:w-auto sm:py-2.5"
          >
            {ukladamKartu
              ? "Ukládám…"
              : editujiSlug
                ? "Uložit změny"
                : "Přidat kartu"}
          </button>
          <button
            type="button"
            onClick={resetForm}
            disabled={formZakazany}
            className="min-h-12 w-full touch-manipulation rounded-full border border-[var(--hut-border-strong)] bg-transparent px-5 py-3 text-sm font-medium text-[var(--hut-muted)] transition-colors hover:border-zinc-500 hover:text-white disabled:opacity-45 sm:min-h-0 sm:w-auto sm:py-2.5"
          >
            {editujiSlug ? "Zrušit úpravu" : "Vymazat formulář"}
          </button>
        </div>
        </fieldset>
      </form>

      <section>
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-lg font-medium text-white">Moje karty</h3>
              {user && !kartyLoading && karty.length > 0 ? (
                <Link
                  href="/moje-karty"
                  className="text-sm font-medium text-[var(--hut-lime)] underline-offset-2 hover:underline"
                >
                  Všechny karty
                </Link>
              ) : null}
            </div>
            <p className="text-sm text-[var(--hut-muted)]">
              {!user
                ? "Nepřihlášen."
                : kartyLoading
                  ? "Načítám…"
                  : karty.length === 0
                    ? "Zatím žádné karty."
                    : karty.length <= 4
                      ? `${karty.length} ${karty.length === 1 ? "karta" : "karty"}`
                      : razeniKaret === "pridani"
                        ? `4 nejnovější z ${karty.length} karet`
                        : razeniKaret === "ovr-asc"
                          ? `4 nejnižší OVR z ${karty.length} karet`
                          : `4 nejvyšší OVR z ${karty.length} karet`}
            </p>
          </div>
          {user && !kartyLoading && karty.length > 0 ? (
            <div
              className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2"
              role="group"
              aria-label="Řazení karet v přehledu"
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--hut-muted)]">
                Řazení
              </span>
              <div className="flex flex-wrap items-center gap-2">
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
            </div>
          ) : null}
        </div>

        {kartyChyba ? (
          <p
            className="mb-4 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200"
            role="alert"
          >
            {kartyChyba}
          </p>
        ) : null}

        {!user ? (
          <p className="rounded-xl border border-dashed border-[var(--hut-border)] bg-[var(--hut-surface)]/50 px-6 py-12 text-center text-sm text-[var(--hut-muted)]">
            Po přihlášení se tu zobrazí karty z cloudu.
          </p>
        ) : kartyLoading ? (
          <p className="rounded-xl border border-dashed border-[var(--hut-border)] bg-[var(--hut-surface)]/50 px-6 py-12 text-center text-sm text-[var(--hut-muted)]">
            Načítám karty…
          </p>
        ) : karty.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--hut-border)] bg-[var(--hut-surface)]/50 px-6 py-12 text-center text-sm text-[var(--hut-muted)]">
            Přidej první kartu pomocí formuláře výše.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            {kartyKNahledu.map((k) => (
              <InventarKartaPolozka
                key={k.id}
                karta={k}
                narodnostiVolby={narodnostiVolby}
                onEditovat={naplnFormZKarty}
                onSmazat={smazatKartu}
                formZakazany={formZakazany}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
