import Link from "next/link";
import {
  AuthPageShell,
  authFormPanelClass,
  authLinkClass,
  authMutedLinkClass,
} from "@/components/AuthPageShell";

const h2Class = "mt-8 text-base font-semibold text-white first:mt-0";
const h3Class = "mt-5 text-sm font-semibold text-zinc-200";
const pClass = "mt-2 text-sm leading-relaxed text-[var(--hut-muted)]";
const ulClass = "mt-2 list-inside list-disc space-y-1.5 text-sm leading-relaxed text-[var(--hut-muted)]";
const tableClass = "mt-3 w-full text-left text-sm text-[var(--hut-muted)]";
const thClass = "border-b border-[var(--hut-border)] py-2 pr-3 font-medium text-zinc-300";
const tdClass = "border-b border-[var(--hut-border)]/60 py-2 pr-3 align-top";

function Obsah() {
  return (
    <nav className="rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--hut-muted)]">Obsah</p>
      <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-[var(--hut-lime)]">
        <li><a href="#zacatek" className="hover:underline">Začínáme</a></li>
        <li><a href="#navigace" className="hover:underline">Kam v aplikaci</a></li>
        <li><a href="#inventar" className="hover:underline">Můj inventář</a></li>
        <li><a href="#moje-karty" className="hover:underline">Moje karty</a></li>
        <li><a href="#optimalizator" className="hover:underline">Optimalizátor</a></li>
        <li><a href="#soupiska" className="hover:underline">Soupiska</a></li>
        <li><a href="#ucet" className="hover:underline">Nastavení účtu</a></li>
        <li><a href="#tipy" className="hover:underline">Časté otázky</a></li>
      </ol>
    </nav>
  );
}

