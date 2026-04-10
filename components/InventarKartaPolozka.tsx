"use client";

import { useEffect, useState } from "react";
import { celeJmenoHrace, type HutCard, type XFactorZaznam } from "@/types";
import {
  kodNarodnostiPodleLabelu,
  vlajkaZeme,
  type NarodnostVolba,
} from "@/lib/narodnosti";
import { formatovatPlatVMil } from "@/lib/platMiliony";
import {
  zobrazitelnyNazevTypuKarty,
} from "@/lib/hutdbTypKaret";
import { urlLogaTymu } from "@/lib/tymLoga";
import { JmenoNaKarteFit } from "@/components/JmenoNaKarteFit";
import { TypKartyMiniLogo } from "@/components/TypKartyIkona";
import { TymLogo } from "@/components/TymLogo";
import { najdiVKataloguPodleEa } from "@/lib/xFactoryKatalog";
import {
  X_FACTOR_DEFAULT_ICON,
  iconUrlProEaJmenoAUroven,
  iconUrlProEaShodyAUroven,
} from "@/lib/xFactorIconsEa";

function MiniIkonaXF({ xf }: { xf: XFactorZaznam }) {
  const [broken, setBroken] = useState(false);
  const u = xf.xfUroven ?? "gold";
  const hit = najdiVKataloguPodleEa(xf.id, xf.label);
  const url = hit
    ? iconUrlProEaShodyAUroven(hit.eaShody, u, hit.klic)
    : (xf.imageUrl ?? iconUrlProEaJmenoAUroven(xf.label, u));

  useEffect(() => {
    setBroken(false);
  }, [url]);

  const src = broken ? X_FACTOR_DEFAULT_ICON : url;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      title={xf.label}
      referrerPolicy="no-referrer"
      className="h-8 w-8 shrink-0 object-contain drop-shadow-[0_0_8px_rgba(0,0,0,0.45)]"
      onError={() => setBroken(true)}
    />
  );
}

type Props = {
  karta: HutCard;
  narodnostiVolby: readonly NarodnostVolba[];
  onEditovat: (k: HutCard) => void;
  onSmazat: (id: string) => void;
  formZakazany: boolean;
  /** Mřížka po čtyřech na řádku (~25 % šířky kontejneru na velkém viewportu). */
  mrizkaCtvrtiny?: boolean;
};

export function InventarKartaPolozka({
  karta: k,
  narodnostiVolby,
  onEditovat,
  onSmazat,
  formZakazany,
  mrizkaCtvrtiny = false,
}: Props) {
  const kodNarKarty = kodNarodnostiPodleLabelu(k.narodnost, narodnostiVolby);

  const sirkaTridy = mrizkaCtvrtiny
    ? "w-full min-w-0 max-w-full"
    : "w-full max-w-full min-w-0 shrink-0 grow-0 basis-auto md:w-auto md:max-w-[min(20vw,17rem)]";

  return (
    <li
      className={`flex flex-col rounded-xl border border-[var(--hut-border)] bg-[var(--hut-surface-raised)] p-3 shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition-shadow hover:shadow-[0_0_0_1px_var(--hut-focus),0_16px_48px_rgba(0,0,0,0.4)] ${sirkaTridy}`}
    >
      <div className="flex min-w-0 max-w-full flex-1 flex-col gap-2">
        <div className="flex min-w-0 gap-3 overflow-hidden">
          <div className="flex shrink-0 flex-col items-center">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-b from-zinc-800 to-black text-lg font-black tabular-nums text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_16px_var(--hut-focus-glow)] ring-1 ring-white/10"
              title="OVR"
            >
              {k.ovr}
            </div>
          </div>

          <div className="min-w-0 w-full flex-1 overflow-hidden">
            <JmenoNaKarteFit text={celeJmenoHrace(k)} maxPx={18} minPx={8} />
            <p className="mt-1 text-xs text-[var(--hut-muted)]">
              <span
                className="inline font-semibold tabular-nums tracking-wide text-[var(--hut-lime)] [text-shadow:0_0_14px_color-mix(in_oklab,var(--hut-lime)_55%,transparent)]"
                title="Pozice a ruka"
              >
                {k.pozice}/{k.preferovanaRuka}
              </span>
              <span> · Plat </span>
              <span className="tabular-nums text-zinc-200">
                {formatovatPlatVMil(k.plat)}
              </span>
            </p>
          </div>
        </div>

        <div
          className="grid w-full min-w-0 grid-cols-3 items-center gap-2 py-0.5"
          aria-label={`${k.narodnost}, ${k.tym}, ${zobrazitelnyNazevTypuKarty(k.typKarty)}`}
        >
          <div className="flex min-h-[3rem] items-center justify-center">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center text-4xl leading-none"
              title={k.narodnost}
            >
              {kodNarKarty ? (
                vlajkaZeme(kodNarKarty)
              ) : (
                <span className="text-2xl text-[var(--hut-muted)]" aria-hidden>
                  —
                </span>
              )}
            </span>
          </div>
          <div className="flex min-h-[3rem] items-center justify-center" title={k.tym}>
            <TymLogo
              url={urlLogaTymu(k.tym, k.liga)}
              nazevTymu={k.tym}
              size={44}
            />
          </div>
          <div className="flex min-h-[3rem] items-center justify-center">
            <TypKartyMiniLogo ulozeno={k.typKarty} velikost="mrizka" />
          </div>
        </div>

        {k.xFactory?.length ? (
          <div
            className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5"
            role="group"
            aria-label={`X-Faktory: ${k.xFactory.map((x) => x.label).join(", ")}`}
          >
            <span className="sr-only">X-Faktory: </span>
            {k.xFactory.map((x, i) => (
              <MiniIkonaXF key={`${k.id}-xf-${i}`} xf={x} />
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 border-t border-white/[0.08] pt-3">
        <button
          type="button"
          onClick={() => onEditovat(k)}
          disabled={formZakazany}
          className="rounded-lg border border-[var(--hut-border)] bg-[var(--hut-bg-elevated)]/80 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          Editovat
        </button>
        <button
          type="button"
          onClick={() => onSmazat(k.id)}
          className="rounded-lg border border-red-500/35 bg-red-950/30 px-3 py-1.5 text-xs font-medium text-red-200 transition-colors hover:border-red-400/50 hover:bg-red-950/50"
        >
          Smazat
        </button>
      </div>
    </li>
  );
}
