"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  HUT_SEZONA_COOKIE,
  HUT_SEZONA_STORAGE_KEY,
  cestaSezony,
  type Sezona,
} from "@/lib/sezona";
import { HUT_FORM_PAGE_BG } from "@/lib/hutFormBackground";

function ulozVolbuSezony(sezona: Sezona) {
  try {
    window.localStorage.setItem(HUT_SEZONA_STORAGE_KEY, sezona);
  } catch {
    /* ignore */
  }
  document.cookie = `${HUT_SEZONA_COOKIE}=${sezona};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
}

const KARTY: {
  sezona: Sezona;
  nadpis: string;
  popis: string;
  stav: string;
}[] = [
  {
    sezona: "nhl26",
    nadpis: "NHL 26",
    popis: "Stávající inventář, bonusy a optimalizátor — data, která už máš.",
    stav: "Aktivní databáze",
  },
  {
    sezona: "nhl27",
    nadpis: "NHL 27",
    popis: "Nová prázdná databáze — karty a kombinace plníš od začátku.",
    stav: "Nová sezóna",
  },
];

export function RozcestnikSezon() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--hut-bg)] text-sm text-[var(--hut-muted)]">
        Načítám…
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh" style={HUT_FORM_PAGE_BG}>
      <div className="relative z-0 mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-4 py-12 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--hut-lime)]">
          HUT Builder
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Vyber sezónu
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--hut-muted)] sm:text-base">
          Každá sezóna má vlastní databázi karet a bonusů. Přihlášení je společné.
        </p>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {KARTY.map((k) => (
            <li key={k.sezona}>
              <Link
                href={cestaSezony(k.sezona)}
                onClick={() => ulozVolbuSezony(k.sezona)}
                className="group flex h-full flex-col rounded-2xl border border-[var(--hut-border)] bg-[var(--hut-surface)]/80 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.35)] transition-[border-color,transform,background] hover:-translate-y-0.5 hover:border-[var(--hut-lime)]/45 hover:bg-[var(--hut-surface-raised)]"
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--hut-muted)]">
                  {k.stav}
                </span>
                <span className="mt-2 text-2xl font-semibold text-white group-hover:text-[var(--hut-lime)]">
                  {k.nadpis}
                </span>
                <span className="mt-3 text-sm leading-relaxed text-[var(--hut-muted)]">
                  {k.popis}
                </span>
                <span className="mt-6 text-sm font-medium text-[var(--hut-lime)]">
                  Otevřít →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
