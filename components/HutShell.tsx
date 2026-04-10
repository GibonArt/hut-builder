"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const zavritMobilniMenu = useCallback(() => setMobileNavOpen(false), []);

  useEffect(() => {
    zavritMobilniMenu();
  }, [pathname, zavritMobilniMenu]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  const naDomovske = pathname === "/";
  const naMojeKarty = pathname === "/moje-karty";
  const naNastaveniBonusu = pathname === "/nastaveni-bonusu";
  const zobrazitOdkazBonusy = Boolean(user && jeBonusAdmin(user.email));

  return (
    <div className="flex min-h-dvh w-full">
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Zavřít menu"
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[1px] lg:hidden"
          onClick={zavritMobilniMenu}
        />
      ) : null}

      <aside
        id="hut-nav-drawer"
        className={[
          "fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(18rem,88vw)] max-w-full shrink-0 flex-col border-r border-[var(--hut-border)] bg-[var(--hut-surface)] shadow-[8px_0_32px_rgba(0,0,0,0.45)] transition-transform duration-200 ease-out lg:relative lg:z-auto lg:h-auto lg:min-h-dvh lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--hut-border)] px-4 py-4 lg:hidden">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--hut-muted)]">
            Menu
          </span>
          <button
            type="button"
            className="touch-manipulation rounded-lg p-2 text-zinc-300 hover:bg-white/10 hover:text-white"
            aria-label="Zavřít menu"
            onClick={zavritMobilniMenu}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="border-b border-[var(--hut-border)] px-5 py-6 lg:border-b">
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

        <nav
          className="flex flex-1 flex-col gap-1 overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          aria-label="Hlavní navigace"
        >
          <Link
            href="/"
            onClick={(e) => {
              zavritMobilniMenu();
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
            onClick={zavritMobilniMenu}
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
              onClick={zavritMobilniMenu}
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
              zavritMobilniMenu();
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

        <div className="mt-auto border-t border-[var(--hut-border)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="text-[11px] leading-snug text-[var(--hut-muted)]/70">
            Tmavý režim je výchozí — ladí k rozhraní Ultimate Team.
          </p>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:min-w-0">
        <header className="flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-[var(--hut-border)] bg-[var(--hut-bg)]/95 px-3 pt-[max(0.25rem,env(safe-area-inset-top))] pb-3 backdrop-blur-md sm:gap-3 sm:px-6 sm:py-0">
          <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-3">
            <button
              type="button"
              className="touch-manipulation rounded-lg p-2.5 text-white hover:bg-white/10 lg:hidden"
              aria-expanded={mobileNavOpen}
              aria-controls="hut-nav-drawer"
              onClick={() => setMobileNavOpen(true)}
            >
              <span className="sr-only">Otevřít menu</span>
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="min-w-0 truncate text-xs text-[var(--hut-muted)] sm:text-sm">
              <span className="hidden sm:inline">Aktuální sekce: </span>
              <span className="font-medium text-white">{headerSectionLabel}</span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-sm sm:gap-2">
            {loading ? (
              <span className="text-[var(--hut-muted)]">Účet…</span>
            ) : user ? (
              <>
                <span className="hidden max-w-[200px] truncate text-[var(--hut-muted)] md:inline">
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    router.push("/login");
                    router.refresh();
                  }}
                  className="touch-manipulation rounded-lg border border-[var(--hut-border)] px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white sm:py-1.5"
                >
                  Odhlásit
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="touch-manipulation rounded-lg border border-[var(--hut-border)] px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-[var(--hut-lime)]/50 hover:text-white sm:py-1.5"
                >
                  Přihlásit
                </Link>
                <Link
                  href="/register"
                  className="touch-manipulation rounded-lg border border-[var(--hut-lime)]/40 bg-[var(--hut-lime)]/10 px-3 py-2 text-xs font-medium text-[var(--hut-lime)] transition-colors hover:bg-[var(--hut-lime)]/20 sm:py-1.5"
                >
                  Registrace
                </Link>
              </>
            )}
          </div>
        </header>

        <main
          className={`flex min-h-0 flex-1 flex-col overflow-auto px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6 md:p-10 ${mainClassName ?? ""}`}
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