export function NavodUzivatele() {
  return (
    <AuthPageShell>
      <div className={`${authFormPanelClass} max-h-[min(85vh,52rem)] overflow-y-auto`}>
        <h1 className="text-xl font-semibold tracking-tight text-white">Návod k použití</h1>
        <p className={pClass}>
          HUT Builder — jak přidat karty, hledat formace a skládat soupisku. Bez technických detailů.
        </p>

        <div className="mt-6">
          <Obsah />
        </div>

        <section id="zacatek" className="mt-8">
          <h2 className={h2Class}>1. Začínáme</h2>
          <h3 className={h3Class}>Registrace a přihlášení</h3>
          <ol className="mt-2 list-inside list-decimal space-y-1.5 text-sm leading-relaxed text-[var(--hut-muted)]">
            <li>Nemáš účet? <Link href="/register" className={authLinkClass}>Registrace</Link>.</li>
            <li>Přihlas se na <Link href="/login" className={authLinkClass}>Přihlášení</Link>.</li>
            <li>Zapomenuté heslo: <Link href="/obnova-hesla" className={authLinkClass}>Obnova hesla</Link>.</li>
          </ol>
          <p className={pClass}>
            Karty se ukládají pod tvým účtem v cloudu — na jiném zařízení je uvidíš po stejném přihlášení.
          </p>
          <p className={pClass}>
            Pro optimalizátor potřebuješ alespoň jednu aktivní (neprodanou) kartu v inventáři.
          </p>
        </section>

        <section id="navigace" className="mt-8">
          <h2 className={h2Class}>2. Kam v aplikaci</h2>
          <p className={pClass}>V levém menu (na mobilu ☰):</p>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Položka</th>
                <th className={thClass}>Účel</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={tdClass}>Můj Inventář</td>
                <td className={tdClass}>Přidávání a úprava karet, hromadný import</td>
              </tr>
              <tr>
                <td className={tdClass}>Moje karty</td>
                <td className={tdClass}>Celý seznam, filtry, export</td>
              </tr>
              <tr>
                <td className={tdClass}>Optimalizátor formací</td>
                <td className={tdClass}>Hledání sestav a soupiska</td>
              </tr>
              <tr>
                <td className={tdClass}>Nastavení účtu</td>
                <td className={tdClass}>Změna hesla</td>
              </tr>
            </tbody>
          </table>
          <p className={pClass}>
            Inventář a optimalizátor sdílí hlavní stránku — v menu jen přepneš sekci.
          </p>
        </section>

        <section id="inventar" className="mt-8">
          <h2 className={h2Class}>3. Můj inventář</h2>
          <h3 className={h3Class}>Přidání karty</h3>
          <ol className="mt-2 list-inside list-decimal space-y-1.5 text-sm leading-relaxed text-[var(--hut-muted)]">
            <li>Vyplň formulář <strong className="text-zinc-300">Přidat kartu</strong> (kromě X-Faktorů je vše povinné).</li>
            <li>U <strong className="text-zinc-300">Jména</strong> piš a vyber z nápovědy — EA doplní tým a pozici, komunitní karta doplní údaje z databáze (vždy zkontroluj OVR a plat).</li>
            <li>Doplň OVR, pozici, ruku, plat v milionech (např. 1,5), národnost, typ karty, ligu a tým.</li>
            <li>Volitelně až 3 X-Faktory.</li>
            <li>Klikni <strong className="text-zinc-300">Přidat kartu</strong> (zkratka Ctrl+Enter / ⌘+Enter).</li>
          </ol>
          <h3 className={h3Class}>Hromadný import</h3>
          <p className={pClass}>
            Blok <strong className="text-zinc-300">Rychlý import víc karet z databáze</strong> → Rozbalit →
            zaškrtni karty od ostatní → <strong className="text-zinc-300">Přidat vybrané</strong>.
          </p>
          <h3 className={h3Class}>Prodáno</h3>
          <p className={pClass}>
            Při úpravě zaškrtni <strong className="text-zinc-300">Prodáno</strong> — karta zůstane v databázi, ale
            nepočítá se v optimalizátoru.
          </p>
        </section>

        <section id="moje-karty" className="mt-8">
          <h2 className={h2Class}>4. Moje karty</h2>
          <p className={pClass}>
            Přehled všech karet: řazení, filtr pozice a prodaných. U karty: Upravit, Duplikovat (nová varianta),
            Smazat. <strong className="text-zinc-300">Exportovat JSON</strong> = záloha na disk.
          </p>
        </section>

        <section id="optimalizator" className="mt-8">
          <h2 className={h2Class}>5. Optimalizátor formací</h2>
          <p className={pClass}>
            Hledá plné sestavy podle pravidel bonusů: útok (3 hráči), obrana (2), brankáři (2). Prodané karty se
            nepočítají.
          </p>
          <h3 className={h3Class}>Postup</h3>
          <ol className="mt-2 list-inside list-decimal space-y-1.5 text-sm leading-relaxed text-[var(--hut-muted)]">
            <li>Nastav filtry (OVR, hráč, rozpočet, typ bonusu…).</li>
            <li>Klikni <strong className="text-zinc-300">Hledat</strong>.</li>
            <li>Procházej výsledky, řaď, filtruj překryv bonusů.</li>
            <li>U řádku <strong className="text-zinc-300">Přidat do soupisky</strong>.</li>
            <li>Po změně filtrů nahoře znovu Hledat.</li>
          </ol>
          <h3 className={h3Class}>Filtry</h3>
          <ul className={ulClass}>
            <li><strong className="text-zinc-300">Typ bonusu</strong> — Vše nebo PLAT / CLK / BS</li>
            <li><strong className="text-zinc-300">OVR</strong> — prázdné = bez limitu</li>
            <li><strong className="text-zinc-300">Hráč</strong> — vyhledání karty z inventáře</li>
            <li><strong className="text-zinc-300">Rozpočet</strong> — max. součet platů ve formaci (mil.)</li>
            <li><strong className="text-zinc-300">Křídla vzájemně</strong> / <strong className="text-zinc-300">LO↔PO</strong> — prohozené pozice</li>
          </ul>
          <p className={pClass}>
            Po hledání: filtr překryvu bonusů, zobrazení jen jedné sekce, řazení podle OVR nebo hodnoty bonusu.
          </p>
        </section>

        <section id="soupiska" className="mt-8">
          <h2 className={h2Class}>6. Soupiska</h2>
          <p className={pClass}>
            Cíl: <strong className="text-zinc-300">4 útok + 3 obrana + 1 brankář</strong> (celkem, ne pro každý typ
            bonusu zvlášť). Panel ukazuje počty řádků a součet platů.
          </p>
          <ul className={ulClass}>
            <li>Připnutí se <strong className="text-zinc-300">ukládá samo</strong> v tomto prohlížeči.</li>
            <li>Po <strong className="text-zinc-300">Hledat</strong> se soupiska obnoví, pokud řádky sedí na výsledky.</li>
            <li><strong className="text-zinc-300">Uložit kompletní soupisku</strong> — až máš 4+3+1.</li>
            <li><strong className="text-zinc-300">Obnovit z uložené</strong> — přepíše aktuální výběr.</li>
            <li><strong className="text-zinc-300">Smazat uloženou</strong> — vymaže uloženou i připnuté řádky.</li>
          </ul>
          <p className={`${pClass} text-amber-100/90`}>
            Soupiska je jen v tomto prohlížeči — jiný počítač nebo vymazaná data = prázdná soupiska. Karty v cloudu
            zůstávají.
          </p>
        </section>

        <section id="ucet" className="mt-8">
          <h2 className={h2Class}>7. Nastavení účtu</h2>
          <p className={pClass}>
            <Link href="/nastaveni-uctu" className={authLinkClass}>Nastavení účtu</Link> — změna hesla (současné +
            nové dvakrát, min. 6 znaků).
          </p>
        </section>

        <section id="tipy" className="mt-8">
          <h2 className={h2Class}>8. Časté otázky</h2>
          <h3 className={h3Class}>Optimalizátor nic nenajde?</h3>
          <ul className={ulClass}>
            <li>Žádné aktivní karty, moc přísné filtry, nebo chybí kombinace v nastavení bonusů.</li>
            <li>Hráč na špatné pozici (obránce v útoku).</li>
          </ul>
          <h3 className={h3Class}>PLAT, CLK, BS?</h3>
          <p className={pClass}>Typy bonusů z komunitního nastavení (plat, chemie, body synergie).</p>
          <h3 className={h3Class}>Vztah k EA</h3>
          <p className={pClass}>Neoficiální komunitní nástroj — není od EA Sports.</p>
        </section>

        <p className="mt-10 text-center text-sm">
          <Link href="/" className={authLinkClass}>
            Do aplikace
          </Link>
          {" · "}
          <Link href="/o-aplikaci" className={authMutedLinkClass}>
            O aplikaci
          </Link>
        </p>
      </div>
    </AuthPageShell>
  );
}
