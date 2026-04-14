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
