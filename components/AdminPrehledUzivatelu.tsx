"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HutShell } from "@/components/HutShell";
import { AdminRozeslatNovinky } from "@/components/AdminRozeslatNovinky";
import { HUT_FORM_PAGE_BG } from "@/lib/hutFormBackground";
import { jeBonusAdmin } from "@/lib/bonusAdmin";
import type { AdminUzivatelRadek } from "@/lib/adminPrehledUzivatelu";

function formatDatum(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("cs-CZ", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

type Props = {
  radky: AdminUzivatelRadek[];
  chyba: string | null;
  currentUserId: string;
};

export function AdminPrehledUzivatelu({ radky, chyba, currentUserId }: Props) {
  const router = useRouter();
  const [mazaniId, setMazaniId] = useState<string | null>(null);
  const [radekChyba, setRadekChyba] = useState<string | null>(null);
  const celkemKaret = radky.reduce((s, r) => s + (Number(r.pocet_karet) || 0), 0);

  const smazatUcet = async (radek: AdminUzivatelRadek) => {
    if (radek.user_id === currentUserId || jeBonusAdmin(radek.email)) return;

    const label = radek.email || radek.user_id;
    if (
      !window.confirm(
        `Trvale smazat účet ${label} v Supabase?\n\n` +
          `• Karty tohoto účtu (${radek.pocet_karet}) se smažou.\n` +
          `• Sdílená DB s hut-turnaj — účet zmizí i pro turnaj.\n\n` +
          "Toto nelze vrátit.",
      )
    ) {
      return;
    }

    setRadekChyba(null);
    setMazaniId(radek.user_id);
    try {
      const res = await fetch("/api/admin/smazat-uzivatele", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: radek.user_id }),
      });
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setRadekChyba(data.error ?? `Chyba ${res.status}`);
        return;
      }
      router.refresh();
    } catch (e) {
      setRadekChyba(e instanceof Error ? e.message : "Neznámá chyba");
    } finally {
      setMazaniId(null);
    }
  };

  return (
    <HutShell
      headerSectionLabel="Přehled uživatelů"
      mainStyle={HUT_FORM_PAGE_BG}
      mainInnerClassName="relative z-0 mx-auto max-w-5xl"
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Registrovaní uživatelé
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--hut-muted)] sm:text-[15px]">
            Počty karet = řádky v tabulce <code className="font-mono text-xs text-[var(--hut-lime)]">cards</code>{" "}
            daného uživatele. Vidíš jen ty (admin). Smazání účtu maže i Auth v Supabase —{" "}
            <strong className="font-medium text-zinc-300">sdílená DB s hut-turnaj</strong>.
          </p>
        </div>

        {radekChyba ? (
          <p
            className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200"
            role="alert"
          >
            {radekChyba}
          </p>
        ) : null}

        {chyba ? (
          <p
            className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200"
            role="alert"
          >
            {chyba}
          </p>
        ) : null}

        {!chyba && radky.length === 0 ? (
          <p className="text-sm text-[var(--hut-muted)]">Žádní uživatelé.</p>
        ) : null}

        {!chyba && radky.length > 0 ? (
          <>
            <p className="text-sm tabular-nums text-[var(--hut-muted)]">
              Uživatelů: <span className="font-medium text-white">{radky.length}</span>
              {" · "}
              Karet celkem v DB: <span className="font-medium text-white">{celkemKaret}</span>
            </p>
            <div className="overflow-x-auto rounded-xl border border-[var(--hut-border)] bg-[var(--hut-surface)]/52 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
              <table className="min-w-[32rem] w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]/50">
                    <th scope="col" className="px-4 py-3 font-semibold text-zinc-200">
                      E-mail
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold text-zinc-200">
                      Registrace
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold tabular-nums text-zinc-200">
                      Počet karet
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold text-zinc-200">
                      Akce
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {radky.map((r) => {
                    const lzeSmazat =
                      r.user_id !== currentUserId && !jeBonusAdmin(r.email);
                    return (
                    <tr
                      key={r.user_id}
                      className="border-b border-[var(--hut-border)]/60 last:border-0 hover:bg-white/[0.03]"
                    >
                      <td className="max-w-[min(28rem,55vw)] px-4 py-2.5">
                        <span className="break-all text-white">{r.email || "—"}</span>
                        <span className="mt-0.5 block font-mono text-[10px] text-[var(--hut-muted)]">
                          {r.user_id}
                        </span>
                        {jeBonusAdmin(r.email) ? (
                          <span className="mt-1 inline-block rounded bg-amber-950/50 px-2 py-0.5 text-[10px] text-amber-100 ring-1 ring-amber-700/40">
                            Admin
                          </span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-[var(--hut-muted)]">
                        {formatDatum(r.registered_at)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums text-white">
                        {r.pocet_karet}
                      </td>
                      <td className="px-4 py-2.5">
                        {lzeSmazat ? (
                          <button
                            type="button"
                            disabled={mazaniId === r.user_id}
                            onClick={() => void smazatUcet(r)}
                            className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-950/60 disabled:opacity-50"
                          >
                            {mazaniId === r.user_id ? "Mažu…" : "Smazat účet"}
                          </button>
                        ) : (
                          <span className="text-xs text-[var(--hut-muted)]">—</span>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {!chyba ? <AdminRozeslatNovinky pocetAdresatu={radky.length} /> : null}
      </div>
    </HutShell>
  );
}
