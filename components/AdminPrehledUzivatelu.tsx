"use client";

import { HutShell } from "@/components/HutShell";
import { AdminRozeslatNovinky } from "@/components/AdminRozeslatNovinky";
import { HUT_FORM_PAGE_BG } from "@/lib/hutFormBackground";
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
};

export function AdminPrehledUzivatelu({ radky, chyba }: Props) {
  const celkemKaret = radky.reduce((s, r) => s + (Number(r.pocet_karet) || 0), 0);

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
            daného uživatele. Vidíš jen ty (admin).
          </p>
        </div>

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
                  </tr>
                </thead>
                <tbody>
                  {radky.map((r) => (
                    <tr
                      key={r.user_id}
                      className="border-b border-[var(--hut-border)]/60 last:border-0 hover:bg-white/[0.03]"
                    >
                      <td className="max-w-[min(28rem,55vw)] px-4 py-2.5">
                        <span className="break-all text-white">{r.email || "—"}</span>
                        <span className="mt-0.5 block font-mono text-[10px] text-[var(--hut-muted)]">
                          {r.user_id}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-[var(--hut-muted)]">
                        {formatDatum(r.registered_at)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums text-white">
                        {r.pocet_karet}
                      </td>
                    </tr>
                  ))}
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
