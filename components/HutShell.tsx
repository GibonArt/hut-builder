"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { jeBonusAdmin } from "@/lib/bonusAdmin";
import {
  HUT_PENDING_HOME_SECTION_KEY,
  type HutPendingHomeSection,
} from "@/lib/hutHomeSectionPending";

const NAV_INVENTAR = {
  id: "inventar" as const,
  label: "Můj Inventář",
  hint: "Správa karet a hráčů",
};

const NAV_BONUSY = {
  href: "/nastaveni-bonusu" as const,
  label: "Nastavení bonusů",
  hint: "Kombinace synergií",
};

const NAV_OPTIMALIZATOR = {
  id: "optimalizator" as const,
  label: "Optimalizátor formací",
  hint: "Sestavení lajn",
};

/** Sekce přepínané jen na domovské stránce `/` (ne samostatné routy). */
export type HutSection = "inventar" | "optimalizator";

type Props = {
  children: React.ReactNode;
  /** Text v horní liště (např. „Aktuální sekce: …“). */
  headerSectionLabel: string;
  mainClassName?: string;
  /** Např. pozadí stránky (`HUT_FORM_PAGE_BG`) — nelze vyjádřit čistě Tailwindem. */
  mainStyle?: CSSProperties;
  mainInnerClassName?: string;
  /** Sekce na domovské stránce `/` (tlačítka Bonusy / Optimalizátor). */
  homeActiveSection?: HutSection;
  onHomeSectionChange?: (s: HutSection) => void;
};

