import Link from "next/link";
import {
  AuthPageShell,
  authFormPanelClass,
  authLinkClass,
  authMutedLinkClass,
} from "@/components/AuthPageShell";

export default function OAplikaciPage() {
  return (
    <AuthPageShell>
      <div className={authFormPanelClass}>
        <h1 className="text-xl font-semibold tracking-tight text-white">
          O aplikaci a datech
        </h1>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-[var(--hut-muted)]">
          <p>
            <strong className="font-medium text-zinc-200">HUT Builder</strong> je neoficiální
            komunitní nástroj pro práci s kartami a sestavami v režimu Hockey Ultimate Team.{" "}
            <strong className="font-medium text-zinc-200">
              Není spojený s EA Sports ani NHL.
            </strong>
          </p>
          <p>
            Po přihlášení se tvoje karty a nastavení ukládají do databáze{" "}
            <strong className="font-medium text-zinc-200">Supabase</strong> pod tvým účtem.
            Slouží ke sdílení dat v rámci komunity (např. nápovědy při zadávání karet).
          </p>
          <p className="rounded-lg border border-[var(--hut-lime)]/25 bg-[var(--hut-lime)]/[0.06] px-4 py-3 text-sm">
            <Link href="/navod" className="font-medium text-[var(--hut-lime)] underline underline-offset-2">
              Návod k použití
            </Link>{" "}
            — kompletní how-to: inventář, optimalizátor, soupiska a časté otázky.
          </p>
          <section className="rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]/40 p-4">
            <h2 className="text-sm font-semibold text-zinc-200">Co aplikace umí</h2>
            <ul className="mt-3 list-inside list-disc space-y-2 text-sm">
              <li>
                <strong className="font-medium text-zinc-300">Můj inventář</strong> — karty,
                nápověda z EA a komunity, hromadný import z katalogu, označení prodaných karet.
              </li>
              <li>
                <strong className="font-medium text-zinc-300">Moje karty</strong> — přehled,
                úpravy a mazání.
              </li>
              <li>
                <strong className="font-medium text-zinc-300">Optimalizátor formací</strong> —
                hledání útočných, obranných a brankářských sestav podle bonusů (PLAT, CLK, BS),
                filtrů OVR, rozpočtu a konkrétního hráče; skládání soupisky (4+3+1) s ukládáním v
                prohlížeči.
              </li>
              <li>
                <strong className="font-medium text-zinc-300">Nastavení bonusů</strong> — pravidla
                kombinací (pro správce komunity).
              </li>
            </ul>
            <p className="mt-3 text-xs text-[var(--hut-muted)]/90">
              Uložená soupiska v optimalizátoru zůstává jen v tomto prohlížeči (localStorage), ne na
              serveru.
            </p>
          </section>
          <p>
            Nepředáváme hesla třetím stranám — přihlášení zajišťuje Supabase Auth. Pokud máš
            otázky k mazání účtu nebo exportu dat, kontaktuj správce projektu.
          </p>
        </div>
        <p className="mt-8 text-center text-sm">
          <Link href="/login" className={authLinkClass}>
            Přihlášení
          </Link>
          {" · "}
          <Link href="/register" className={authLinkClass}>
            Registrace
          </Link>
        </p>
        <p className="mt-4 text-center">
          <Link href="/" className={authMutedLinkClass}>
            ← Do aplikace (vyžaduje účet)
          </Link>
        </p>
      </div>
    </AuthPageShell>
  );
}