export function HutShell({
  children,
  headerSectionLabel,
  mainClassName,
  mainStyle,
  mainInnerClassName = "mx-auto max-w-5xl",
  homeActiveSection = "inventar",
  onHomeSectionChange,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const naDomovske = pathname === "/";
  const naMojeKarty = pathname === "/moje-karty";
  const naNastaveniBonusu = pathname === "/nastaveni-bonusu";
  const zobrazitOdkazBonusy = Boolean(user && jeBonusAdmin(user.email));

  return (
    <div className="flex min-h-dvh w-full">
      <aside className="flex w-64 shrink-0 flex-col border-r border-[var(--hut-border)] bg-[var(--hut-surface)]">
        <div className="border-b border-[var(--hut-border)] px-5 py-6">
          <div className="w-full max-w-full">
            <Image
              src="/logos/login-hut-builder-removebg.png"
              alt=""
              width={677}
              height={369}
              unoptimized
              priority
              aria-hidden
              className="h-auto w-full object-contain"
              sizes="216px"
            />
          </div>
          <h1 className="sr-only">
            HUT Builder — Nástroj pro lajny by PuckAssassin86
          </h1>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Hlavní navigace">
          <Link
            href="/"
            onClick={(e) => {
              if (naDomovske && onHomeSectionChange) {
                e.preventDefault();
                onHomeSectionChange("inventar");
              }
            }}
            className={[
              "group rounded-xl px-3 py-3 text-left transition-colors",
              naDomovske && homeActiveSection === "inventar"
                ? "bg-[var(--hut-surface-raised)] text-white shadow-[0_0_28px_var(--hut-focus-glow)] ring-1 ring-[var(--hut-focus)]/55"
                : "text-[var(--hut-muted)] hover:bg-[var(--hut-surface-raised)]/60 hover:text-zinc-200",
            ].join(" ")}
          >
            <span className="block text-sm font-medium">{NAV_INVENTAR.label}</span>
            <span
              className={[
                "mt-0.5 block text-xs transition-colors",
                naDomovske && homeActiveSection === "inventar"
                  ? "text-[var(--hut-muted)]"
                  : "text-[var(--hut-muted)]/70",
              ].join(" ")}
            >
              {NAV_INVENTAR.hint}
            </span>
          </Link>

          <Link
            href="/moje-karty"
            className={[
              "group rounded-xl px-3 py-3 text-left transition-colors",
              naMojeKarty
                ? "bg-[var(--hut-surface-raised)] text-white shadow-[0_0_28px_var(--hut-focus-glow)] ring-1 ring-[var(--hut-focus)]/55"
                : "text-[var(--hut-muted)] hover:bg-[var(--hut-surface-raised)]/60 hover:text-zinc-200",
            ].join(" ")}
          >
            <span className="block text-sm font-medium">Moje karty</span>
            <span
              className={[
                "mt-0.5 block text-xs transition-colors",
                naMojeKarty ? "text-[var(--hut-muted)]" : "text-[var(--hut-muted)]/70",
              ].join(" ")}
            >
              Všechny karty v inventáři
            </span>
          </Link>

          {!loading && zobrazitOdkazBonusy ? (
            <Link
              href={NAV_BONUSY.href}
              className={[
                "group rounded-xl px-3 py-3 text-left transition-colors",
                naNastaveniBonusu
                  ? "bg-[var(--hut-surface-raised)] text-white shadow-[0_0_28px_var(--hut-focus-glow)] ring-1 ring-[var(--hut-focus)]/55"
                  : "text-[var(--hut-muted)] hover:bg-[var(--hut-surface-raised)]/60 hover:text-zinc-200",
              ].join(" ")}
            >
              <span className="block text-sm font-medium">{NAV_BONUSY.label}</span>
              <span
                className={[
                  "mt-0.5 block text-xs transition-colors",
                  naNastaveniBonusu ? "text-[var(--hut-muted)]" : "text-[var(--hut-muted)]/70",
                ].join(" ")}
              >
                {NAV_BONUSY.hint}
              </span>
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => {
              if (!naDomovske) {
                try {
                  const next: HutPendingHomeSection = NAV_OPTIMALIZATOR.id;
                  sessionStorage.setItem(HUT_PENDING_HOME_SECTION_KEY, next);
                } catch {
                  /* private mode atd. */
                }
                router.push("/");
                return;
              }
              onHomeSectionChange?.(NAV_OPTIMALIZATOR.id);
            }}
            className={[
              "group rounded-xl px-3 py-3 text-left transition-colors",
              naDomovske && homeActiveSection === NAV_OPTIMALIZATOR.id
                ? "bg-[var(--hut-surface-raised)] text-white shadow-[0_0_28px_var(--hut-focus-glow)] ring-1 ring-[var(--hut-focus)]/55"
                : "text-[var(--hut-muted)] hover:bg-[var(--hut-surface-raised)]/60 hover:text-zinc-200",
            ].join(" ")}
          >
            <span className="block text-sm font-medium">{NAV_OPTIMALIZATOR.label}</span>
            <span
              className={[
                "mt-0.5 block text-xs transition-colors",
                naDomovske && homeActiveSection === NAV_OPTIMALIZATOR.id
                  ? "text-[var(--hut-muted)]"
                  : "text-[var(--hut-muted)]/70",
              ].join(" ")}
            >
              {NAV_OPTIMALIZATOR.hint}
            </span>
          </button>
        </nav>

        <div className="border-t border-[var(--hut-border)] p-4">
          <p className="text-[11px] leading-snug text-[var(--hut-muted)]/70">
            Tmavý režim je výchozí — ladí k rozhraní Ultimate Team.
          </p>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--hut-border)] bg-[var(--hut-bg)]/95 px-6 backdrop-blur-md">
          <span className="min-w-0 truncate text-sm text-[var(--hut-muted)]">
            Aktuální sekce:{" "}
            <span className="font-medium text-white">{headerSectionLabel}</span>
          </span>
          <div className="flex shrink-0 items-center gap-2 text-sm">
            {loading ? (
              <span className="text-[var(--hut-muted)]">Účet…</span>
            ) : user ? (
              <>
                <span className="hidden max-w-[200px] truncate text-[var(--hut-muted)] sm:inline">
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    router.push("/login");
                    router.refresh();
                  }}
                  className="rounded-lg border border-[var(--hut-border)] px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white"
                >
                  Odhlásit
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg border border-[var(--hut-border)] px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-[var(--hut-lime)]/50 hover:text-white"
                >
                  Přihlásit
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg border border-[var(--hut-lime)]/40 bg-[var(--hut-lime)]/10 px-3 py-1.5 text-xs font-medium text-[var(--hut-lime)] transition-colors hover:bg-[var(--hut-lime)]/20"
                >
                  Registrace
                </Link>
              </>
            )}
          </div>
        </header>

        <main
          className={`flex min-h-0 flex-1 flex-col overflow-auto p-6 md:p-10 ${mainClassName ?? ""}`}
          style={mainStyle}
        >
          <div className={`min-h-full w-full ${mainInnerClassName}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
